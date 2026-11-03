import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Subscription, debounceTime, finalize, merge, takeUntil } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzDrawerService } from 'ng-zorro-antd/drawer';
import { BaseListComponent } from '../../../components/base-list.component';
import { ShareTableComponent } from '../../../components/share-table/share-table.component';
import { SettingTableComponent } from '../../../components/setting-table/setting-table.component';
import { TableColumn } from '../../../components/share-table/share-table.interface';
import { apiResponseSucceeded } from '../../../models/api-response.model';
import { AdminDoctorService } from '../../services/admin-doctor.service';
import { AdminDoctor, DoctorSpecialtyOption } from '../../models/admin-doctor.model';
import { doctorErrorMessage } from '../../../utils/doctor/doctor-error.utils';
import { userIsAdmin } from '../management-users/user-policy';
import { doctorCanChangeAccountStatus, doctorCanEdit } from './doctor-policy';
import { DoctorForm } from './doctor-form/doctor-form';
import { DoctorActivity } from './doctor-activity/doctor-activity';
import { DoctorAction } from './doctor-action/doctor-action';
import { UserEditor } from '../management-users/user-editor/user-editor';

@Component({
  selector: 'app-management-doctors',
  imports: [ReactiveFormsModule, NzButtonModule, NzIconModule, NzInputModule, NzSelectModule, NzTagModule, NzTooltipModule, ShareTableComponent, SettingTableComponent],
  templateUrl: './management-doctors.html', styleUrl: './management-doctors.css'
})
export class ManagementDoctors extends BaseListComponent<AdminDoctor> {
  private readonly api = inject(AdminDoctorService);
  private readonly drawer = inject(NzDrawerService);
  private request?: Subscription;
  protected readonly listError = signal('');
  protected readonly drawerOpen = signal(false);
  protected readonly specialties = signal<DoctorSpecialtyOption[]>([]);
  protected readonly specialtyError = signal('');
  protected readonly specialtyLoading = signal(false);

  protected get isAdmin(): boolean {
    return userIsAdmin(this.currentUser());
  }

  protected canEdit(item: AdminDoctor): boolean {
    return doctorCanEdit(this.currentUser(), item);
  }

  protected canChangeAccount(item: AdminDoctor): boolean {
    return doctorCanChangeAccountStatus(this.currentUser(), item);
  }

  protected canAct(item: AdminDoctor, mode: 'status' | 'deactivate'): boolean {
    return this.isAdmin && !!(mode === 'status' ? item.capabilities?.canChangeStatus : item.capabilities?.canDeactivateProfile);
  }

  protected override tableColumns: TableColumn[] = [
    {
      title: 'Mã bác sĩ',
      key: 'doctorCode',
      width: 210,
      minWidth: 180,
      align: 'left',
      visible: true,
      fixed: 'left',
      render: 'text',
      allowCopy: true
    },
    { title: 'Họ và tên', key: 'fullName', width: 200, minWidth: 160, align: 'left', visible: true, render: 'text' },
    {
      title: 'Chuyên khoa',
      key: 'specialtyName',
      width: 190,
      minWidth: 150,
      align: 'left',
      visible: true,
      render: 'text'
    },
    { title: 'Chức danh', key: 'position', width: 200, minWidth: 150, align: 'left', visible: true, render: 'text' },
    {
      title: 'Kinh nghiệm (năm)',
      key: 'experienceYears',
      width: 150,
      minWidth: 130,
      align: 'center',
      visible: true,
      render: 'text'
    },
    { title: 'Điện thoại', key: 'phone', width: 150, minWidth: 120, align: 'left', visible: true, render: 'text' },
    { title: 'Email', key: 'email', width: 220, minWidth: 180, align: 'left', visible: true, render: 'text' },
    {
      title: 'Hồ sơ bác sĩ',
      key: 'status',
      width: 160,
      minWidth: 140,
      align: 'center',
      visible: true,
      render: 'custom'
    },
    {
      title: 'Tài khoản',
      key: 'userStatus',
      width: 160,
      minWidth: 140,
      align: 'center',
      visible: true,
      render: 'custom'
    },
    {
      title: 'Chức năng',
      key: 'actions',
      width: 240,
      minWidth: 220,
      align: 'center',
      visible: true,
      fixed: 'right',
      render: 'actions'
    }
  ];

  constructor() {
    super();
    this.searchForm = this.fb.group({ keyword: [''], specialtyId: [null], status: [null], userStatus: [null] });
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadSpecialties();
  }

  protected override listenSearchFormChange(): void {
    super.listenSearchFormChange();
    merge(...['specialtyId', 'status', 'userStatus'].map(key => this.searchForm.controls[key].valueChanges))
      .pipe(debounceTime(0), takeUntil(this.unsubscribe)).subscribe(() => this.onBtnSearch());
  }

  protected loadSpecialties(): void {
    if (this.specialtyLoading()) return;
    this.specialtyLoading.set(true);
    this.specialtyError.set('');
    this.api.specialties().pipe(takeUntil(this.unsubscribe), finalize(() => this.specialtyLoading.set(false))).subscribe({
      next: res => {
        if (apiResponseSucceeded(res) && Array.isArray(res.result)) this.specialties.set(res.result);
        else this.specialtyError.set(doctorErrorMessage(res, 'Không thể tải bộ lọc chuyên khoa.'));
      }, error: error => this.specialtyError.set(doctorErrorMessage(error, 'Không thể tải bộ lọc chuyên khoa.'))
    });
  }

  override loadData(): void {
    this.request?.unsubscribe();
    this.listError.set('');
    const value = this.searchForm.getRawValue();
    if (value.specialtyId != null && (!Number.isSafeInteger(value.specialtyId) || value.specialtyId <= 0)) {
      this.listError.set('Chuyên khoa không hợp lệ.');
      this.dataSource = [];
      this.total = 0;
      this.isLoadingDataSource.set(false);
      return;
    }
    this.isLoadingDataSource.set(true);
    this.request = this.api.search({ page: this.currentPage - 1, size: this.pageSize, sort: 'id,asc' }, {
      keyword: value.keyword?.trim() || null, specialtyId: value.specialtyId ?? null,
      status: value.status ?? null, userStatus: value.userStatus ?? null
    }).pipe(takeUntil(this.unsubscribe), finalize(() => this.isLoadingDataSource.set(false))).subscribe({
      next: res => {
        if (apiResponseSucceeded(res) && Array.isArray(res.result?.content)) {
          this.dataSource = res.result!.content;
          this.total = res.result!.totalElements;
        } else {
          this.dataSource = [];
          this.total = 0;
          this.listError.set(doctorErrorMessage(res, 'Không thể tải danh sách bác sĩ.'));
        }
      }, error: error => {
        this.dataSource = [];
        this.total = 0;
        this.listError.set(doctorErrorMessage(error, 'Không thể tải danh sách bác sĩ.'));
      }
    });
  }

  protected openForm(item?: AdminDoctor, isViewMode = false): void {
    if (!this.isAdmin || this.drawerOpen() || item && !isViewMode && !this.canEdit(item)) return;
    this.drawerOpen.set(true);
    this.drawer.create({
      nzTitle: item ? (isViewMode ? 'Chi tiết hồ sơ bác sĩ' : 'Cập nhật hồ sơ bác sĩ') : 'Tạo hồ sơ bác sĩ',
      nzContent: DoctorForm, nzData: { id: item?.id, isViewMode }, nzWidth: 'min(1100px, 100vw)',
      nzMaskClosable: false, nzClosable: isViewMode, nzKeyboard: isViewMode,
      nzBodyStyle: { padding: '24px', background: '#f8fafc', overflow: 'auto' }
    }).afterClose.pipe(takeUntil(this.unsubscribe)).subscribe(result => {
      this.drawerOpen.set(false);
      if (result?.success && !result.sessionEnded) {
        this.loadData();
        if (result.userId === this.currentUser()?.id) this.managementAccess.load(true).pipe(takeUntil(this.unsubscribe)).subscribe({
          error: () => {
          }
        });
      }
    });
  }

  protected openAction(item: AdminDoctor, mode: 'status' | 'deactivate'): void {
    if (this.drawerOpen() || !this.canAct(item, mode)) return;
    this.drawerOpen.set(true);
    this.drawer.create({
      nzTitle: mode === 'status' ? 'Trạng thái hồ sơ bác sĩ' : 'Vô hiệu hóa hồ sơ bác sĩ',
      nzContent: DoctorAction,
      nzData: { id: item.id, mode },
      nzWidth: 'min(640px, 100vw)',
      nzMaskClosable: false,
      nzClosable: false,
      nzKeyboard: false
    }).afterClose.pipe(takeUntil(this.unsubscribe)).subscribe(result => {
      this.drawerOpen.set(false);
      if (result?.success) this.loadData();
    });
  }

  protected openActivity(item: AdminDoctor, mode: 'audit' | 'appointments' | 'schedules'): void {
    if (!this.isAdmin || this.drawerOpen()) return;
    this.drawerOpen.set(true);
    this.drawer.create({
      nzTitle: mode === 'audit' ? 'Nhật ký hồ sơ bác sĩ' : mode === 'schedules' ? 'Ca làm việc của bác sĩ' : 'Lịch hẹn của bác sĩ',
      nzContent: DoctorActivity,
      nzData: { id: item.id, doctorCode: item.doctorCode, mode },
      nzWidth: 'min(1100px, 100vw)',
      nzMaskClosable: false
    }).afterClose.pipe(takeUntil(this.unsubscribe)).subscribe(() => this.drawerOpen.set(false));
  }

  protected openAccount(item: AdminDoctor, mode: 'view' | 'status'): void {
    if (!this.isAdmin || this.drawerOpen() || mode === 'status' && !this.canChangeAccount(item)) return;
    this.drawerOpen.set(true);
    this.drawer.create({
      nzTitle: mode === 'view' ? 'Tài khoản liên kết' : 'Khóa / mở tài khoản liên kết', nzContent: UserEditor,
      nzData: { id: item.userId, mode, context: 'doctor' }, nzWidth: 'min(1100px, 100vw)', nzMaskClosable: false,
      nzClosable: mode === 'view', nzKeyboard: mode === 'view', nzBodyStyle: { padding: '24px', background: '#f8fafc' }
    }).afterClose.pipe(takeUntil(this.unsubscribe)).subscribe(result => {
      this.drawerOpen.set(false);
      if (result?.success && !result.sessionEnded) this.loadData();
    });
  }
}
