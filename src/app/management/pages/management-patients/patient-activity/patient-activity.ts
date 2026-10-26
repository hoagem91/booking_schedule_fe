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
import { AdminPatientService } from '../../../services/admin-patient.service';
import { ManagementAppointmentsService, isCalendarDate } from '../../../services/management-appointments.service';
import { PatientAuditResponse } from '../../../models/admin-patient.model';
import { AppointmentHistoryItem, AppointmentStatus } from '../../../../models/appointment.model';
import { apiResponseSucceeded } from '../../../../models/api-response.model';
import { patientErrorMessage } from '../../../../utils/patient/patient-error.utils';
import { appointmentStatusLabels } from '../../../../utils/appointment/appointment-ui.utils';

const fieldLabels: Readonly<Record<string, string>> = { dateOfBirth: 'Ngày sinh', gender: 'Giới tính', address: 'Địa chỉ', healthInsuranceCode: 'Mã BHYT', fullName: 'Họ và tên', email: 'Email', phone: 'Điện thoại' };
export function patientChangedFieldLabels(fields: unknown): string[] {
  return Array.isArray(fields) ? fields.filter((field): field is string => typeof field === 'string' && Object.hasOwn(fieldLabels, field)).map(field => fieldLabels[field]) : [];
}

@Component({
  selector: 'app-patient-activity', imports: [DatePipe, DecimalPipe, ReactiveFormsModule, NzButtonModule, NzInputModule, NzSelectModule, NzPaginationModule],
  template: `
    <div class="activity-toolbar"><h2>{{ data.mode === 'audit' ? 'Nhật ký hồ sơ' : 'Lịch sử lịch hẹn' }} — {{ data.patientCode }}</h2><button nz-button (click)="load()" [disabled]="loading()">Tải lại</button><button nz-button (click)="drawer.close()">Đóng</button></div>
    @if (data.mode === 'audit') { <p>Nhật ký chỉ ghi tên trường thay đổi, không có giá trị hồ sơ cũ/mới.</p> }
    @else {
      <p>Tra cứu theo hồ sơ bệnh nhân #{{ data.id }}. Đây là lịch sử đặt lịch hẹn, không phải bệnh án.</p>
      <form class="activity-filters" [formGroup]="filters" (ngSubmit)="search()">
        <nz-select formControlName="status" nzAllowClear nzPlaceHolder="Tất cả trạng thái" aria-label="Trạng thái lịch hẹn">@for (status of statuses; track status) { <nz-option [nzValue]="status" [nzLabel]="statusLabels[status]" /> }</nz-select>
        <label>Ngày hẹn từ<input nz-input type="date" formControlName="fromDate" aria-label="Ngày hẹn từ" /></label>
        <label>Ngày hẹn đến<input nz-input type="date" formControlName="toDate" aria-label="Ngày hẹn đến" /></label>
        <button nz-button nzType="primary" type="submit">Tìm lịch hẹn</button>
      </form>
    }
    @if (error()) { <p role="alert" class="activity-error">{{ error() }}</p> }
    @if (loading()) { <p role="status">Đang tải dữ liệu…</p> }
    @if (data.mode === 'audit') {
      @for (entry of audits(); track entry.id) {
        <article class="activity-entry"><h3>{{ auditLabels[entry.action] || 'Thay đổi hồ sơ' }} <small>#{{ entry.id }}</small></h3><p>{{ entry.createdAt | date:'dd/MM/yyyy HH:mm:ss' }} · Người thực hiện #{{ entry.actorUserId }}</p>
          <p>Trường thay đổi: {{ changedFields(entry.changedFields).join(', ') || 'Không có trường thay đổi được ghi nhận' }}</p>
        </article>
      } @empty { @if (!loading() && !error()) { <p>Chưa có nhật ký. Dữ liệu cũ có thể chưa được ghi lịch sử.</p> } }
    } @else {
      <div class="activity-scroll"><table><thead><tr><th>Mã lịch hẹn</th><th>Ngày / giờ</th><th>Bác sĩ</th><th>Dịch vụ</th><th>Trạng thái</th><th>Thành tiền</th></tr></thead><tbody>
        @for (entry of appointments(); track entry.id) { <tr><td>{{ entry.appointmentCode }}</td><td>{{ entry.appointmentDate | date:'dd/MM/yyyy' }}<br/>{{ entry.startTime.slice(0, 5) }} – {{ entry.endTime.slice(0, 5) }}</td><td>{{ entry.doctorName }}</td><td>{{ entry.serviceName }}</td><td>{{ statusLabels[entry.status] }}</td><td>{{ entry.finalAmount === null ? 'Chưa có' : (entry.finalAmount | number:'1.0-2') }}</td></tr> }
      </tbody></table></div>
      @if (!appointments().length && !loading() && !error()) { <p>Không có lịch hẹn phù hợp.</p> }
    }
    <nz-pagination [nzPageIndex]="page()" [nzPageSize]="20" [nzTotal]="total()" (nzPageIndexChange)="changePage($event)" />
  `,
  styles: [`:host{display:block}.activity-toolbar,.activity-filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px}.activity-toolbar h2{flex:1;font-size:18px}.activity-filters{align-items:flex-end}.activity-filters nz-select{width:200px}.activity-filters label{display:grid;gap:4px}.activity-entry{padding:16px;border:1px solid #e2e8f0;border-radius:8px;margin:12px 0}.activity-entry h3{font-size:15px}.activity-scroll{overflow-x:auto;margin-bottom:16px}table{width:100%;min-width:800px;border-collapse:collapse}th,td{padding:10px;border:1px solid #e2e8f0;text-align:left}.activity-error{padding:12px;color:#ac302b;background:#fff2ef;border-radius:6px}`],
})
export class PatientActivity extends BaseComponent {
  protected readonly data = inject<{ id: number; patientCode: string; mode: 'audit' | 'appointments' }>(NZ_DRAWER_DATA);
  protected readonly drawer = inject(NzDrawerRef);
  private readonly api = inject(AdminPatientService);
  private readonly appointmentApi = inject(ManagementAppointmentsService);
  protected readonly audits = signal<PatientAuditResponse[]>([]);
  protected readonly appointments = signal<AppointmentHistoryItem[]>([]);
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly statusLabels = appointmentStatusLabels;
  protected readonly statuses = Object.keys(appointmentStatusLabels) as AppointmentStatus[];
  protected readonly changedFields = patientChangedFieldLabels;
  protected readonly auditLabels: Record<string, string> = { CREATE: 'Tạo hồ sơ', UPDATE: 'Cập nhật hồ sơ', SELF_CREATE: 'Tự tạo hồ sơ', SELF_UPDATE: 'Tự cập nhật hồ sơ', SELF_REGISTER: 'Đăng ký bệnh nhân' };
  protected readonly filters = this.fb.group({ status: this.fb.control<AppointmentStatus | null>(null), fromDate: [''], toDate: [''] });
  private request?: Subscription;
  override ngOnInit(): void { super.ngOnInit(); this.load(); }
  protected search(): void { this.page.set(1); this.load(); }
  protected changePage(page: number): void { this.page.set(page); this.load(); }
  protected load(): void {
    this.request?.unsubscribe(); this.error.set('');
    const value = this.filters.getRawValue();
    if (this.data.mode === 'appointments' && ([value.fromDate, value.toDate].some(date => date && !isCalendarDate(date)) || (value.fromDate && value.toDate && value.fromDate > value.toDate))) {
      this.loading.set(false); this.appointments.set([]); this.total.set(0); this.error.set('Khoảng ngày hẹn không hợp lệ. Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.'); return;
    }
    this.loading.set(true);
    const params = { page: this.page() - 1, size: 20, sort: 'id,desc' };
    if (this.data.mode === 'audit') {
      this.request = this.api.audit(this.data.id, params).pipe(takeUntil(this.unsubscribe), finalize(() => this.loading.set(false))).subscribe({ next: res => {
        if (apiResponseSucceeded(res) && Array.isArray(res.result?.content)) { this.audits.set(res.result!.content); this.total.set(res.result!.totalElements); }
        else { this.audits.set([]); this.total.set(0); this.error.set(patientErrorMessage(res, 'Không thể tải nhật ký bệnh nhân.')); }
      }, error: error => { this.audits.set([]); this.total.set(0); this.error.set(patientErrorMessage(error, 'Không thể tải nhật ký bệnh nhân.')); } });
    } else {
      this.request = this.appointmentApi.search(params, { patientId: this.data.id, status: value.status ?? null, fromDate: value.fromDate || null, toDate: value.toDate || null })
        .pipe(takeUntil(this.unsubscribe), finalize(() => this.loading.set(false))).subscribe({ next: res => {
          if (apiResponseSucceeded(res) && Array.isArray(res.result?.content)) { this.appointments.set(res.result!.content); this.total.set(res.result!.totalElements); }
          else { this.appointments.set([]); this.total.set(0); this.error.set(patientErrorMessage(res, 'Không thể tải lịch hẹn của bệnh nhân.')); }
        }, error: error => { this.appointments.set([]); this.total.set(0); this.error.set(patientErrorMessage(error, 'Không thể tải lịch hẹn của bệnh nhân.')); } });
    }
  }
}

