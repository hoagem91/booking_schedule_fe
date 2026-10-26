import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NZ_DRAWER_DATA, NzDrawerRef } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Observable, finalize, forkJoin, of, takeUntil } from 'rxjs';
import { BaseFormComponent } from '../../../../components/base-form.component';
import { ShowLoadingDirective } from '../../../../directives/UI/show-loading.directive';
import { ApiResponse, apiResponseSucceeded } from '../../../../models/api-response.model';
import { AuthService } from '../../../../services/auth.service';
import { ManagementUsersService } from '../../../services/management-users.service';
import {
  AdminRole,
  AdminUser,
  AdminUserCreateRequest,
  AdminUserUpdateRequest,
  USER_EDITOR_TITLES,
  USER_ROLE_LABELS,
  UserDeactivateResponse,
  UserEditorMode,
  UserRole
} from '../../../models/user.model';
import { userErrorMessage } from '../../../../utils/user/user-error.utils';
import { assignableUserRoles, userActionAllowed, userIsAdmin, userRolesError } from '../user-policy';
import { NzTooltipDirective } from 'ng-zorro-antd/tooltip';
import { userEmailValidator, userPhoneValidator, userUsernameValidator } from '../../../../utils/user/user-form.validators';

@Component({
  selector: 'app-user-editor',
  imports: [ReactiveFormsModule, RouterLink, NzButtonModule, NzIconModule, NzInputModule, NzFormModule, NzCardModule, NzSelectModule, ShowLoadingDirective, NzTooltipDirective],
  templateUrl: './user-editor.html', styleUrl: './user-editor.css'
})
export class UserEditor extends BaseFormComponent {
  private readonly data = inject<{ mode: UserEditorMode; id?: number; context?: 'patient' }>(NZ_DRAWER_DATA);
  private readonly drawer = inject(NzDrawerRef);
  private readonly api = inject(ManagementUsersService);
  private readonly auth = inject(AuthService);
  private readonly message = inject(NzMessageService);
  protected readonly mode = this.data.mode;
  protected readonly title = USER_EDITOR_TITLES[this.mode];
  protected readonly patientContext = this.data.context === 'patient';
  protected readonly labels = USER_ROLE_LABELS;
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly loaded = signal(false);
  protected readonly formError = signal('');
  protected readonly target = signal<AdminUser | null>(null);
  private catalog: AdminRole[] = [];

  protected get profileMode(): boolean {
    return ['create', 'edit', 'view'].includes(this.mode);
  }

  protected get passwordMode(): boolean {
    return ['create', 'password', 'self-password'].includes(this.mode);
  }

  protected get roleOptions(): AdminRole[] {
    return assignableUserRoles(this.catalog, this.currentUser(), this.target());
  }

  protected get canSave(): boolean {
    if (this.mode === 'view') return false;
    if (this.mode === 'self-password') return !!this.currentUser();
    const target = this.target();
    return this.mode === 'create' ? userIsAdmin(this.currentUser()) : !!target && userActionAllowed(this.currentUser(), target, this.mode);
  }

  protected pinnedRole(role: UserRole): boolean {
    const target = this.target();
    return (role === 'DOCTOR' && !!target?.doctorId) || (role === 'PATIENT' && !!target?.patientId)
      || (role === 'SUPER_ADMIN' && !!target?.capabilities?.lastActiveSuperAdmin);
  }

  constructor() {
    super();
    this.saveForm = this.fb.group({
      username: ['', [Validators.required, userUsernameValidator]],
      fullName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.pattern(/\S/), userEmailValidator]],
      phone: ['', [userPhoneValidator]],
      roles: [[], [Validators.required]],
      status: ['ACTIVE', [Validators.required, Validators.pattern(/^(ACTIVE|INACTIVE)$/)]],
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100), Validators.pattern(/\S/)]],
      confirmPassword: ['', [Validators.required]]
    });
    this.applyMode();
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.load();
  }

  private applyMode(): void {
    this.saveForm.disable({ emitEvent: false });
    const fields: Record<UserEditorMode, string[]> = {
      create: ['username', 'fullName', 'email', 'phone', 'roles', 'newPassword', 'confirmPassword'],
      edit: ['fullName', 'email', 'phone'],
      view: [],
      status: ['status'],
      roles: ['roles'],
      password: ['newPassword', 'confirmPassword'],
      'self-password': ['currentPassword', 'newPassword', 'confirmPassword'],
      deactivate: []
    };
    for (const key of fields[this.mode]) this.saveForm.controls[key].enable({ emitEvent: false });
  }

  protected load(): void {
    if (this.loading() || this.saving()) return;
    this.loading.set(true);
    this.loaded.set(false);
    this.formError.set('');
    const needsRoles = this.mode === 'create' || this.mode === 'roles';
    const needsTarget = this.mode !== 'create' && this.mode !== 'self-password';
    if (needsTarget && !this.data.id) {
      this.formError.set('Thiếu mã tài khoản.');
      this.loading.set(false);
      return;
    }
    forkJoin({
      user: needsTarget ? this.api.detail(this.data.id!) : of(null),
      roles: needsRoles ? this.api.roles() : of(null)
    })
      .pipe(takeUntil(this.unsubscribe), finalize(() => this.loading.set(false))).subscribe({
      next: ({ user, roles }) => {
        if (needsTarget && (!apiResponseSucceeded(user) || user?.result?.id !== this.data.id)) {
          this.formError.set(userErrorMessage(user, 'Không thể tải tài khoản. Vui lòng thử lại.'));
          return;
        }
        if (needsRoles && (!apiResponseSucceeded(roles) || !Array.isArray(roles?.result))) {
          this.formError.set(userErrorMessage(roles, 'Không thể tải danh mục vai trò. Vui lòng thử lại.'));
          return;
        }
        this.catalog = roles?.result ?? [];
        const target = user?.result ?? null;
        this.target.set(target);
        if (target) this.saveForm.patchValue({
          username: target.username, fullName: target.fullName, email: target.email,
          phone: target.phone ?? '', roles: target.roles.map(role => role.name), status: target.status
        }, { emitEvent: false });
        this.applyMode();
        this.saveForm.markAsPristine();
        this.saveForm.markAsUntouched();
        this.loaded.set(true);
        if (this.mode !== 'view' && !this.canSave) this.formError.set('Tài khoản hoặc quyền thao tác đã thay đổi. Bạn không được thực hiện thao tác này.');
      },
      error: error => this.formError.set(userErrorMessage(error, 'Không thể tải dữ liệu tài khoản. Vui lòng thử lại.'))
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
    this.saveForm.patchValue({ currentPassword: '', newPassword: '', confirmPassword: '' }, { emitEvent: false });
  }

  protected override handleOk(): void {
    if (!this.loaded() || this.loading() || this.saving() || !this.canSave) return;
    this.saveForm.markAllAsTouched();
    super.handleOk();
    if (this.saveForm.invalid) return;
    const value = this.saveForm.getRawValue(), target = this.target();
    if (this.passwordMode && value.newPassword !== value.confirmPassword) {
      this.formError.set('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (this.mode === 'create' || this.mode === 'roles') {
      const error = userRolesError(value.roles, this.catalog, this.currentUser(), target);
      if (error) {
        this.formError.set(error);
        return;
      }
    }
    let request: Observable<ApiResponse<AdminUser | UserDeactivateResponse>>;
    if (this.mode === 'create') {
      const body: AdminUserCreateRequest = {
        username: value.username.trim().toLowerCase(), fullName: value.fullName.trim(),
        email: value.email.trim().toLowerCase(), password: value.newPassword, roles: value.roles,
        ...(value.phone.trim() ? { phone: value.phone.trim() } : {})
      };
      request = this.api.create(body);
    } else if (this.mode === 'edit' && target) {
      if (target.phone && !value.phone.trim()) {
        this.formError.set('Chưa hỗ trợ xóa số điện thoại. Vui lòng giữ số hiện tại hoặc nhập số mới.');
        return;
      }
      const body: AdminUserUpdateRequest = {};
      if (value.fullName.trim() !== target.fullName) body.fullName = value.fullName.trim();
      if (value.email.trim().toLowerCase() !== target.email) body.email = value.email.trim().toLowerCase();
      if (value.phone.trim() && value.phone.trim() !== target.phone) body.phone = value.phone.trim();
      if (!Object.keys(body).length) {
        this.formError.set('Chưa có thay đổi để cập nhật.');
        return;
      }
      request = this.api.update(target.id, body);
    } else if (this.mode === 'status' && target) {
      if (value.status === target.status) {
        this.formError.set('Vui lòng chọn trạng thái mới.');
        return;
      }
      request = this.api.status(target.id, value.status);
    } else if (this.mode === 'roles' && target) {
      const old = target.roles.map(role => role.name).sort().join(',');
      if ([...value.roles].sort().join(',') === old) {
        this.formError.set('Tập vai trò chưa thay đổi.');
        return;
      }
      request = this.api.changeRoles(target.id, value.roles);
    } else if (this.mode === 'password' && target) request = this.api.resetPassword(target.id, value.newPassword);
    else if (this.mode === 'self-password') request = this.api.changeMyPassword(value.currentPassword, value.newPassword);
    else if (this.mode === 'deactivate' && target) request = this.api.deactivate(target.id);
    else return;
    this.formError.set('');
    this.saving.set(true);
    this.saveForm.disable({ emitEvent: false });
    request.pipe(takeUntil(this.unsubscribe), finalize(() => {
      this.saving.set(false);
      this.applyMode();
    })).subscribe({
      next: res => {
        const result = res.result;
        const expectedId = this.mode === 'create' ? undefined : (this.mode === 'self-password' ? this.currentUser()?.id : target?.id);
        const valid = result?.id && (!expectedId || result.id === expectedId) && (this.mode !== 'deactivate'
          || ('action' in result && result.action === 'DEACTIVATED' && result.status === 'INACTIVE'));
        if (apiResponseSucceeded(res) && valid) {
          this.clearPasswords();
          this.message.success(this.mode === 'deactivate' ? 'Đã vô hiệu hóa tài khoản; giữ nguyên hồ sơ và lịch sử.' : 'Lưu tài khoản thành công');
          const endSession = this.mode === 'self-password' || (this.mode === 'roles' && target?.id === this.currentUser()?.id);
          this.drawer.close({ success: true, sessionEnded: endSession });
          if (endSession) {
            this.managementAccess.reset();
            this.auth.forceLogout();
          }
        } else this.formError.set(userErrorMessage(res, 'Chưa xác định được kết quả. Vui lòng kiểm tra danh sách trước khi thử lại.'));
      },
      error: error => this.formError.set(userErrorMessage(error, 'Chưa xác định được kết quả. Vui lòng kiểm tra danh sách trước khi thử lại.'))
    });
  }
}
