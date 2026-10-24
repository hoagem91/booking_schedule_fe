import { Component, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
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
import { ManagementServicesService } from '../../services/management-services.service';
import {
  ServiceDeleteResponse,
  ServiceResponse,
  ServiceSpecialtyOption,
  ServiceStatus
} from '../../models/service.model';
import { serviceErrorMessage } from '../../../utils/service/service-error.utils';
import { ManagementServiceForm } from './management-service-form/management-service-form';

@Component({
  selector: 'app-management-services',
  imports: [ReactiveFormsModule, DecimalPipe, NzButtonModule, NzIconModule, NzInputModule, NzSelectModule, NzTagModule,
    NzTooltipModule, ShareTableComponent, SettingTableComponent],
  templateUrl: './management-services.html',
  styleUrl: './management-services.css'
})
export class ManagementServices extends BaseListComponent<ServiceResponse> {
  private readonly api = inject(ManagementServicesService);
  private readonly drawer = inject(NzDrawerService);
  private readonly modals = inject(NzModalService);
  private readonly notification = inject(NzNotificationService);
  private request?: Subscription;
  private modal?: NzModalRef;
  protected readonly specialties = signal<ServiceSpecialtyOption[]>([]);
  protected readonly specialtyError = signal('');
  protected readonly isLoadingSpecialties = signal(false);
  protected readonly listError = signal('');
  protected readonly actionError = signal('');
  protected readonly isActing = signal(false);
  protected readonly pendingAction = signal<{
    kind: 'status' | 'delete';
    item: ServiceResponse;
    status?: ServiceStatus
  } | null>(null);
  private readonly confirmContent = viewChild<TemplateRef<unknown>>('confirmContent');
  protected override tableColumns: TableColumn[] = [
    {
      title: 'Mã dịch vụ',
      key: 'code',
      width: 180,
      minWidth: 160,
      align: 'left',
      visible: true,
      fixed: 'left',
      render: 'text',
      allowCopy: true
    },
    { title: 'Tên dịch vụ', key: 'name', width: 230, minWidth: 180, align: 'left', visible: true, render: 'text' },
    {
      title: 'Chuyên khoa',
      key: 'specialtyName',
      width: 200,
      minWidth: 160,
      align: 'left',
      visible: true,
      render: 'custom'
    },
    { title: 'Giá (VNĐ)', key: 'price', width: 160, minWidth: 140, align: 'right', visible: true, render: 'custom' },
    {
      title: 'Thời lượng',
      key: 'durationMinutes',
      width: 120,
      minWidth: 110,
      align: 'center',
      visible: true,
      render: 'custom'
    },
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
    this.searchForm = this.fb.group({ keyword: [''], specialtyId: [null], status: [null] });
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
    merge(this.searchForm.controls['specialtyId'].valueChanges, this.searchForm.controls['status'].valueChanges)
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
          else this.specialtyError.set(serviceErrorMessage(res, 'Không thể tải bộ lọc chuyên khoa. Vui lòng thử lại.'));
        },
        error: error => this.specialtyError.set(serviceErrorMessage(error, 'Không thể tải bộ lọc chuyên khoa. Vui lòng thử lại.'))
      });
  }

  override loadData(): void {
    this.request?.unsubscribe();
    this.isLoadingDataSource.set(true);
    this.listError.set('');
    // Spring expects sort=id,asc, unlike the legacy dotted sort in BaseListComponent.
    const sort = this.sorts.length ? `${this.sorts[0].sortField},${this.sorts[0].sortOrder}` : 'id,asc';
    this.request = this.api.search({ page: this.currentPage - 1, size: this.pageSize, sort }, {
      keyword: this.searchForm.value.keyword?.trim() || null,
      specialtyId: this.searchForm.value.specialtyId ?? null, status: this.searchForm.value.status ?? null
    }).pipe(takeUntil(this.unsubscribe), finalize(() => this.isLoadingDataSource.set(false))).subscribe({
      next: res => {
        if (apiResponseSucceeded(res) && Array.isArray(res.result?.content)) {
          this.dataSource = res.result!.content;
          this.total = res.result!.totalElements;
        } else {
          this.dataSource = [];
          this.total = 0;
          this.listError.set(serviceErrorMessage(res, 'Không thể tải danh sách dịch vụ. Vui lòng thử lại.'));
        }
      }, error: error => {
        this.dataSource = [];
        this.total = 0;
        this.listError.set(serviceErrorMessage(error, 'Không thể tải danh sách dịch vụ. Vui lòng thử lại.'));
      }
    });
  }

  protected onOpenDetail(id?: number, isViewMode = false): void {
    if ((!isViewMode && !this.canWrite) || this.pendingAction()) return;
    this.drawer.create({
      nzTitle: id ? (isViewMode ? 'Chi tiết dịch vụ' : 'Cập nhật dịch vụ') : 'Thêm mới dịch vụ',
      nzContent: ManagementServiceForm, nzData: { id, isViewMode }, nzWidth: 'min(1100px, 100vw)',
      nzMaskClosable: false, nzClosable: isViewMode, nzKeyboard: isViewMode,
      nzBodyStyle: { padding: '24px', background: '#f8fafc', overflow: 'auto' }
    }).afterClose.pipe(takeUntil(this.unsubscribe)).subscribe(result => {
      if (result?.success) this.loadData();
    });
  }

  protected onAction(item: ServiceResponse, kind: 'status' | 'delete'): void {
    if (!this.canWrite || this.pendingAction()) return;
    const status: ServiceStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.pendingAction.set({ item, kind, status });
    this.actionError.set('');
    this.modal = this.modals.confirm({
      nzTitle: kind === 'delete' ? 'Xóa dịch vụ' : (status === 'ACTIVE' ? 'Bật dịch vụ' : 'Ngừng hoạt động dịch vụ'),
      nzContent: this.confirmContent(),
      nzOkText: 'Xác nhận',
      nzCancelText: 'Hủy',
      nzOkDanger: kind === 'delete' || status === 'INACTIVE',
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
    const action = this.pendingAction();
    if (!action || !this.canWrite || this.isActing()) return Promise.resolve(false);
    this.isActing.set(true);
    this.actionError.set('');
    this.modal?.updateConfig({ nzCancelDisabled: true });
    const request: Observable<ApiResponse<ServiceResponse | ServiceDeleteResponse>> = action.kind === 'delete'
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
          const message = 'action' in result ? result.message || (result.action === 'DELETED' ? 'Đã xóa dịch vụ.' : 'Dịch vụ đã ngừng hoạt động; giữ nguyên lịch sử.')
            : (action.status === 'ACTIVE' ? 'Đã bật dịch vụ.' : 'Dịch vụ đã ngừng hoạt động.');
          this.notification.success('Thành công', message);
          if (action.kind === 'delete' && 'action' in result && result.action === 'DELETED' && this.dataSource.length === 1 && this.currentPage > 1) this.currentPage--;
          this.loadData();
          resolve(true);
        } else {
          this.actionError.set(serviceErrorMessage(res, 'Chưa xác định được kết quả. Vui lòng tải lại danh sách trước khi thử lại.'));
          resolve(false);
        }
      }, error: error => {
        this.actionError.set(serviceErrorMessage(error, 'Chưa xác định được kết quả. Vui lòng tải lại danh sách trước khi thử lại.'));
        resolve(false);
      },
      complete: () => resolve(false)
    }));
  }
}
