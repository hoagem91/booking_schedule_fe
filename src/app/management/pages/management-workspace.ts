import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ManagementAccessService } from '../services/management-access.service';

@Component({
  standalone: true, imports: [RouterLink], styleUrls: ['./management-ui.css', './management-workspace.css'],
  template: `
    <div class="page-header">
      <div><p class="eyebrow">KHÔNG GIAN LÀM VIỆC</p>
        <h1>Xin chào, {{ access.user()?.fullName || access.user()?.username }}</h1>
        <p class="subtitle">Theo dõi lịch hẹn và phối hợp công việc trong ngày.</p></div>
      <span class="role-chip">{{ access.roleText() }}</span></div>
    <section class="welcome-card"><span class="welcome-symbol" aria-hidden="true">✳</span>
      <div><h2>Mỗi lịch hẹn, một sự chuẩn bị chu đáo.</h2>
        <p>Thông tin rõ ràng giúp các bộ phận phối hợp và hỗ trợ người bệnh thuận tiện hơn.</p></div>
    </section>
    <section class="section-gap" aria-labelledby="quick-title"><p class="eyebrow" id="quick-title">TRUY CẬP NHANH</p>
      <div class="quick-grid">
        @if (access.can('appointments:read')) {
          <a class="quick-card" routerLink="/management/appointments"><span class="quick-symbol"
                                                                            aria-hidden="true">▤</span>
            <h2>Quản lý lịch hẹn</h2>
            <p>Tra cứu lịch khám, theo dõi trạng thái và xem thông tin từng lượt hẹn.</p><span class="quick-action">Mở danh sách <span
              aria-hidden="true">→</span></span></a>
        }
        <a class="quick-card" routerLink="/management/account"><span class="quick-symbol" aria-hidden="true">○</span>
          <h2>Tài khoản của tôi</h2>
          <p>Xem thông tin cá nhân và vai trò được cấp trong hệ thống.</p><span class="quick-action">Xem tài khoản <span
            aria-hidden="true">→</span></span></a>
      </div>
    </section>
    @if (!access.can('appointments:read')) {
      <aside class="notice">Để nhận lịch khám được phân công, vui lòng liên hệ bộ phận điều phối. Tra cứu lịch cá nhân
        trực tuyến hiện chưa khả dụng.
      </aside>
    }
  `
})
export class ManagementWorkspace {
  readonly access = inject(ManagementAccessService);
}
