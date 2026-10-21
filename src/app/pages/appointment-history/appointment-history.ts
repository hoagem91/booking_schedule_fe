import { afterNextRender, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';

import { AppointmentService } from '../../services/appointment/appointment.service';
import { AppointmentHistoryPage, AppointmentStatus, HistorySort } from '../../models/appointment.model';
import { decodeAppointmentText, appointmentResponseSucceeded } from '../../utils/appointment/appointment-ui.utils';
import { NzOptionComponent, NzSelectComponent } from 'ng-zorro-antd/select';
import { FormsModule } from '@angular/forms';
import { NzIconDirective } from 'ng-zorro-antd/icon';

const statusLabels: Record<AppointmentStatus, string> = {
  PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', IN_PROGRESS: 'Đang khám',
  COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy', NO_SHOW: 'Không đến khám'
};

@Component({
  selector: 'app-appointment-history', standalone: true,
  imports: [RouterLink, DatePipe, CurrencyPipe, NzSelectComponent, NzOptionComponent, FormsModule, NzIconDirective],
  templateUrl: './appointment-history.html', styleUrl: './appointment-history.css'
})
export class AppointmentHistory {
  private readonly appointmentService = inject(AppointmentService);
  private readonly destroyRef = inject(DestroyRef);
  private historyRequest?: Subscription;
  readonly result = signal<AppointmentHistoryPage | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly sort = signal<HistorySort>('id,desc');
  readonly statusFilter = signal<AppointmentStatus | ''>('');
  readonly statuses = Object.entries(statusLabels) as [AppointmentStatus, string][];
  readonly visibleItems = computed(() => {
    const items = this.result()?.content ?? [];
    return this.statusFilter() ? items.filter(item => item.status === this.statusFilter()) : items;
  });
  private readonly decodeText = decodeAppointmentText;

  constructor() {
    afterNextRender(() => this.load());
  }

  load(): void {
    // Cancel before setting loading: the old request's finalize also clears it.
    this.historyRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.result.set(null);

    const params = {
      page: this.page(),
      size: this.pageSize(),
      sort: this.sort()
    };

    this.historyRequest = this.appointmentService.getMyHistory(params)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: res => {
          if (res?.success === false) {
            this.error.set(res.message || this.message());
            return;
          }

          const isSuccess = appointmentResponseSucceeded(res);
          if (!isSuccess) {
            this.error.set(this.message(res?.code));
            return;
          }

          const value = res.result;
          if (!value || !Array.isArray(value.content)
            || !Number.isInteger(value.totalElements) || value.totalElements < 0
            || !Number.isInteger(value.totalPages) || value.totalPages < 0
            || !Number.isInteger(value.number) || value.number < 0
            || !Number.isInteger(value.size) || value.size <= 0) {
            this.error.set('Dữ liệu lịch hẹn chưa hợp lệ. Vui lòng thử lại.');
            return;
          }

          this.result.set({
            ...value,
            content: value.content.map(item => ({
              ...item,
              serviceName: this.decodeText(item.serviceName || ''),
              promotionName: item.promotionName ? this.decodeText(item.promotionName) : null
            }))
          });
        },
        error: (error: unknown) => this.error.set(this.errorMessage(error))
      });
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'Không thể kết nối máy chủ. Vui lòng thử lại.';
      if (error.status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
      return this.message(error.error?.code);
    }
    return error instanceof Error ? error.message : this.message();
  }

  private message(code?: number): string {
    if (code === 2003) return 'Tài khoản của bạn chưa có hồ sơ bệnh nhân. Vui lòng liên hệ tổng đài hỗ trợ.';
    if (code === 1007 || code === 2002) return 'Bạn chưa có quyền xem lịch sử đặt khám.';
    if (code === 1006) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    return 'Không thể tải lịch sử đặt khám. Vui lòng thử lại.';
  }

  changePage(next: number): void {
    const value = this.result();
    if (this.loading() || !value || next < 0 || next >= value.totalPages) return;
    this.page.set(next);
    this.load();
  }

  changeSize(size: number): void {
    if (![10, 20, 50].includes(size)) return;
    this.pageSize.set(size);
    this.page.set(0);
    this.load();
  }

  changeSort(sort: string): void {
    if (sort !== 'id,desc' && sort !== 'id,asc') return;

    this.sort.set(sort);
    this.page.set(0);
    this.load();
  }

  statusLabel(status: string): string {
    return Object.hasOwn(statusLabels, status) ? statusLabels[status as AppointmentStatus] : 'Chưa xác định';
  }

  statusClass(status: string): string {
    return Object.hasOwn(statusLabels, status) ? status.toLowerCase() : 'unknown';
  }

  firstItem(value: AppointmentHistoryPage): number {
    return value.content.length ? value.number * value.size + 1 : 0;
  }

  lastItem(value: AppointmentHistoryPage): number {
    return Math.min(value.number * value.size + value.content.length, value.totalElements);
  }
}
