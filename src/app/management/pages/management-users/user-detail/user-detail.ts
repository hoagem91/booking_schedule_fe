import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NZ_DRAWER_DATA, NzDrawerRef } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzTooltipDirective, NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { finalize, takeUntil } from 'rxjs';
import { BaseComponent } from '../../../../components/base.component';
import { ShowLoadingDirective } from '../../../../directives/UI/show-loading.directive';
import { ManagementUsersService } from '../../../services/management-users.service';
import { AdminDoctorService } from '../../../services/admin-doctor.service';
import { AdminPatientService } from '../../../services/admin-patient.service';
import {
  AdminUser,
  USER_ROLE_LABELS,
  UserAuditResponse,
  UserEditorMode,
  UserRole
} from '../../../models/user.model';
import { AdminDoctor } from '../../../models/admin-doctor.model';
import { AdminPatient } from '../../../models/admin-patient.model';
import { apiResponseSucceeded } from '../../../../models/api-response.model';
import { userErrorMessage } from '../../../../utils/user/user-error.utils';
import { USER_AUDIT_LABELS, userAuditDiff } from '../user-audit/user-audit.utils';
import { userActionAllowed, userIsAdmin } from '../user-policy';

export interface UserRoleInfo {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
  description: string;
}

export const ROLE_INFOS: Record<UserRole, UserRoleInfo> = {
  SUPER_ADMIN: {
    label: 'Quản trị hệ thống',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    icon: 'crown',
    description: 'Quyền hạn tối cao trong hệ sinh thái. Quản trị toàn bộ tài khoản quản trị viên, cấu hình an toàn hệ thống và phân quyền cấp cao.'
  },
  ADMIN: {
    label: 'Quản trị viên',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: 'safety-certificate',
    description: 'Quản lý vận hành bệnh viện: danh mục chuyên khoa, dịch vụ, phòng khám, hồ sơ bác sĩ, bệnh nhân và lịch hẹn.'
  },
  DOCTOR: {
    label: 'Bác sĩ',
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
    icon: 'medicine-box',
    description: 'Bác sĩ lâm sàng phụ trách khám chữa bệnh, quản lý ca làm việc và ghi nhận kết quả điều trị của bệnh nhân.'
  },
  STAFF: {
    label: 'Nhân viên',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: 'idcard',
    description: 'Nhân viên tiếp đón và điều phối phòng khám. Hỗ trợ đặt hẹn, kiểm tra hành chính và hướng dẫn bệnh nhân.'
  },
  PATIENT: {
    label: 'Bệnh nhân',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    icon: 'user',
    description: 'Người dùng sử dụng dịch vụ y tế. Đặt lịch khám trực tuyến, quản lý lịch hẹn và tra cứu hồ sơ cá nhân.'
  }
};

@Component({
  selector: 'app-user-detail',
  imports: [
    CommonModule,
    DatePipe,
    NzButtonModule,
    NzIconModule,
    NzCardModule,
    NzTagModule,
    NzDividerModule,
    NzDescriptionsModule,
    NzBadgeModule,
    NzToolTipModule,
    NzTabsModule,
    NzPaginationModule,
    NzAlertModule,
    ShowLoadingDirective,
    NzTooltipDirective
  ],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.css'
})
export class UserDetail extends BaseComponent {
  private readonly drawerData = inject<{ id?: number }>(NZ_DRAWER_DATA, { optional: true });
  private readonly drawer = inject(NzDrawerRef, { optional: true });
  private readonly api = inject(ManagementUsersService);
  private readonly doctorService = inject(AdminDoctorService);
  private readonly patientService = inject(AdminPatientService);
  private readonly message = inject(NzMessageService);

  @Input() embeddedId?: number;
  @Output() actionTriggered = new EventEmitter<{ action: UserEditorMode; user: AdminUser }>();
  @Output() closeDrawer = new EventEmitter<void>();

  protected readonly targetId = computed(() => this.embeddedId ?? this.drawerData?.id);
  protected readonly userData = signal<AdminUser | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly loadError = signal('');

  protected readonly doctorData = signal<AdminDoctor | null>(null);
  protected readonly isDoctorLoading = signal(false);

  protected readonly patientData = signal<AdminPatient | null>(null);
  protected readonly isPatientLoading = signal(false);

  protected readonly auditEntries = signal<UserAuditResponse[]>([]);
  protected readonly auditTotal = signal(0);
  protected readonly isAuditLoading = signal(false);
  protected readonly auditError = signal('');
  protected readonly auditPage = signal(1);

  protected readonly roleLabels = USER_ROLE_LABELS;
  protected readonly roleInfos = ROLE_INFOS;
  protected readonly auditLabels = USER_AUDIT_LABELS;
  protected readonly auditDiff = userAuditDiff;
  protected readonly columnConfig = { xxl: 2, xl: 2, lg: 2, md: 2, sm: 1, xs: 1 };

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadAll();
  }

  protected loadAll(): void {
    const id = this.targetId();
    if (!id) {
      this.loadError.set('Thiếu mã định danh tài khoản.');
      return;
    }
    this.isLoading.set(true);
    this.loadError.set('');
    this.doctorData.set(null);
    this.patientData.set(null);

    this.api.detail(id)
      .pipe(takeUntil(this.unsubscribe), finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: res => {
          if (apiResponseSucceeded(res) && res.result?.id === id) {
            const user = res.result;
            this.userData.set(user);
            if (user.doctorId) {
              this.loadDoctorProfile(user.doctorId);
            }
            if (user.patientId) {
              this.loadPatientProfile(user.patientId);
            }
            this.loadAuditLogs();
          } else {
            this.loadError.set(userErrorMessage(res, 'Không thể tải thông tin tài khoản. Vui lòng thử lại.'));
          }
        },
        error: err => {
          this.loadError.set(userErrorMessage(err, 'Không thể tải thông tin tài khoản. Vui lòng thử lại.'));
        }
      });
  }

  private loadDoctorProfile(doctorId: number): void {
    this.isDoctorLoading.set(true);
    this.doctorService.detail(doctorId)
      .pipe(takeUntil(this.unsubscribe), finalize(() => this.isDoctorLoading.set(false)))
      .subscribe({
        next: res => {
          if (apiResponseSucceeded(res) && res.result) {
            this.doctorData.set(res.result);
          }
        },
        error: () => {}
      });
  }

  private loadPatientProfile(patientId: number): void {
    this.isPatientLoading.set(true);
    this.patientService.detail(patientId)
      .pipe(takeUntil(this.unsubscribe), finalize(() => this.isPatientLoading.set(false)))
      .subscribe({
        next: res => {
          if (apiResponseSucceeded(res) && res.result) {
            this.patientData.set(res.result);
          }
        },
        error: () => {}
      });
  }

  protected loadAuditLogs(): void {
    const id = this.targetId();
    if (!id) return;
    this.isAuditLoading.set(true);
    this.auditError.set('');
    this.api.audit(id, { page: this.auditPage() - 1, size: 10 })
      .pipe(takeUntil(this.unsubscribe), finalize(() => this.isAuditLoading.set(false)))
      .subscribe({
        next: res => {
          if (apiResponseSucceeded(res) && Array.isArray(res.result?.content)) {
            this.auditEntries.set(res.result!.content);
            this.auditTotal.set(res.result!.totalElements);
          } else {
            this.auditEntries.set([]);
            this.auditTotal.set(0);
            this.auditError.set(userErrorMessage(res, 'Không thể tải nhật ký tài khoản.'));
          }
        },
        error: err => {
          this.auditEntries.set([]);
          this.auditTotal.set(0);
          this.auditError.set(userErrorMessage(err, 'Không thể tải nhật ký tài khoản.'));
        }
      });
  }

  protected onAuditPageChange(page: number): void {
    this.auditPage.set(page);
    this.loadAuditLogs();
  }

  protected canAct(mode: UserEditorMode): boolean {
    const user = this.userData();
    if (!user) return false;
    return userActionAllowed(this.currentUser(), user, mode);
  }

  protected triggerAction(mode: UserEditorMode): void {
    const user = this.userData();
    if (!user || !this.canAct(mode)) return;
    if (this.actionTriggered.observed) {
      this.actionTriggered.emit({ action: mode, user });
    } else if (this.drawer) {
      this.drawer.close({ triggerAction: mode, user });
    }
  }

  protected handleClose(): void {
    if (this.closeDrawer.observed) {
      this.closeDrawer.emit();
    } else if (this.drawer) {
      this.drawer.close();
    }
  }

  protected copyText(text: string | null | undefined, label: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.message.success(`Đã sao chép ${label} vào bộ nhớ tạm!`);
    }).catch(() => {
      this.message.warning('Không thể sao chép văn bản.');
    });
  }

  protected getInitials(name?: string): string {
    if (!name) return 'U';
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 'U';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  protected getRoleInfo(role: string): UserRoleInfo {
    return this.roleInfos[role as UserRole] || {
      label: role,
      color: '#475569',
      bg: '#f1f5f9',
      border: '#cbd5e1',
      icon: 'user',
      description: 'Vai trò người dùng trong hệ thống.'
    };
  }

  protected isRolePinned(role: UserRole): boolean {
    const user = this.userData();
    if (!user) return false;
    return (role === 'DOCTOR' && !!user.doctorId)
      || (role === 'PATIENT' && !!user.patientId)
      || (role === 'SUPER_ADMIN' && !!user.capabilities?.lastActiveSuperAdmin);
  }
}
