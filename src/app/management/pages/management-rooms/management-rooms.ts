import { Component, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subscription, debounceTime, finalize, merge, takeUntil } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzDrawerService } from 'ng-zorro-antd/drawer';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { BaseListComponent } from '../../../components/base-list.component';
import { ShareTableComponent } from '../../../components/share-table/share-table.component';
import { SettingTableComponent } from '../../../components/setting-table/setting-table.component';
import { TableColumn } from '../../../components/share-table/share-table.interface';
import { ApiResponse, apiResponseSucceeded } from '../../../models/api-response.model';
import { ManagementRoomsService } from '../../services/management-rooms.service';
import {
  RoomDeleteResponse,
  RoomResponse,
  RoomSpecialtyOption,
  RoomStatus
} from '../../models/room.model';
import { ROOM_STATUSES, RoomSearchRequest } from '../../models/room.model';
import { roomAvailabilityError, roomLocalTime, roomLocalToday } from '../../../utils/room/room-availability.utils';
import { roomErrorMessage } from '../../../utils/room/room-error.utils';
import { ManagementRoomForm } from './management-room-form/management-room-form';

@Component({
  selector: 'app-management-rooms',
  imports: [ReactiveFormsModule, FormsModule, NzButtonModule, NzIconModule, NzInputModule, NzSelectModule, NzTagModule,
    NzTooltipModule, ShareTableComponent, SettingTableComponent],
  templateUrl: './management-rooms.html',
  styleUrl: './management-rooms.css'
})
export class ManagementRooms extends BaseListComponent<RoomResponse> {
  private readonly api = inject(ManagementRoomsService);
  private readonly drawer = inject(NzDrawerService);
  private readonly modals = inject(NzModalService);
  private readonly notification = inject(NzNotificationService);
  private request?: Subscription;
  private modal?: NzModalRef;
  protected readonly statuses = ROOM_STATUSES;
  protected readonly mode = signal<'catalog' | 'availability'>('catalog');
  protected readonly targetStatus = signal<RoomStatus>('AVAILABLE');
  protected readonly appliedAvailability = signal<{ workDate: string; startTime: string; endTime: string } | null>(null);
  protected get today(): string { return roomLocalToday(); }
  protected get filterSpecialties(): RoomSpecialtyOption[] {
    return this.mode() === 'availability' ? this.specialties().filter(item => item.status === 'ACTIVE') : this.specialties();
  }
  protected statusInfo(status: RoomStatus) { return this.statuses.find(item => item.value === status); }
  protected readonly specialties = signal<RoomSpecialtyOption[]>([]);
  protected readonly specialtyError = signal('');
  protected readonly isLoadingSpecialties = signal(false);
  protected readonly listError = signal('');
  protected readonly actionError = signal('');
  protected readonly isActing = signal(false);
  protected readonly pendingAction = signal<{
    kind: 'status' | 'delete';
    item: RoomResponse;
    status?: RoomStatus
  } | null>(null);
  private readonly confirmContent = viewChild<TemplateRef<unknown>>('confirmContent');
  protected override tableColumns: TableColumn[] = [
    {
      title: 'Mã phòng khám',
      key: 'code',
      width: 160,
      minWidth: 160,
      align: 'left',
      visible: true,
      fixed: 'left',
      render: 'text',
      allowCopy: true
    },
    { title: 'Tên phòng khám', key: 'name', width: 220, minWidth: 180, align: 'left', visible: true, render: 'text' },
    {
      title: 'Chuyên khoa',
      key: 'specialtyName',
      width: 180,
      minWidth: 160,
      align: 'left',
      visible: true,
      render: 'custom'
    },
    { title: 'Vị trí', key: 'location', width: 160, minWidth: 150, align: 'left', visible: true, render: 'text' },
    { title: 'Trạng thái', key: 'status', width: 160, minWidth: 140, align: 'center', visible: true, render: 'custom' },
    {
      title: 'Chức năng',
      key: 'actions',
      width: 180,
      minWidth: 160,
      align: 'center',
      visible: true,
      fixed: 'right',
      render: 'actions'
    }
  ];

  constructor() {
    super();
    this.pageSize = 10;
    this.searchForm = this.fb.group({ keyword: [''], specialtyScope: [null], status: [null], workDate: [roomLocalToday()], startTime: [''], endTime: [''] });
  }

  protected get canWrite(): boolean {
    return this.hasRole('ADMIN') || this.hasRole('SUPER_ADMIN');
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadSpecialties();
  }

  protected override listenSearchFormChange(): void {
    super.listenSearchFormChange();
    merge(this.searchForm.controls['specialtyScope'].valueChanges, this.searchForm.controls['status'].valueChanges)
      .pipe(debounceTime(0), takeUntil(this.unsubscribe)).subscribe(() => this.onBtnSearch());
  }

  override ngOnDestroy(): void {
    this.modal?.destroy();
    super.ngOnDestroy();
  }

  protected loadSpecialties(): void {
    if (this.isLoadingSpecialties()) return;
    this.isLoadingSpecialties.set(true);
    this.specialtyError.set('');
    this.api.specialties().pipe(takeUntil(this.unsubscribe), finalize(() => this.isLoadingSpecialties.set(false)))
      .subscribe({
        next: res => {
          if (apiResponseSucceeded(res) && Array.isArray(res.result)) this.specialties.set(res.result);
          else this.specialtyError.set(roomErrorMessage(res, 'Không thể tải bộ lọc chuyên khoa. Vui lòng thử lại.'));
        },
        error: error => this.specialtyError.set(roomErrorMessage(error, 'Không thể tải bộ lọc chuyên khoa. Vui lòng thử lại.'))
      });
  }

  override loadData(): void {
    this.request?.unsubscribe();
    this.appliedAvailability.set(null);
    const value = this.searchForm.getRawValue();
    if (this.mode() === 'availability') {
      const error = roomAvailabilityError(value.workDate, value.startTime, value.endTime);
      if (error) {
        this.dataSource = []; this.total = 0; this.isLoadingDataSource.set(false); this.listError.set(error); return;
      }
    }
    this.isLoadingDataSource.set(true);
    this.listError.set('');
    // Spring expects sort=id,asc, unlike the legacy dotted sort in BaseListComponent.
    const sort = this.sorts.length ? `${this.sorts[0].sortField},${this.sorts[0].sortOrder}` : 'id,asc';
    const params = { page: this.currentPage - 1, size: this.pageSize, sort };
    const filters = { keyword: value.keyword?.trim() || null,
      specialtyId: value.specialtyScope === 0 ? null : value.specialtyScope ?? null, sharedOnly: value.specialtyScope === 0 };
    const period = { workDate: value.workDate, startTime: roomLocalTime(value.startTime)!, endTime: roomLocalTime(value.endTime)! };
    const request = this.mode() === 'availability' ? this.api.availability(params, { ...filters, ...period })
      : this.api.search(params, { ...filters, status: value.status ?? null } as RoomSearchRequest);
    const availability = this.mode() === 'availability';
    this.request = request.pipe(takeUntil(this.unsubscribe), finalize(() => this.isLoadingDataSource.set(false))).subscribe({
      next: res => {
        if (apiResponseSucceeded(res) && Array.isArray(res.result?.content)) {
          this.dataSource = res.result!.content;
          this.total = res.result!.totalElements;
          if (availability) this.appliedAvailability.set(period);
        } else {
          this.dataSource = [];
          this.total = 0;
          this.listError.set(roomErrorMessage(res, 'Không thể tải danh sách phòng khám. Vui lòng thử lại.'));
        }
      }, error: error => {
        this.dataSource = [];
        this.total = 0;
        this.listError.set(roomErrorMessage(error, 'Không thể tải danh sách phòng khám. Vui lòng thử lại.'));
      }
    });
  }

  protected setSearchMode(mode: 'catalog' | 'availability'): void {
    if (this.mode() === mode) return;
    this.mode.set(mode); this.currentPage = 1;
    if (mode === 'availability') {
      this.searchForm.controls['status'].setValue(null, { emitEvent: false });
      this.searchForm.controls['status'].disable({ emitEvent: false });
      const selected = this.searchForm.value.specialtyScope;
      if (selected && !this.filterSpecialties.some(item => item.id === selected)) this.searchForm.controls['specialtyScope'].setValue(null, { emitEvent: false });
    } else this.searchForm.controls['status'].enable({ emitEvent: false });
    this.loadData();
  }

  protected onOpenDetail(id?: number, isViewMode = false): void {
    if ((!isViewMode && !this.canWrite) || this.pendingAction()) return;
    this.drawer.create({
      nzTitle: id ? (isViewMode ? 'Chi tiết phòng khám' : 'Cập nhật phòng khám') : 'Thêm mới phòng khám',
      nzContent: ManagementRoomForm, nzData: { id, isViewMode }, nzWidth: 'min(1100px, 100vw)',
      nzMaskClosable: false, nzClosable: isViewMode, nzKeyboard: isViewMode,
      nzBodyStyle: { padding: '24px', background: '#f8fafc', overflow: 'auto' }
    }).afterClose.pipe(takeUntil(this.unsubscribe)).subscribe(result => {
      if (result?.success) this.loadData();
    });
  }

  protected onAction(item: RoomResponse, kind: 'status' | 'delete'): void {
    if (!this.canWrite || this.pendingAction()) return;
    const status: RoomStatus = item.status;
    this.targetStatus.set(status);
    this.pendingAction.set({ item, kind, status });
    this.actionError.set('');
    this.modal = this.modals.confirm({
      nzTitle: kind === 'delete' ? 'Xóa phòng khám' : 'Đổi trạng thái phòng khám',
      nzContent: this.confirmContent(),
      nzOkText: 'Xác nhận',
      nzCancelText: 'Hủy',
      nzOkDanger: kind === 'delete',
      nzMaskClosable: false,
      nzKeyboard: false,
      nzClosable: false,
      nzOnOk: () => this.commitAction()
    });
    this.modal.afterClose.pipe(takeUntil(this.unsubscribe)).subscribe(() => {
      this.pendingAction.set(null);
      this.actionError.set('');
      this.modal = undefined;
    });
  }

  private commitAction(): Promise<boolean> {
    const pending = this.pendingAction();
    const action = pending ? { ...pending, status: this.targetStatus() } : null;
    if (!action || !this.canWrite || this.isActing()) return Promise.resolve(false);
    if (action.kind === 'status' && (action.status === action.item.status || !this.statuses.some(item => item.value === action.status))) {
      this.actionError.set('Vui lòng chọn trạng thái mới hợp lệ.'); return Promise.resolve(false);
    }
    this.isActing.set(true);
    this.actionError.set('');
    this.modal?.updateConfig({ nzCancelDisabled: true });
    const request: Observable<ApiResponse<RoomResponse | RoomDeleteResponse>> = action.kind === 'delete'
      ? this.api.delete(action.item.id) : this.api.status(action.item.id, action.status!);
    return new Promise(resolve => request.pipe(takeUntil(this.unsubscribe), finalize(() => {
      this.isActing.set(false);
      this.modal?.updateConfig({ nzCancelDisabled: false });
    })).subscribe({
      next: res => {
        const result = res.result;
        const validResult = action.kind === 'delete'
          ? result && 'action' in result && (result.action === 'DELETED' || result.action === 'DEACTIVATED')
          : result && 'code' in result && result.status === action.status;
        if (apiResponseSucceeded(res) && result?.id === action.item.id && validResult) {
          const message = 'action' in result ? result.message || (result.action === 'DELETED' ? 'Đã xóa phòng khám.' : 'Phòng khám đã ngừng hoạt động; giữ nguyên lịch sử.')
            : `Đã chuyển phòng sang trạng thái ${this.statusInfo(action.status)?.label ?? action.status}.`;
          this.notification.success('Thành công', message);
          if (action.kind === 'delete' && 'action' in result && result.action === 'DELETED' && this.dataSource.length === 1 && this.currentPage > 1) this.currentPage--;
          this.loadData();
          resolve(true);
        } else {
          this.actionError.set(roomErrorMessage(res, 'Chưa xác định được kết quả. Vui lòng tải lại danh sách trước khi thử lại.'));
          resolve(false);
        }
      }, error: error => {
        this.actionError.set(roomErrorMessage(error, 'Chưa xác định được kết quả. Vui lòng tải lại danh sách trước khi thử lại.'));
        resolve(false);
      },
      complete: () => resolve(false)
    }));
  }
}

