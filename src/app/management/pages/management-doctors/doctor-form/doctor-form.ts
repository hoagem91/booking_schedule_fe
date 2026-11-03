import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { NZ_DRAWER_DATA, NzDrawerRef } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Observable, Subscription, debounceTime, distinctUntilChanged, finalize, of, switchMap, takeUntil } from 'rxjs';
import { BaseFormComponent } from '../../../../components/base-form.component';
import { ShowLoadingDirective } from '../../../../directives/UI/show-loading.directive';
import { ApiResponse, apiResponseSucceeded } from '../../../../models/api-response.model';
import { AuthService } from '../../../../services/auth.service';
import { AdminDoctorService } from '../../../services/admin-doctor.service';
import { ManagementUsersService } from '../../../services/management-users.service';
import {
  AdminDoctor,
  AdminDoctorCreateRequest,
  AdminDoctorUpdateRequest,
  DoctorSpecialtyOption
} from '../../../models/admin-doctor.model';
import { AdminUser } from '../../../models/user.model';
import { doctorErrorMessage } from '../../../../utils/doctor/doctor-error.utils';
import {
  userEmailValidator,
  userPhoneValidator,
  userUsernameValidator
} from '../../../../utils/user/user-form.validators';
import { userIsAdmin } from '../../management-users/user-policy';
import { doctorExperienceValidator, doctorCanEdit, doctorUserEligibility } from '../doctor-policy';

@Component({
  selector: 'app-doctor-form',
  imports: [DatePipe, NzDescriptionsModule, NzTagModule, NzTabsModule, ReactiveFormsModule, NzButtonModule, NzIconModule, NzInputModule, NzFormModule, NzCardModule, NzSelectModule, NzPaginationModule, ShowLoadingDirective],
  templateUrl: './doctor-form.html', styleUrl: './doctor-form.css'
})
export class DoctorForm extends BaseFormComponent {
  private readonly data = inject<{ id?: number; isViewMode?: boolean }>(NZ_DRAWER_DATA);
  private readonly drawer = inject(NzDrawerRef);
  private readonly api = inject(AdminDoctorService);
  private readonly usersApi = inject(ManagementUsersService);
  private readonly auth = inject(AuthService);
  private readonly message = inject(NzMessageService);
  private lookupRequest?: Subscription;
  private selectedRequest?: Subscription;
  protected readonly isEditMode = !!this.data.id;
  protected readonly isViewMode = !!this.data.isViewMode;
  protected readonly title = this.isEditMode ? (this.isViewMode ? 'Chi tiết hồ sơ bác sĩ' : 'Cập nhật hồ sơ bác sĩ') : 'Tạo hồ sơ bác sĩ';
  protected readonly specialties = signal<DoctorSpecialtyOption[]>([]);
  protected readonly specialtyLoading = signal(false);
  protected readonly specialtyError = signal('');
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly loaded = signal(!this.isEditMode);
  protected readonly formError = signal('');
  protected readonly doctor = signal<AdminDoctor | null>(null);
  protected readonly userOptions = signal<AdminUser[]>([]);
  protected readonly userTotal = signal(0);
  protected readonly userPage = signal(1);
  protected readonly lookupLoading = signal(false);
  protected readonly lookupError = signal('');
  protected readonly selectedLoading = signal(false);
  protected readonly selectedUser = signal<AdminUser | null>(null);
  protected readonly userSearchControl = new FormControl('', { nonNullable: true });
  protected readonly columnConfig = { xxl: 2, xl: 2, lg: 2, md: 2, sm: 1, xs: 1 };

  protected getInitials(name: string): string {
    return name.trim().split(/\s+/).filter(Boolean).slice(-2).map(part => part.charAt(0)).join('').toUpperCase() || 'BS';
  }

  protected get currentSpecialty(): DoctorSpecialtyOption | null {
    const item = this.doctor();
    return item && !this.specialties().some(option => option.id === item.specialtyId)
      ? { id: item.specialtyId, name: item.specialtyName, status: item.specialtyStatus } : null;
  }

  protected get existingAccount(): boolean {
    return !this.isEditMode && this.saveForm.controls['source'].value === 'existing';
  }

  protected get extraSelectedUser(): AdminUser | null {
    const user = this.selectedUser();
    return user && !this.userOptions().some(item => item.id === user.id) ? user : null;
  }

  protected get canSave(): boolean {
    return !this.isViewMode && userIsAdmin(this.currentUser()) && (!this.isEditMode || !!this.doctor() && doctorCanEdit(this.currentUser(), this.doctor()!));
  }

  protected userDisabledReason(user: AdminUser): string | null {
    return doctorUserEligibility(this.currentUser(), user);
  }

  constructor() {
    super();
    this.saveForm = this.fb.group({
      source: ['new'],
      userId: [null, [Validators.required, (control: FormControl) => Number.isSafeInteger(control.value) && control.value > 0 ? null : { positiveId: true }]],
      username: ['', [Validators.required, userUsernameValidator]],
      fullName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.pattern(/\S/), userEmailValidator]],
      phone: ['', [userPhoneValidator]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100), Validators.pattern(/\S/)]],
      confirmPassword: ['', Validators.required],
      specialtyId: [null, [Validators.required, (control: FormControl) => Number.isSafeInteger(control.value) && control.value > 0 ? null : { positiveId: true }]],
      doctorCode: ['', [Validators.maxLength(50)]],
      position: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
      experienceYears: [0, [Validators.required, doctorExperienceValidator]],
      description: ['', Validators.maxLength(2000)]
    });
    this.applyMode();
  }

  override ngOnInit(): void {
    super.ngOnInit();
    if (!this.isViewMode) this.loadSpecialties();
    if (this.isEditMode) this.load();
    this.saveForm.controls['source'].valueChanges.pipe(takeUntil(this.unsubscribe)).subscribe(() => {
      this.lookupRequest?.unsubscribe();
      this.selectedRequest?.unsubscribe();
      this.selectedUser.set(null);
      this.saveForm.patchValue({ userId: null, password: '', confirmPassword: '' }, { emitEvent: false });
      this.formError.set('');
      this.applyMode();
      if (this.existingAccount) this.searchUsers();
    });
    this.saveForm.controls['userId'].valueChanges.pipe(takeUntil(this.unsubscribe)).subscribe(id => this.selectUser(id));
    this.userSearchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.unsubscribe)).subscribe(() => {
      if (this.existingAccount) this.searchUsers();
    });
  }

  protected load(): void {
    if (!this.data.id || this.loading() || this.saving()) return;
    this.loading.set(true);
    this.loaded.set(false);
    this.formError.set('');
    this.api.detail(this.data.id).pipe(takeUntil(this.unsubscribe), finalize(() => this.loading.set(false))).subscribe({
      next: res => {
        if (!apiResponseSucceeded(res) || res.result?.id !== this.data.id) {
          this.formError.set(doctorErrorMessage(res, 'Không thể tải hồ sơ bác sĩ.'));
          return;
        }
        const item = res.result!;
        this.doctor.set(item);
        this.saveForm.patchValue({
          fullName: item.fullName, email: item.email, phone: item.phone ?? '', username: item.username,
          specialtyId: item.specialtyId, doctorCode: item.doctorCode, position: item.position,
          experienceYears: item.experienceYears, description: item.description ?? ''
        }, { emitEvent: false });
        this.applyMode();
        this.saveForm.markAsPristine();
        this.saveForm.markAsUntouched();
        this.loaded.set(true);
      }, error: error => this.formError.set(doctorErrorMessage(error, 'Không thể tải hồ sơ bác sĩ. Vui lòng thử lại.'))
    });
  }

  private applyMode(): void {
    this.saveForm.disable({ emitEvent: false });
    if (this.isViewMode) return;
    const fields: string[] = [];
    if (!this.isEditMode) fields.push('source', ...(this.existingAccount ? ['userId'] : ['username', 'fullName', 'email', 'phone', 'password', 'confirmPassword']));
    if (!this.isEditMode || this.doctor()?.capabilities?.canEditProfile) fields.push('specialtyId', 'doctorCode', 'position', 'experienceYears', 'description');
    if (this.isEditMode && this.doctor()?.capabilities?.canEditAccount) fields.push('fullName', 'email', 'phone');
    for (const field of fields) this.saveForm.controls[field].enable({ emitEvent: false });
  }

  protected loadSpecialties(): void {
    if (this.specialtyLoading() || this.saving()) return;
    this.specialtyLoading.set(true);
    this.specialtyError.set('');
    this.api.specialties(true).pipe(takeUntil(this.unsubscribe), finalize(() => this.specialtyLoading.set(false))).subscribe({
      next: res => {
        if (apiResponseSucceeded(res) && Array.isArray(res.result)) this.specialties.set(res.result.filter(item => item.status === 'ACTIVE'));
        else {
          this.specialties.set([]);
          this.specialtyError.set(doctorErrorMessage(res, 'Không thể tải chuyên khoa.'));
        }
      }, error: error => {
        this.specialties.set([]);
        this.specialtyError.set(doctorErrorMessage(error, 'Không thể tải chuyên khoa.'));
      }
    });
  }

  protected searchUsers(page = 1): void {
    if (!this.existingAccount || this.saving()) return;
    this.lookupRequest?.unsubscribe();
    this.lookupLoading.set(true);
    this.lookupError.set('');
    this.userPage.set(page);
    this.lookupRequest = this.usersApi.search({ page: page - 1, size: 10, sort: 'id,asc' }, {
      keyword: this.userSearchControl.value.trim() || null, status: 'ACTIVE', role: null
    }).pipe(takeUntil(this.unsubscribe), finalize(() => this.lookupLoading.set(false))).subscribe({
      next: res => {
        if (apiResponseSucceeded(res) && Array.isArray(res.result?.content)) {
          this.userOptions.set(res.result!.content);
          this.userTotal.set(res.result!.totalElements);
        } else {
          this.userOptions.set([]);
          this.userTotal.set(0);
          this.lookupError.set(doctorErrorMessage(res, 'Không thể tìm tài khoản. Vui lòng thử lại.'));
        }
      }, error: error => {
        this.userOptions.set([]);
        this.userTotal.set(0);
        this.lookupError.set(doctorErrorMessage(error, 'Không thể tìm tài khoản.'));
      }
    });
  }

  private selectUser(id: number | null): void {
    this.selectedRequest?.unsubscribe();
    this.selectedUser.set(null);
    this.formError.set('');
    if (!Number.isSafeInteger(id) || !id || id <= 0) return;
    this.selectedLoading.set(true);
    this.selectedRequest = this.usersApi.detail(id).pipe(takeUntil(this.unsubscribe), finalize(() => this.selectedLoading.set(false))).subscribe({
      next: res => {
        if (!apiResponseSucceeded(res) || res.result?.id !== id) {
          this.formError.set(doctorErrorMessage(res, 'Không thể kiểm tra tài khoản được chọn.'));
          return;
        }
        const reason = this.userDisabledReason(res.result!);
        if (reason) this.formError.set(reason); else this.selectedUser.set(res.result!);
      }, error: error => this.formError.set(doctorErrorMessage(error, 'Không thể kiểm tra tài khoản được chọn.'))
    });
  }

  protected override handleCancel(): void {
    if (!this.saving()) this.drawer.close({ success: false });
  }

  override ngOnDestroy(): void {
    this.clearPasswords();
    super.ngOnDestroy();
  }

  private clearPasswords(): void {
    this.saveForm.patchValue({ password: '', confirmPassword: '' }, { emitEvent: false });
  }

  protected override handleOk(): void {
    if (!this.canSave || !this.loaded() || this.loading() || this.saving() || this.selectedLoading()) return;
    this.saveForm.markAllAsTouched();
    super.handleOk();
    if (this.saveForm.invalid) return;
    const value = this.saveForm.getRawValue(), old = this.doctor();
    if ((!old || old.capabilities?.canEditProfile && value.specialtyId !== old.specialtyId)
      && !this.specialties().some(item => item.id === value.specialtyId && item.status === 'ACTIVE')) {
      this.formError.set('Vui lòng tải và chọn chuyên khoa đang hoạt động.');
      return;
    }
    let request: Observable<ApiResponse<AdminDoctor>>;
    if (old) {
      const body: AdminDoctorUpdateRequest = {};
      if (old.capabilities?.canEditProfile) {
        if (value.specialtyId !== old.specialtyId) body.specialtyId = value.specialtyId;
        const code = value.doctorCode.trim().toUpperCase();
        if (!code) {
          this.formError.set('Mã bác sĩ cập nhật không được để trống.');
          return;
        }
        if (code !== old.doctorCode) body.doctorCode = code;
        if (value.position.trim() !== old.position) body.position = value.position.trim();
        if (value.experienceYears !== old.experienceYears) body.experienceYears = value.experienceYears;
        const description = value.description.trim();
        if (description !== (old.description ?? '')) {
          if (description) body.description = description; else body.clearDescription = true;
        }
      }
      if (old.capabilities?.canEditAccount) {
        if (old.phone && !value.phone.trim()) {
          this.formError.set('Chưa hỗ trợ xóa số điện thoại. Vui lòng giữ hoặc thay số mới.');
          return;
        }
        const account: NonNullable<AdminDoctorUpdateRequest['account']> = {};
        if (value.fullName.trim() !== old.fullName) account.fullName = value.fullName.trim();
        if (value.email.trim().toLowerCase() !== old.email) account.email = value.email.trim().toLowerCase();
        if (value.phone.trim() && value.phone.trim() !== old.phone) account.phone = value.phone.trim();
        if (Object.keys(account).length) body.account = account;
      }
      if (!Object.keys(body).length) {
        this.formError.set('Chưa có thay đổi để cập nhật.');
        return;
      }
      request = this.api.update(old.id, body);
    } else {
      const profile = {
        specialtyId: value.specialtyId, position: value.position.trim(), experienceYears: value.experienceYears,
        ...(value.doctorCode.trim() ? { doctorCode: value.doctorCode.trim().toUpperCase() } : {}),
        ...(value.description.trim() ? { description: value.description.trim() } : {})
      };
      if (this.existingAccount) {
        if (this.selectedUser()?.id !== value.userId) {
          this.formError.set('Vui lòng chọn và kiểm tra tài khoản hợp lệ trước khi tạo hồ sơ.');
          return;
        }
        request = this.usersApi.detail(value.userId).pipe(switchMap(res => {
          if (!apiResponseSucceeded(res) || res.result?.id !== value.userId) return of({ code: res.code === 1000 ? 1005 : res.code });
          const selected = res.result!;
          if (this.userDisabledReason(selected)) return of({ code: selected.status !== 'ACTIVE' ? 1012 : selected.doctorId != null ? 4001 : 1007 });
          return this.api.create({ ...profile, userId: value.userId });
        }));
      } else {
        if (value.password !== value.confirmPassword) {
          this.formError.set('Mật khẩu xác nhận không khớp.');
          return;
        }
        const body: AdminDoctorCreateRequest = {
          ...profile, user: {
            username: value.username.trim().toLowerCase(),
            password: value.password,
            fullName: value.fullName.trim(),
            email: value.email.trim().toLowerCase(), ...(value.phone.trim() ? { phone: value.phone.trim() } : {})
          }
        };
        request = this.api.create(body);
      }
    }
    this.formError.set('');
    this.saving.set(true);
    this.saveForm.disable({ emitEvent: false });
    request.pipe(takeUntil(this.unsubscribe), finalize(() => {
      this.saving.set(false);
      this.applyMode();
    })).subscribe({
      next: res => {
        const result = res.result;
        const correctIdentity = old ? result?.id === old.id && result.userId === old.userId : !this.existingAccount || result?.userId === value.userId;
        if (apiResponseSucceeded(res) && result?.id && correctIdentity) {
          const selfLinked = !old && this.existingAccount && result.userId === this.currentUser()?.id;
          this.clearPasswords();
          this.message.success(this.isEditMode ? 'Cập nhật hồ sơ thành công' : 'Tạo hồ sơ bác sĩ thành công');
          this.drawer.close({ success: true, sessionEnded: selfLinked, userId: result.userId });
          if (selfLinked) {
            this.managementAccess.reset();
            this.auth.forceLogout();
          }
        } else this.formError.set(doctorErrorMessage(res, 'Chưa xác định được kết quả lưu. Vui lòng kiểm tra danh sách trước khi thử lại.'));
      },
      error: error => this.formError.set(doctorErrorMessage(error, 'Chưa xác định được kết quả lưu. Vui lòng kiểm tra danh sách trước khi thử lại.'))
    });
  }
}
