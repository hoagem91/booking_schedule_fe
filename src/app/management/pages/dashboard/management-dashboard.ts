import { afterNextRender, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription, Observable } from 'rxjs';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { AriaComponent, DataZoomComponent, TitleComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { NzDrawerService } from 'ng-zorro-antd/drawer';
import { AuthService } from '../../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { clinicToday, isCalendarDate } from '../../services/management-appointments.service';
import { managementError } from '../../services/management-access.service';
import {
  DashboardAnalytics,
  DashboardAppointmentPage,
  DashboardRevenue,
  DashboardSummary
} from '../../models/dashboard.model';
import {
  ManagementAppointmentDetail
} from '../management-appointments/management-appointment-detail/management-appointment-detail';
import { appointmentStatusLabels } from '../../../utils/appointment/appointment-ui.utils';
import { analyticsCharts, paymentMethodLabel, rankChart, revenueCharts, statusColors } from './dashboard-charts';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTooltipDirective, NzToolTipModule } from 'ng-zorro-antd/tooltip';

echarts.use([BarChart, LineChart, PieChart, TitleComponent, GridComponent, LegendComponent, TooltipComponent, DataZoomComponent, AriaComponent, CanvasRenderer]);

interface Section<T> {
  data: T | null;
  loading: boolean;
  error: string;
}

const initial = <T>(): Section<T> => ({ data: null, loading: false, error: '' });

export function dashboardRangeError(from: string, to: string): string {
  if (!isCalendarDate(from) || !isCalendarDate(to) || +from.slice(0, 4) < 1900 || +to.slice(0, 4) < 1900) return 'Chọn đủ hai ngày hợp lệ từ năm 1900 đến 9999.';
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000 + 1;
  return days < 1 ? 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' : days > 366 ? 'Khoảng thống kê tối đa 366 ngày.' : '';
}

function shift(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-management-dashboard', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgxEchartsDirective, NzIconDirective, NzRadioModule, NzDatePickerModule, NzButtonModule, NzToolTipModule, NzTooltipDirective],
  providers: [provideEchartsCore({ echarts }), NzDrawerService],
  templateUrl: './management-dashboard.html', styleUrl: './management-dashboard.css'
})
export class ManagementDashboard {
  private readonly api = inject(DashboardService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly drawer = inject(NzDrawerService);
  private readonly generation = this.auth.sessionGeneration();
  private readonly requests = new Map<string, Subscription>();
  readonly summary = signal(initial<DashboardSummary>());
  readonly analytics = signal(initial<DashboardAnalytics>());
  readonly revenue = signal(initial<DashboardRevenue>());
  readonly appointments = signal(initial<DashboardAppointmentPage>());
  readonly labels = appointmentStatusLabels;
  readonly colors = statusColors;
  readonly paymentLabel = paymentMethodLabel;
  appointmentOptions: echarts.EChartsCoreOption = {};
  statusOptions: echarts.EChartsCoreOption = {};
  revenueOptions: echarts.EChartsCoreOption = {};
  methodOptions: echarts.EChartsCoreOption = {};
  rankOptions: echarts.EChartsCoreOption = {};
  rankMode = 'specialties';
  preset = '30';
  upcomingOnly = false;
  today = clinicToday();
  fromDate = shift(this.today, -29);
  toDate = this.today;
  rangeError = '';
  appliedFrom = this.fromDate;
  appliedTo = this.toDate;
  reportType: 'date' | 'month' | 'year' = 'date';
  reportTime: Date[] = [this.localDate(this.fromDate), this.localDate(this.toDate)];

  private localDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  changeReportType(type: 'date' | 'month' | 'year'): void {
    if (type === this.reportType) return;
    this.reportType = type;
    const today = clinicToday();
    // Start a fresh selection rather than carrying January–December from year mode.
    this.reportTime = [this.localDate(type === 'date' ? shift(today, -29) : today), this.localDate(today)];
    this.applyReportTime();
  }

  applyReportTime(value: Date[] = this.reportTime): void {
    this.reportTime = value ?? [];
    if (this.reportTime.length !== 2 || this.reportTime.some(d => !d || !Number.isFinite(d.getTime()))) {
      this.rangeError = 'Vui lòng chọn đầy đủ khoảng thời gian.'; return;
    }
    const start = new Date(this.reportTime[0]);
    const end = new Date(this.reportTime[1]);
    if (this.reportType === 'month') {
      start.setDate(1); end.setMonth(end.getMonth() + 1, 0);
    } else if (this.reportType === 'year') {
      start.setMonth(0, 1); end.setMonth(11, 31);
    }
    const format = (d: Date) => `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.fromDate = format(start); this.toDate = format(end); this.preset = 'custom';
    this.applyRange();
  }

  constructor() {
    const clear = () => {
      this.requests.forEach(r => r.unsubscribe());
      this.requests.clear();
    };
    this.destroyRef.onDestroy(clear);
    effect(() => {
      if (this.auth.sessionGeneration() !== this.generation) {
        clear();
        this.summary.set(initial());
        this.analytics.set(initial());
        this.revenue.set(initial());
        this.appointments.set(initial());
        this.appointmentOptions = {};
        this.statusOptions = {};
        this.revenueOptions = {};
        this.methodOptions = {};
        this.rankOptions = {};
      }
    });
    afterNextRender(() => {
      this.reload();
      const timer = setInterval(() => {
        if (clinicToday() !== this.today) {
          this.today = clinicToday();
          this.loadSummary();
          this.loadAppointments();
        }
      }, 30000);
      this.destroyRef.onDestroy(() => clearInterval(timer));
    });
  }

  private active() {
    return !this.destroyRef.destroyed && this.auth.sessionGeneration() === this.generation;
  }

  private load<T>(key: string, state: {
    set: (value: Section<T>) => void
  }, source: Observable<T>, done?: (data: T) => void) {
    if (!this.active()) return;
    this.requests.get(key)?.unsubscribe();
    state.set({ data: null, loading: true, error: '' });
    this.requests.set(key, source.subscribe({
      next: data => {
        if (this.active()) {
          done?.(data);
          state.set({ data, loading: false, error: '' });
        }
      },
      error: error => {
        if (this.active()) state.set({ data: null, loading: false, error: managementError(error) });
      }
    }));
  }

  reload() {
    this.loadSummary();
    this.applyRange();
    this.loadAppointments();
  }

  loadSummary() {
    this.load('summary', this.summary, this.api.summary());
  }

  loadAppointments(page = 0) {
    this.load('appointments', this.appointments, this.api.appointments(page, this.upcomingOnly));
  }

  choosePreset() {
    const today = clinicToday();
    if (this.preset === 'custom') return;
    this.reportType = 'date';
    this.toDate = today;
    this.fromDate = this.preset === 'month' ? `${today.slice(0, 7)}-01` : shift(today, this.preset === '7' ? -6 : -29);
    this.applyRange();
  }

  applyRange() {
    this.rangeError = dashboardRangeError(this.fromDate, this.toDate);
    if (this.rangeError) return;
    this.reportTime = [this.localDate(this.fromDate), this.localDate(this.toDate)];
    this.appliedFrom = this.fromDate;
    this.appliedTo = this.toDate;
    const body = { fromDate: this.fromDate, toDate: this.toDate };
    this.load('analytics', this.analytics, this.api.analytics(body), data => {
      const charts = analyticsCharts(data);
      this.appointmentOptions = charts.appointments;
      this.statusOptions = charts.statuses;
      this.updateRank(data);
    });
    this.load('revenue', this.revenue, this.api.revenue(body), data => {
      const charts = revenueCharts(data);
      this.revenueOptions = charts.daily;
      this.methodOptions = charts.methods;
    });
  }

  updateRank(data = this.analytics().data) {
    this.rankOptions = rankChart(data ? this.rankMode === 'specialties' ? data.topSpecialties : data.topDoctors : []);
  }

  openAppointment(id: number) {
    const ref = this.drawer.create({
      nzTitle: 'Chi tiết lịch hẹn', nzContent: ManagementAppointmentDetail,
      nzWidth: 'min(1200px, 100vw)', nzData: { id }, nzMaskClosable: true
    });
    this.destroyRef.onDestroy(() => ref.close());
  }
}
