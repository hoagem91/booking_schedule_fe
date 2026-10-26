import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NZ_DRAWER_DATA, NzDrawerRef } from 'ng-zorro-antd/drawer';
import { Subscription, finalize, takeUntil } from 'rxjs';
import { BaseComponent } from '../../../../components/base.component';
import { ManagementUsersService } from '../../../services/management-users.service';
import { UserAuditResponse } from '../../../models/user.model';
import { apiResponseSucceeded } from '../../../../models/api-response.model';
import { userErrorMessage } from '../../../../utils/user/user-error.utils';
import { USER_AUDIT_LABELS, userAuditDiff } from './user-audit.utils';

@Component({
  selector: 'app-user-audit', imports: [DatePipe, NzButtonModule, NzPaginationModule],
  template: `
    <div class="audit-toolbar"><h2>Nhật ký tài khoản #{{ data.id }}</h2>
      <button nz-button (click)="load()" [disabled]="loading()">Tải lại</button>
      <button nz-button (click)="drawer.close()">Đóng</button>
    </div>
    <p>Nhật ký ghi các thao tác thành công. Mật khẩu không được hiển thị trong nhật ký.</p>
    @if (error()) {
      <p role="alert" class="audit-error">{{ error() }}</p>
    }
    @if (loading()) {
      <p role="status">Đang tải nhật ký…</p>
    }
    @for (entry of entries(); track entry.id) {
      <article class="audit-entry"><h3>{{ labels[entry.action] || 'Thao tác tài khoản' }} <small>#{{ entry.id }}</small>
      </h3>
        <p>{{ entry.createdAt | date:'dd/MM/yyyy HH:mm:ss' }} · Người thực hiện #{{ entry.actorUserId }}</p>
        @if (entry.passwordChanged) {
          <p>Mật khẩu đã được thay đổi.</p>
        }
        @if (diff(entry.beforeState, entry.afterState); as changes) {
          @if (changes.length) {
            <div class="audit-scroll">
              <table>
                <thead>
                <tr>
                  <th>Thông tin</th>
                  <th>Trước</th>
                  <th>Sau</th>
                </tr>
                </thead>
                <tbody>@for (field of changes; track field.label) {
                  <tr>
                    <th>{{ field.label }}</th>
                    <td>{{ field.before }}</td>
                    <td>{{ field.after }}</td>
                  </tr>
                }</tbody>
              </table>
            </div>
          } @else {
            <p>Không có thay đổi thông tin công khai.</p>
          }
        } @else {
          <p>Không thể đọc phần dữ liệu thay đổi của bản ghi này.</p>
        }
      </article>
    } @empty {
      @if (!loading() && !error()) {
        <p>Chưa có nhật ký. Dữ liệu cũ có thể chưa được ghi lịch sử.</p>
      }
    }
    <nz-pagination [nzPageIndex]="page()" [nzPageSize]="20" [nzTotal]="total()"
                   (nzPageIndexChange)="changePage($event)" />
  `,
  styles: [`:host{display:block}.audit-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.audit-toolbar h2{flex:1;font-size:18px}.audit-entry{padding:16px;border:1px solid #e2e8f0;border-radius:8px;margin:12px 0}.audit-entry h3{font-size:15px}.audit-entry small{color:#64748b}.audit-scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:420px}th,td{padding:8px;border:1px solid #e2e8f0;text-align:left;overflow-wrap:anywhere}.audit-error{color:#ac302b}`],
})
export class UserAudit extends BaseComponent {
  protected readonly data = inject<{ id: number }>(NZ_DRAWER_DATA);
  protected readonly drawer = inject(NzDrawerRef);
  private readonly api = inject(ManagementUsersService);
  protected readonly entries = signal<UserAuditResponse[]>([]);
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly labels = USER_AUDIT_LABELS;
  protected readonly diff = userAuditDiff;
  private request?: Subscription;
  override ngOnInit(): void { super.ngOnInit(); this.load(); }
  protected changePage(page: number): void { this.page.set(page); this.load(); }
  protected load(): void {
    this.request?.unsubscribe(); this.loading.set(true); this.error.set('');
    this.request = this.api.audit(this.data.id, { page: this.page() - 1, size: 20 }).pipe(takeUntil(this.unsubscribe), finalize(() => this.loading.set(false)))
      .subscribe({ next: res => {
        if (apiResponseSucceeded(res) && Array.isArray(res.result?.content)) { this.entries.set(res.result!.content); this.total.set(res.result!.totalElements); }
        else { this.entries.set([]); this.total.set(0); this.error.set(userErrorMessage(res, 'Không thể tải nhật ký. Vui lòng thử lại.')); }
      }, error: error => { this.entries.set([]); this.total.set(0); this.error.set(userErrorMessage(error, 'Không thể tải nhật ký. Vui lòng thử lại.')); } });
  }
}
