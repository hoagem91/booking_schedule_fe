import { RouterLink } from '@angular/router';
import { DoctorScheduleAdminService } from '../../../services/admin-doctor-schedule.service';
import { DoctorScheduleResponse } from '../../../models/doctor-schedule.models';
import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NZ_DRAWER_DATA, NzDrawerRef } from 'ng-zorro-antd/drawer';
import { Subscription, finalize, takeUntil } from 'rxjs';
import { BaseComponent } from '../../../../components/base.component';
import { AdminDoctorService } from '../../../services/admin-doctor.service';
import { ManagementAppointmentsService, isCalendarDate } from '../../../services/management-appointments.service';
import { DoctorAuditResponse } from '../../../models/admin-doctor.model';
import { AppointmentHistoryItem } from '../../../../models/appointment.model';
import { apiResponseSucceeded } from '../../../../models/api-response.model';
import { doctorErrorMessage } from '../../../../utils/doctor/doctor-error.utils';
import { appointmentStatusLabels } from '../../../../utils/appointment/appointment-ui.utils';

const fieldLabels: Readonly<Record<string, string>> = {
  doctorCode: 'Mã bác sĩ',
  specialtyId: 'Chuyên khoa',
  position: 'Chức danh',
  experienceYears: 'Số năm kinh nghiệm',
  description: 'Mô tả chuyên môn',
  status: 'Trạng thái hồ sơ',
  fullName: 'Họ và tên',
  email: 'Email',
  phone: 'Điện thoại'
};

export function doctorChangedFieldLabels(fields: unknown): string[] {
  return Array.isArray(fields) ? fields.filter((field): field is string => typeof field === 'string' && Object.hasOwn(fieldLabels, field)).map(field => fieldLabels[field]) : [];
}

@Component({
  selector: 'app-doctor-activity',
  imports: [RouterLink, DatePipe, DecimalPipe, ReactiveFormsModule, NzButtonModule, NzInputModule, NzSelectModule, NzPaginationModule],
  template: `
    <div class="activity-toolbar">
      <h2>{{ data.mode === 'audit' ? 'Nhật ký hồ sơ' : data.mode === 'schedules' ? 'Ca làm việc' : 'Lịch hẹn' }}
        — {{ data.doctorCode }}</h2>
      <button nz-button (click)="load()" [disabled]="loading()">Tải lại</button>
      <button nz-button (click)="drawer.close()">Đóng</button>
    </div>
    @if (data.mode === 'audit') {
      <p>Nhật ký chỉ ghi tên trường thay đổi, không có giá trị hồ sơ cũ/mới.</p>
    } @else {
      <p>Tra cứu theo hồ sơ bác sĩ #{{ data.id }}. Trạng thái ca làm việc được quản lý riêng với trạng thái hồ sơ bác
        sĩ.</p>
      <form class="activity-filters" [formGroup]="filters" (ngSubmit)="search()">
        <nz-select formControlName="status" nzAllowClear nzPlaceHolder="Tất cả trạng thái"
                   aria-label="Trạng thái tra cứu">@for (status of statuses; track status) {
          <nz-option [nzValue]="status" [nzLabel]="statusLabels[status]" />
        }</nz-select>
        <label>Từ ngày<input nz-input type="date" formControlName="fromDate" aria-label="Từ ngày" /></label>
        <label>Đến ngày<input nz-input type="date" formControlName="toDate" aria-label="Đến ngày" /></label>
        <button nz-button nzType="primary" type="submit">Tìm kiếm</button>
      </form>
    }
    @if (error()) {
      <p role="alert" class="activity-error">{{ error() }}</p>
    }
    @if (loading()) {
      <p role="status">Đang tải dữ liệu…</p>
    }
    @if (data.mode === 'audit') {
      @for (entry of audits(); track entry.id) {
        <article class="activity-entry"><h3>{{ auditLabels[entry.action] || 'Thay đổi hồ sơ' }}
          <small>#{{ entry.id }}</small></h3>
          <p>{{ entry.createdAt | date:'dd/MM/yyyy HH:mm:ss' }} · Người thực hiện #{{ entry.actorUserId }}</p>
          <p>Trường thay
            đổi: {{ changedFields(entry.changedFields).join(', ') || 'Không có trường thay đổi được ghi nhận' }}</p>
        </article>
      } @empty {
        @if (!loading() && !error()) {
          <p>Chưa có nhật ký. Dữ liệu cũ có thể chưa được ghi lịch sử.</p>
        }
      }
    } @else if (data.mode === 'schedules') {
      <p>Ca OPEN/FULL chưa kết thúc có thể chặn ngừng hoạt động; ca CLOSED chưa kết thúc cũng chặn đổi chuyên khoa.</p>
      <a nz-button routerLink="/management/doctor-schedule" (click)="drawer.close()">Mở trang quản lý ca làm việc</a>
      <div class="activity-scroll">
        <table>
          <thead>
          <tr>
            <th>Mã ca</th>
            <th>Ngày làm việc</th>
            <th>Giờ</th>
            <th>Phòng khám</th>
            <th>Số bệnh nhân tối đa</th>
            <th>Trạng thái ca</th>
          </tr>
          </thead>
          <tbody>
            @for (entry of schedules(); track entry.id) {
              <tr>
                <td>#{{ entry.id }}</td>
                <td>{{ entry.workDate | date:'dd/MM/yyyy' }}</td>
                <td>{{ entry.startTime.slice(0, 5) }} – {{ entry.endTime.slice(0, 5) }}</td>
                <td>{{ entry.roomName || 'Chưa gán phòng' }}</td>
                <td>{{ entry.maxPatients }}</td>
                <td>{{ scheduleLabels[entry.status] || entry.status }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (!schedules().length && !loading() && !error()) {
        <p>Không có ca làm việc phù hợp.</p>
      }
    } @else {
      <div class="activity-scroll">
        <table>
          <thead>
          <tr>
            <th>Mã lịch hẹn</th>
            <th>Ngày / giờ</th>
            <th>Bệnh nhân</th>
            <th>Dịch vụ</th>
            <th>Trạng thái</th>
            <th>Thành tiền</th>
          </tr>
          </thead>
          <tbody>
            @for (entry of appointments(); track entry.id) {
              <tr>
                <td>{{ entry.appointmentCode }}</td>
                <td>{{ entry.appointmentDate | date:'dd/MM/yyyy' }}<br />{{ entry.startTime.slice(0, 5) }}
                  – {{ entry.endTime.slice(0, 5) }}
                </td>
                <td>{{ entry.patientName }}</td>
                <td>{{ entry.serviceName }}</td>
                <td>{{ statusLabels[entry.status] }}</td>
                <td>{{ entry.finalAmount === null ? 'Chưa có' : (entry.finalAmount | number:'1.0-2') }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (!appointments().length && !loading() && !error()) {
        <p>Không có lịch hẹn phù hợp.</p>
      }
    }
    <nz-pagination [nzPageIndex]="page()" [nzPageSize]="20" [nzTotal]="total()"
                   (nzPageIndexChange)="changePage($event)" />
  `,
  styles: [`:host {
    display: block
  }

  .activity-toolbar, .activity-filters {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 16px
  }

  .activity-toolbar h2 {
    flex: 1;
    font-size: 18px
  }

  .activity-filters {
    align-items: flex-end
  }

  .activity-filters nz-select {
    width: 200px
  }

  .activity-filters label {
    display: grid;
    gap: 4px
  }

  .activity-entry {
    padding: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    margin: 12px 0
  }

  .activity-entry h3 {
    font-size: 15px
  }

  .activity-scroll {
    overflow-x: auto;
    margin-bottom: 16px
  }

  table {
    width: 100%;
    min-width: 800px;
    border-collapse: collapse
  }

  th, td {
    padding: 10px;
    border: 1px solid #e2e8f0;
    text-align: left
  }

  .activity-error {
    padding: 12px;
    color: #ac302b;
    background: #fff2ef;
    border-radius: 6px
  }`]
})
export class DoctorActivity extends BaseComponent {
  protected readonly data = inject<{
    id: number;
    doctorCode: string;
    mode: 'audit' | 'appointments' | 'schedules'
  }>(NZ_DRAWER_DATA);
  protected readonly drawer = inject(NzDrawerRef);
  private readonly api = inject(AdminDoctorService);
  private readonly appointmentApi = inject(ManagementAppointmentsService);
  protected readonly audits = signal<DoctorAuditResponse[]>([]);
  private readonly scheduleApi = inject(DoctorScheduleAdminService);
  protected readonly schedules = signal<DoctorScheduleResponse[]>([]);
  protected readonly scheduleLabels: Record<string, string> = {
    OPEN: 'Mở đăng ký',
    FULL: 'Đã đầy',
    CLOSED: 'Đã đóng',
    CANCELLED: 'Đã hủy'
  };
  protected readonly appointments = signal<AppointmentHistoryItem[]>([]);
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly total = signal(0);

  protected get statusLabels(): Record<string, string> {
    return this.data.mode === 'schedules' ? this.scheduleLabels : appointmentStatusLabels;
  }

  protected get statuses(): string[] {
    return Object.keys(this.statusLabels);
  }

  protected readonly changedFields = doctorChangedFieldLabels;
  protected readonly auditLabels: Record<string, string> = {
    CREATE: 'Tạo hồ sơ',
    UPDATE: 'Cập nhật hồ sơ',
    STATUS_CHANGED: 'Đổi trạng thái hồ sơ',
    DEACTIVATED: 'Vô hiệu hóa hồ sơ'
  };
  protected readonly filters = this.fb.group({
    status: this.fb.control<string | null>(null),
    fromDate: [''],
    toDate: ['']
  });
  private request?: Subscription;

  override ngOnInit(): void {
    super.ngOnInit();
    this.load();
  }

  protected search(): void {
    this.page.set(1);
    this.load();
  }

  protected changePage(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.error.set('');
    const value = this.filters.getRawValue();
    if (this.data.mode !== 'audit' && ([value.fromDate, value.toDate].some(date => date && !isCalendarDate(date)) || (value.fromDate && value.toDate && value.fromDate > value.toDate))) {
      this.loading.set(false);
      this.schedules.set([]);
      this.appointments.set([]);
      this.total.set(0);
      this.error.set('Khoảng ngày không hợp lệ. Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
      return;
    }
    this.loading.set(true);
    const params = { page: this.page() - 1, size: 20, sort: 'id,desc' };
    if (this.data.mode === 'audit') {
      this.request = this.api.audit(this.data.id, params).pipe(takeUntil(this.unsubscribe), finalize(() => this.loading.set(false))).subscribe({
        next: res => {
          if (apiResponseSucceeded(res) && Array.isArray(res.result?.content)) {
            this.audits.set(res.result!.content);
            this.total.set(res.result!.totalElements);
          } else {
            this.audits.set([]);
            this.total.set(0);
            this.error.set(doctorErrorMessage(res, 'Không thể tải nhật ký bác sĩ.'));
          }
        }, error: error => {
          this.audits.set([]);
          this.total.set(0);
          this.error.set(doctorErrorMessage(error, 'Không thể tải nhật ký bác sĩ.'));
        }
      });
    } else if (this.data.mode === 'schedules') {
      this.request = this.scheduleApi.search(params, {
        doctorId: this.data.id,
        status: value.status ?? null,
        fromDate: value.fromDate || null,
        toDate: value.toDate || null
      })
        .pipe(takeUntil(this.unsubscribe), finalize(() => this.loading.set(false))).subscribe({
          next: res => {
            if (apiResponseSucceeded(res) && Array.isArray(res.result?.content)) {
              this.schedules.set(res.result!.content);
              this.total.set(res.result!.totalElements);
            } else {
              this.schedules.set([]);
              this.total.set(0);
              this.error.set(doctorErrorMessage(res, 'Không thể tải ca làm việc của bác sĩ.'));
            }
          }, error: error => {
            this.schedules.set([]);
            this.total.set(0);
            this.error.set(doctorErrorMessage(error, 'Không thể tải ca làm việc của bác sĩ.'));
          }
        });
    } else {
      this.request = this.appointmentApi.search(params, {
        doctorId: this.data.id,
        status: value.status ?? null,
        fromDate: value.fromDate || null,
        toDate: value.toDate || null
      })
        .pipe(takeUntil(this.unsubscribe), finalize(() => this.loading.set(false))).subscribe({
          next: res => {
            if (apiResponseSucceeded(res) && Array.isArray(res.result?.content)) {
              this.appointments.set(res.result!.content);
              this.total.set(res.result!.totalElements);
            } else {
              this.appointments.set([]);
              this.total.set(0);
              this.error.set(doctorErrorMessage(res, 'Không thể tải lịch hẹn của bác sĩ.'));
            }
          }, error: error => {
            this.appointments.set([]);
            this.total.set(0);
            this.error.set(doctorErrorMessage(error, 'Không thể tải lịch hẹn của bác sĩ.'));
          }
        });
    }
  }
}

