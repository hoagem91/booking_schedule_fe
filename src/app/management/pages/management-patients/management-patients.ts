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
import { AdminPatientService } from '../../services/admin-patient.service';
import { AdminPatient, PATIENT_GENDERS } from '../../models/admin-patient.model';
import { patientErrorMessage } from '../../../utils/patient/patient-error.utils';
import { userIsAdmin } from '../management-users/user-policy';
import { patientBirthRangeError, patientCanChangeAccountStatus, patientCanEdit } from './patient-policy';
import { clinicToday } from '../../services/management-appointments.service';
import { PatientForm } from './patient-form/patient-form';
import { PatientActivity } from './patient-activity/patient-activity';
import { UserEditor } from '../management-users/user-editor/user-editor';

@Component({
  selector: 'app-management-patients',
  imports: [ReactiveFormsModule, NzButtonModule, NzIconModule, NzInputModule, NzSelectModule, NzTagModule, NzTooltipModule, ShareTableComponent, SettingTableComponent],
  templateUrl: './management-patients.html', styleUrl: './management-patients.css',
})
export class ManagementPatients extends BaseListComponent<AdminPatient> {
  private readonly api = inject(AdminPatientService);
  private readonly drawer = inject(NzDrawerService);
  private request?: Subscription;
  protected readonly listError = signal('');
  protected readonly drawerOpen = signal(false);
  protected readonly genders = PATIENT_GENDERS;
  protected get today(): string { return clinicToday(); }
  protected get isAdmin(): boolean { return userIsAdmin(this.currentUser()); }
  protected genderLabel(value: string | null): string { return this.genders.find(item => item.value === value)?.label ?? 'Chưa cập nhật'; }
  protected canEdit(patient: AdminPatient): boolean { return patientCanEdit(this.currentUser(), patient); }
  protected canChangeAccount(patient: AdminPatient): boolean { return patientCanChangeAccountStatus(this.currentUser(), patient); }
  protected override tableColumns: TableColumn[] = [
    { title: 'Mã bệnh nhân', key: 'patientCode', width: 200, minWidth: 160, align: 'left', visible: true, fixed: 'left', render: 'text', allowCopy: true },
    { title: 'Họ và tên', key: 'fullName', width: 200, minWidth: 160, align: 'left', visible: true, render: 'text' },
    { title: 'Ngày sinh', key: 'dateOfBirth', width: 140, minWidth: 120, align: 'center', visible: true, render: 'text', pipeName: 'dateDisplay' },
    { title: 'Giới tính', key: 'gender', width: 100, minWidth: 90, align: 'center', visible: true, render: 'custom' },
    { title: 'Điện thoại', key: 'phone', width: 150, minWidth: 120, align: 'left', visible: true, render: 'text' },
    { title: 'Email', key: 'email', width: 220, minWidth: 180, align: 'left', visible: true, render: 'text' },
    { title: 'Tài khoản', key: 'userStatus', width: 160, minWidth: 140, align: 'center', visible: true, render: 'custom' },
    { title: 'Chức năng', key: 'actions', width: 210, minWidth: 200, align: 'center', visible: true, fixed: 'right', render: 'actions' },
  ];
  constructor() { super(); this.searchForm = this.fb.group({ keyword: [''], gender: [null], userStatus: [null], dateOfBirthFrom: [''], dateOfBirthTo: [''] }); }
  protected override listenSearchFormChange(): void {
    super.listenSearchFormChange();
    merge(this.searchForm.controls['gender'].valueChanges, this.searchForm.controls['userStatus'].valueChanges)
      .pipe(debounceTime(0), takeUntil(this.unsubscribe)).subscribe(() => this.onBtnSearch());
  }
  override loadData(): void {
    this.request?.unsubscribe(); this.listError.set('');
    const value = this.searchForm.getRawValue();
    const error = patientBirthRangeError(value.dateOfBirthFrom, value.dateOfBirthTo);
    if (error) { this.listError.set(error); this.dataSource = []; this.total = 0; this.isLoadingDataSource.set(false); return; }
    this.isLoadingDataSource.set(true);
    this.request = this.api.search({ page: this.currentPage - 1, size: this.pageSize, sort: 'id,asc' }, {
      keyword: value.keyword?.trim() || null, gender: value.gender ?? null, userStatus: value.userStatus ?? null,
      dateOfBirthFrom: value.dateOfBirthFrom || null, dateOfBirthTo: value.dateOfBirthTo || null,
    }).pipe(takeUntil(this.unsubscribe), finalize(() => this.isLoadingDataSource.set(false))).subscribe({ next: res => {
      if (apiResponseSucceeded(res) && Array.isArray(res.result?.content)) { this.dataSource = res.result!.content; this.total = res.result!.totalElements; }
      else { this.dataSource = []; this.total = 0; this.listError.set(patientErrorMessage(res, 'Không thể tải danh sách bệnh nhân. Vui lòng thử lại.')); }
    }, error: error => { this.dataSource = []; this.total = 0; this.listError.set(patientErrorMessage(error, 'Không thể tải danh sách bệnh nhân.')); } });
  }
  protected openForm(patient?: AdminPatient, isViewMode = false): void {
    if (!this.isAdmin || this.drawerOpen() || patient && !isViewMode && !this.canEdit(patient)) return;
    this.drawerOpen.set(true);
    this.drawer.create({ nzTitle: patient ? (isViewMode ? 'Chi tiết hồ sơ bệnh nhân' : 'Cập nhật hồ sơ bệnh nhân') : 'Tạo hồ sơ bệnh nhân',
      nzContent: PatientForm, nzData: { id: patient?.id, isViewMode }, nzWidth: 'min(1100px, 100vw)',
      nzMaskClosable: false, nzClosable: isViewMode, nzKeyboard: isViewMode, nzBodyStyle: { padding: '24px', background: '#f8fafc', overflow: 'auto' },
    }).afterClose.pipe(takeUntil(this.unsubscribe)).subscribe(result => {
      this.drawerOpen.set(false);
      if (result?.success && !result.sessionEnded) {
        this.loadData();
        if (result.userId === this.currentUser()?.id) this.managementAccess.load(true).pipe(takeUntil(this.unsubscribe)).subscribe({ error: () => {} });
      }
    });
  }
  protected openActivity(patient: AdminPatient, mode: 'audit' | 'appointments'): void {
    if (!this.isAdmin || this.drawerOpen()) return;
    this.drawerOpen.set(true);
    this.drawer.create({ nzTitle: mode === 'audit' ? 'Nhật ký hồ sơ bệnh nhân' : 'Lịch sử lịch hẹn', nzContent: PatientActivity,
      nzData: { id: patient.id, patientCode: patient.patientCode, mode }, nzWidth: 'min(1100px, 100vw)', nzMaskClosable: false,
    }).afterClose.pipe(takeUntil(this.unsubscribe)).subscribe(() => this.drawerOpen.set(false));
  }
  protected openAccount(patient: AdminPatient, mode: 'view' | 'status'): void {
    if (!this.isAdmin || this.drawerOpen() || mode === 'status' && !this.canChangeAccount(patient)) return;
    this.drawerOpen.set(true);
    this.drawer.create({ nzTitle: mode === 'view' ? 'Tài khoản liên kết' : 'Khóa / mở tài khoản liên kết', nzContent: UserEditor,
      nzData: { id: patient.userId, mode, context: 'patient' }, nzWidth: 'min(1100px, 100vw)', nzMaskClosable: false,
      nzClosable: mode === 'view', nzKeyboard: mode === 'view', nzBodyStyle: { padding: '24px', background: '#f8fafc' },
    }).afterClose.pipe(takeUntil(this.unsubscribe)).subscribe(result => { this.drawerOpen.set(false); if (result?.success && !result.sessionEnded) this.loadData(); });
  }
}
