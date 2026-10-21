import { Component, inject } from '@angular/core';
import { ManagementAccessService } from '../services/management-access.service';

@Component({
  standalone: true, styleUrl: './management-ui.css',
  template: `
    <div class="page-header">
      <div><p class="eyebrow">TÀI KHOẢN NỘI BỘ</p>
        <h1>Tài khoản của tôi</h1>
        <p class="subtitle">Thông tin tài khoản và vai trò đang được sử dụng.</p></div>
    </div>
    @if (access.user(); as user) {
      <section class="panel" aria-labelledby="account-title">
        <div class="panel-heading"><h2 id="account-title">Thông tin cá nhân</h2><span class="status confirmed">Đang hoạt động</span>
        </div>
        <div class="panel-body detail-grid">
          <dl>
            <div>
              <dt>Họ và tên</dt>
              <dd>{{ user.fullName || 'Chưa cập nhật' }}</dd>
            </div>
            <div>
              <dt>Tên đăng nhập</dt>
              <dd>{{ user.username }}</dd>
            </div>
            <div>
              <dt>Vai trò</dt>
              <dd>{{ access.roleText() }}</dd>
            </div>
          </dl>
          <dl>
            <div>
              <dt>Email</dt>
              <dd>{{ user.email || 'Chưa cập nhật' }}</dd>
            </div>
            <div>
              <dt>Số điện thoại</dt>
              <dd>{{ user.phone || 'Chưa cập nhật' }}</dd>
            </div>
            <div>
              <dt>Mã tài khoản</dt>
              <dd>#{{ user.id }}</dd>
            </div>
          </dl>
        </div>
      </section>
    }
    <aside class="notice">Liên hệ quản trị viên khi cần điều chỉnh thông tin tài khoản, thay đổi quyền hoặc hỗ trợ khôi
      phục mật khẩu.
    </aside>
  `
})
export class ManagementAccount {
  readonly access = inject(ManagementAccessService);
}
