import { Component, inject, signal } from '@angular/core';
import { NZ_DRAWER_DATA, NzDrawerRef } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { takeUntil } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { BaseComponent } from '../../../../components/base.component';
import { ShowLoadingDirective } from '../../../../directives/UI/show-loading.directive';
import { ManagementAppointmentsService } from '../../../services/management-appointments.service';
import { AppointmentHistoryItem, AppointmentStatus } from '../../../../models/appointment.model';
import { AppointmentUtils } from '../../../../utils/appointment/appointment.utils';
import { AppointmentEnumStatus } from '../../../../enum/appointment/appointment.enum';
import { apiResponseSucceeded } from '../../../../models/api-response.model';
import { appointmentStatusLabels } from '../../../../utils/appointment/appointment-ui.utils';
import { AppointmentActionsComponent } from '../../../appointment-workflow/appointment-actions.component';
import { AppointmentActionResult } from '../../../appointment-workflow/appointment-actions.policy';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';

/** Dữ liệu truyền vào Drawer khi mở chi tiết lịch hẹn */
export interface AppointmentDetailDrawerData {
  id: number;
  onStatusChanged?: () => void;
  showWorkflowActions?: boolean;
}

@Component({
  selector: 'app-management-appointment-detail',
  imports: [
    NzButtonModule,
    NzIconModule,
    NzCardModule,
    NzTagModule,
    NzDividerModule,
    NzDescriptionsModule,
    NzBadgeModule,
    NzToolTipModule,
    ShowLoadingDirective,
    AppointmentActionsComponent,
    DecimalPipe,
    DatePipe
  ],
  templateUrl: './management-appointment-detail.html',
  styleUrl: './management-appointment-detail.css'
})
export class ManagementAppointmentDetail extends BaseComponent {
  private readonly drawerData = inject<AppointmentDetailDrawerData>(NZ_DRAWER_DATA, { optional: true });
  private readonly drawer = inject(NzDrawerRef, { optional: true });
  private readonly api = inject(ManagementAppointmentsService);
  private readonly router = inject(Router);
  protected readonly showWorkflowActions = this.drawerData?.showWorkflowActions === true;

  protected readonly AppointmentUtils = AppointmentUtils;
  protected readonly AppointmentEnumStatus = AppointmentEnumStatus;

  protected readonly isLoading = signal(false);
  protected readonly loadFailed = signal(false);
  protected appointmentData: AppointmentHistoryItem | null = null;

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadDetail();
  }

  /** Gọi API lấy chi tiết lịch hẹn theo id */
  protected loadDetail(): void {
    const id = this.drawerData?.id;
    if (!id) {
      this.loadFailed.set(true);
      this.setError('Không tìm thấy mã lịch hẹn. Vui lòng đóng và thử lại.');
      return;
    }

    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.clearError();

    this.api.getAppointmentDetail(id)
      .pipe(
        takeUntil(this.unsubscribe),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          this.errorCode.set(String(res.code));
          if (apiResponseSucceeded(res) && res.result && res.result.id === id) {
            this.appointmentData = res.result;
          } else {
            this.loadFailed.set(true);
            this.setError(
              res.message || 'Không thể tải thông tin lịch hẹn. Vui lòng thử tải lại.',
              res.code
            );
          }
        },
        error: () => {
          this.loadFailed.set(true);
          this.setError('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.');
        }
      });
  }

  /** Lấy nhãn trạng thái lịch hẹn */
  protected statusLabel(status: AppointmentStatus): string {
    return appointmentStatusLabels[status] ?? 'Chưa xác định';
  }

  /** Lấy màu badge header theo trạng thái */
  protected statusBadgeClass(status: AppointmentStatus): string {
    const map: Record<AppointmentStatus, string> = {
      PENDING: 'badge--warning',
      CONFIRMED: 'badge--info',
      IN_PROGRESS: 'badge--primary',
      COMPLETED: 'badge--success',
      CANCELLED: 'badge--danger',
      NO_SHOW: 'badge--neutral'
    };
    return map[status] ?? 'badge--neutral';
  }

  /** Kiểm tra lịch hẹn có khuyến mãi không */
  protected get hasPromotion(): boolean {
    return !!this.appointmentData?.promotionId;
  }

  /** Sau khi action workflow thay đổi trạng thái */
  protected refreshAfterAction(result: AppointmentActionResult): void {
    if (!this.showWorkflowActions) return;
    if (result.appointment) this.appointmentData = result.appointment;
    this.drawerData?.onStatusChanged?.();
    this.loadDetail();
  }

  protected openWorkflow(): void {
    if (!this.appointmentData || !this.hasPermission('appointments:update-status')) return;
    const data = this.appointmentData;
    this.drawer?.close({ success: false });
    void this.router.navigate(['/management/appointments/review'], { queryParams: {
      doctorId: data.doctorId, date: data.appointmentDate, appointmentCode: data.appointmentCode,
    } });
  }

  protected handleClose(): void {
    this.drawer?.close({ success: false });
  }
}
