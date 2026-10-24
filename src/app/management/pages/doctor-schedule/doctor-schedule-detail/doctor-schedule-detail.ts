import { Component, inject, signal } from '@angular/core';
import { NZ_DRAWER_DATA, NzDrawerRef } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { takeUntil } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { BaseComponent } from '../../../../components/base.component';
import { ShowLoadingDirective } from '../../../../directives/UI/show-loading.directive';
import { DoctorScheduleAdminService } from '../../../services/admin-doctor-schedule.service';
import { DoctorScheduleResponse, TimeSlot } from '../../../models/doctor-schedule.models';
import { DoctorScheduleUtils } from '../../../../utils/appointment/doctor-schedule.utils';
import { DoctorScheduleEnumStatus } from '../../../../enum/doctor-schedule/doctor-schedule.enum';
import { apiResponseSucceeded } from '../../../../models/api-response.model';
import { DatePipe } from '@angular/common';

export interface DoctorScheduleDetailDrawerData {
  id: number;
}

@Component({
  selector: 'app-doctor-schedule-detail',
  imports: [
    NzButtonModule,
    NzIconModule,
    NzCardModule,
    NzTagModule,
    NzDividerModule,
    NzDescriptionsModule,
    NzTableModule,
    NzBadgeModule,
    NzToolTipModule,
    ShowLoadingDirective,
    DatePipe
  ],
  templateUrl: './doctor-schedule-detail.html',
  styleUrl: './doctor-schedule-detail.css'
})
export class DoctorScheduleDetail extends BaseComponent {
  private readonly drawerData = inject<DoctorScheduleDetailDrawerData>(NZ_DRAWER_DATA, { optional: true });
  private readonly drawer = inject(NzDrawerRef, { optional: true });
  private readonly api = inject(DoctorScheduleAdminService);

  protected readonly DoctorScheduleUtils = DoctorScheduleUtils;
  protected readonly DoctorScheduleEnumStatus = DoctorScheduleEnumStatus;

  protected readonly isLoading = signal(false);
  protected readonly loadFailed = signal(false);
  protected scheduleData: DoctorScheduleResponse | null = null;

  /** Cột bảng time slots */
  protected readonly slotColumns = [
    { key: 'startTime', title: 'Giờ bắt đầu', align: 'center' as const, width: 130 },
    { key: 'endTime', title: 'Giờ kết thúc', align: 'center' as const, width: 130 },
    { key: 'maxPatients', title: 'Sức chứa', align: 'center' as const, width: 100 },
    { key: 'bookedCount', title: 'Đã đặt', align: 'center' as const, width: 90 },
    { key: 'available', title: 'Còn trống', align: 'center' as const, width: 100 },
    { key: 'status', title: 'Trạng thái', align: 'center' as const, width: 120 }
  ];

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadDetail();
  }

  /** Gọi API lấy chi tiết lịch làm việc theo id */
  protected loadDetail(): void {
    const id = this.drawerData?.id;
    if (!id) {
      this.loadFailed.set(true);
      this.setError('Không tìm thấy mã lịch làm việc. Vui lòng đóng và thử lại.');
      return;
    }

    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.clearError();

    this.api.getDoctorScheduleDetail(id)
      .pipe(
        takeUntil(this.unsubscribe),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          this.errorCode.set(String(res.code));
          if (apiResponseSucceeded(res) && res.result && res.result.id === id) {
            this.scheduleData = res.result;
          } else {
            this.loadFailed.set(true);
            this.setError(
              res.message || 'Không thể tải thông tin lịch làm việc. Vui lòng thử tải lại.',
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

  /** Lấy nhãn + màu trạng thái slot */
  protected getSlotStatus(status: string): { text: string; color: string } {
    const map: Record<string, { text: string; color: string }> = {
      AVAILABLE: { text: 'Còn trống', color: 'green' },
      BOOKED: { text: 'Đã đặt', color: 'blue' },
      FULL: { text: 'Đã đầy', color: 'orange' },
      CLOSED: { text: 'Đã đóng', color: 'default' },
      CANCELLED: { text: 'Đã hủy', color: 'red' }
    };
    return map[status] ?? { text: status, color: 'default' };
  }

  /** Số chỗ còn trống của một slot */
  protected slotAvailable(slot: TimeSlot): number {
    return Math.max(0, slot.maxPatients - slot.bookedCount);
  }

  /** Tổng số bệnh nhân đã đặt trên toàn ca */
  protected get totalBooked(): number {
    return this.scheduleData?.timeSlots?.reduce((sum, s) => sum + s.bookedCount, 0) ?? 0;
  }

  /** Tổng sức chứa cộng từ các time slots */
  protected get totalSlotCapacity(): number {
    return this.scheduleData?.timeSlots?.reduce((sum, s) => sum + s.maxPatients, 0) ?? 0;
  }

  protected handleClose(): void {
    this.drawer?.close({ success: false });
  }
}
