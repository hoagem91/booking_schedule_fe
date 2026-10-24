import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { isCalendarDate } from '../../services/management-appointments.service';
import { FormsModule } from '@angular/forms';
import { debounceTime, finalize, Subject, Subscription, takeUntil } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzDrawerService } from 'ng-zorro-antd/drawer';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTooltipDirective, NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { BaseComponent } from '../../../components/base.component';
import { ManagementAppointmentsService } from '../../services/management-appointments.service';
import { AppointmentHistoryItem, AppointmentStatus } from '../../../models/appointment.model';
import {
  AppointmentSummaryDoctor,
  AppointmentSummaryRequest
} from '../../models/appointment-review.models';
import { AppointmentUtils } from '../../../utils/appointment/appointment.utils';
import { appointmentStatusLabels } from '../../../utils/appointment/appointment-ui.utils';
import { apiResponseSucceeded } from '../../../models/api-response.model';
import { AppointmentActionsComponent } from '../../appointment-workflow/appointment-actions.component';
import { AppointmentActionResult } from '../../appointment-workflow/appointment-actions.policy';
import {
  ManagementAppointmentDetail
} from '../management-appointments/management-appointment-detail/management-appointment-detail';
import { DatePipe } from '@angular/common';

/** Các trạng thái hiển thị trên filter cột phải */
export const REVIEW_STATUS_OPTIONS: { label: string; value: AppointmentStatus | null }[] = [
  { label: 'Tất cả', value: null },
  { label: 'Chờ xác nhận', value: 'PENDING' },
  { label: 'Đã xác nhận', value: 'CONFIRMED' },
  { label: 'Đang khám', value: 'IN_PROGRESS' },
  { label: 'Hoàn thành', value: 'COMPLETED' },
  { label: 'Đã hủy', value: 'CANCELLED' },
  { label: 'Không đến khám', value: 'NO_SHOW' }
];

@Component({
  selector: 'app-appointment-review',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule, NzIconModule, NzTagModule, NzBadgeModule,
    NzInputModule, NzSelectModule, NzToolTipModule,
    NzSpinModule, NzEmptyModule,
    NzDatePickerModule, NzPaginationModule,
    AppointmentActionsComponent, NzTooltipDirective, DatePipe
  ],
  templateUrl: './appointment-review.html',
  styleUrl: './appointment-review.css'
})
export class AppointmentReview extends BaseComponent {
  private readonly api = inject(ManagementAppointmentsService);
  private readonly route = inject(ActivatedRoute);
  private target: { doctorId: number; keyword: string } | null = null;
  private readonly drawerService = inject(NzDrawerService);

  protected readonly AppointmentUtils = AppointmentUtils;
  protected readonly appointmentStatusLabels = appointmentStatusLabels;
  protected readonly REVIEW_STATUS_OPTIONS = REVIEW_STATUS_OPTIONS;
  protected readonly pageSize = 10;

  protected readonly isLoadingSummary = signal(false);
  protected readonly summaryDoctors = signal<AppointmentSummaryDoctor[]>([]);
  protected readonly selectedDoctorId = signal<number | null>(null);
  protected readonly summaryError = signal('');

  protected readonly leftKeyword = signal('');
  private readonly leftKeywordChanges = new Subject<void>();
  private summaryRequest?: Subscription;
  protected leftDateRange: [Date, Date] | null = null;
  protected leftFromDate: string | null = null;
  protected leftToDate: string | null = null;

  protected readonly isLoadingAppointments = signal(false);
  protected appointments: AppointmentHistoryItem[] = [];
  protected readonly rightTotal = signal(0);
  protected readonly rightPage = signal(1);
  protected rightKeyword = '';
  protected readonly rightStatus = signal<AppointmentStatus | null>(null);
  protected readonly appointmentsError = signal('');
  private appointmentsRequest?: Subscription;

  protected readonly selectedDoctor = computed(() =>
    this.summaryDoctors().find(d => d.doctorId === this.selectedDoctorId())
  );

  override ngOnInit(): void {
    super.ngOnInit();
    this.leftKeywordChanges.pipe(debounceTime(300), takeUntil(this.unsubscribe))
      .subscribe(() => this.loadSummary());
    this.route.queryParamMap.pipe(takeUntil(this.unsubscribe)).subscribe(params => {
      this.leftKeyword.set('');
      const doctorId = Number(params.get('doctorId'));
      const date = params.get('date');
      this.target = Number.isSafeInteger(doctorId) && doctorId > 0
        ? { doctorId, keyword: (params.get('appointmentCode') ?? '').trim() } : null;
      if (date && isCalendarDate(date)) {
        this.leftFromDate = date; this.leftToDate = date;
        this.leftDateRange = [new Date(`${date}T00:00:00`), new Date(`${date}T00:00:00`)];
      } else {
        this.leftFromDate = null; this.leftToDate = null; this.leftDateRange = null;
      }
      this.loadSummary();
    });
  }

  protected onLeftKeywordChange(value: string): void {
    this.leftKeyword.set(value);
    this.summaryRequest?.unsubscribe();
    this.leftKeywordChanges.next();
  }

  protected loadSummary(): void {
    this.summaryRequest?.unsubscribe();
    this.isLoadingSummary.set(true);
    this.summaryError.set('');

    const body: AppointmentSummaryRequest = {
      fromDate: this.leftFromDate || null,
      toDate: this.leftToDate || null,
      doctorKeyword: this.leftKeyword().trim() || null
    };

    this.summaryRequest = this.api.getSummary(body)
      .pipe(takeUntil(this.unsubscribe), finalize(() => this.isLoadingSummary.set(false)))
      .subscribe({
        next: res => {
          if (apiResponseSucceeded(res) && res.result) {
            this.summaryDoctors.set([...res.result.doctors].sort((a, b) => {
              const pendA = a.statusCounts['PENDING'] ?? 0;
              const pendB = b.statusCounts['PENDING'] ?? 0;
              return pendB - pendA || a.doctorName.localeCompare(b.doctorName, 'vi');
            }));
            if (this.target) {
              const target = this.target; this.target = null;
              if (this.summaryDoctors().some(d => d.doctorId === target.doctorId)) {
                this.selectedDoctorId.set(null); this.selectDoctor(target.doctorId, target.keyword);
              } else {
                this.selectedDoctorId.set(null); this.appointmentsRequest?.unsubscribe(); this.appointments = []; this.rightTotal.set(0);
                this.summaryError.set('Không tìm thấy bác sĩ của lịch hẹn trong phạm vi đã chọn. Vui lòng tải lại hoặc điều chỉnh bộ lọc.');
              }
              return;
            }
            if (!this.summaryDoctors().some(d => d.doctorId === this.selectedDoctorId())) {
              this.selectedDoctorId.set(null);
              this.appointmentsRequest?.unsubscribe();
              this.appointments = [];
              this.rightTotal.set(0);
            }
            if (!this.selectedDoctorId() && this.summaryDoctors().length) {
              const first = this.summaryDoctors().find(d => d.total > 0) ?? this.summaryDoctors()[0];
              this.selectDoctor(first.doctorId);
            }
          } else {
            this.summaryError.set(res.message || 'Không thể tải danh sách bác sĩ.');
          }
        },
        error: () => this.summaryError.set('Không thể kết nối máy chủ. Vui lòng thử lại.')
      });
  }

  protected onLeftDateRangeChange(dates: Date[] | null): void {
    if (dates && dates.length === 2 && dates[0] && dates[1]) {
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      this.leftFromDate = fmt(dates[0]);
      this.leftToDate = fmt(dates[1]);
    } else {
      this.leftFromDate = null;
      this.leftToDate = null;
    }
    this.loadSummary();
    if (this.selectedDoctorId()) {
      this.rightPage.set(1);
      this.loadAppointments();
    }
  }

  protected selectDoctor(doctorId: number, keyword = ''): void {
    if (this.selectedDoctorId() === doctorId) return;
    this.selectedDoctorId.set(doctorId);
    this.rightPage.set(1);
    this.rightKeyword = keyword;
    this.rightStatus.set(null);
    this.appointments = [];
    this.rightTotal.set(0);
    this.appointmentsError.set('');
    this.loadAppointments();
  }

  protected loadAppointments(): void {
    const doctorId = this.selectedDoctorId();
    if (!doctorId) return;

    this.appointmentsRequest?.unsubscribe();
    this.isLoadingAppointments.set(true);
    this.appointmentsError.set('');

    const body: any = {
      doctorId,
      keyword: this.rightKeyword.trim() || null,
      status: this.rightStatus() || null,
      fromDate: this.leftFromDate || null,
      toDate: this.leftToDate || null
    };

    const params = {
      page: this.rightPage() - 1,
      size: this.pageSize,
      sort: 'appointmentDate,asc'
    };

    this.appointmentsRequest = this.api.search(params, body)
      .pipe(takeUntil(this.unsubscribe), finalize(() => this.isLoadingAppointments.set(false)))
      .subscribe({
        next: res => {
          if (apiResponseSucceeded(res) && res.result) {
            this.appointments = res.result.content;
            this.rightTotal.set(res.result.totalElements);
          } else {
            this.appointments = [];
            this.rightTotal.set(0);
            this.appointmentsError.set(res.message || 'Không thể tải danh sách lịch hẹn.');
          }
        },
        error: () => this.appointmentsError.set('Không thể kết nối máy chủ. Vui lòng thử lại.')
      });
  }

  protected onRightPageChange(page: number): void {
    this.rightPage.set(page);
    this.loadAppointments();
  }

  protected onRightStatusChange(status: AppointmentStatus | null): void {
    this.rightStatus.set(status);
    this.rightPage.set(1);
    this.loadAppointments();
  }

  protected onRightSearch(): void {
    this.rightPage.set(1);
    this.loadAppointments();
  }

  protected refreshAfterAction(result: AppointmentActionResult, appt: AppointmentHistoryItem): void {
    if (result.appointment) {
      this.appointments = this.appointments.map(a => a.id === appt.id ? result.appointment! : a);
    }
    this.loadSummary();
    if (result.refresh) this.loadAppointments();
  }

  protected reloadAll(): void {
    this.loadSummary();
    if (this.selectedDoctorId()) this.loadAppointments();
  }

  protected openDetail(id: number): void {
    this.drawerService.create({
      nzTitle: 'Chi tiết lịch hẹn',
      nzContent: ManagementAppointmentDetail,
      nzWidth: 'min(1100px, 100vw)',
      nzMaskClosable: true,
      nzClosable: true,
      nzKeyboard: true,
      nzPlacement: 'right',
      nzData: { id, showWorkflowActions: true, onStatusChanged: () => this.reloadAll() },
      nzBodyStyle: { padding: '24px', background: '#f8fafc', overflow: 'auto' }
    });
  }

  protected statusColor(status: AppointmentStatus | string): string {
    return AppointmentUtils.getAppointmentStatus(status as any)?.color ?? 'default';
  }

  protected statusLabel(status: AppointmentStatus): string {
    return appointmentStatusLabels[status] ?? status;
  }

  protected badgeCount(doctor: AppointmentSummaryDoctor, status: AppointmentStatus): number {
    return doctor.statusCounts[status] ?? 0;
  }

  protected toggleRightStatus(status: AppointmentStatus): void {
    const current = this.rightStatus();
    this.onRightStatusChange(current === status ? null : status);
  }
}
