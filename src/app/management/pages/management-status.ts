import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { safeManagementReturnUrl } from '../management.models';
import { ManagementAccessService } from '../services/management-access.service';

@Component({
  standalone: true, imports: [RouterLink],
  template: `
    <main><a class="brand" routerLink="/portal">✚ Booking Schedule</a>
      <section aria-labelledby="status-title"><span class="code">{{ code }}</span>
        <h1 id="status-title">{{ title }}</h1>
        <p>{{ message }}</p>
        <div class="actions">
          @if (recovery) {
            <a class="primary" [routerLink]="retryUrl">Thử xác minh lại</a><a routerLink="/management/login">Đăng nhập
              nội bộ</a>
          } @else {
            <a class="primary"
               [routerLink]="access.can('workspace:view') ? '/management' : '/management/login'">{{ access.can('workspace:view') ? 'Về không gian làm việc' : 'Đăng nhập nội bộ' }}</a>
            <a routerLink="/portal">Cổng thông tin</a>
          }
        </div>
      </section>
    </main>`,
  styles: [`:host {
    display: block;
    color: #254536
  }

  main {
    min-height: 100dvh;
    background: #f4f7f3;
    padding: 32px
  }

  .brand {
    color: #24654c;
    font-weight: 650;
    text-decoration: none
  }

  section {
    max-width: 540px;
    margin: 15vh auto 0;
    text-align: center
  }

  .code {
    color: #8aac7d;
    font-size: 64px;
    font-weight: 300;
    letter-spacing: -3px
  }

  h1 {
    font-size: 28px;
    line-height: 1.3;
    letter-spacing: -.7px;
    margin: 20px 0 14px
  }

  p {
    font-size: 14px;
    line-height: 1.8;
    color: #788b74
  }

  .actions {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 30px
  }

  .actions a {
    display: inline-block;
    text-decoration: none;
    border: 1px solid #cfddc9;
    border-radius: 7px;
    padding: 12px 18px;
    font-size: 12px;
    color: #47713e;
    background: white
  }

  .actions a.primary {
    background: #316b4e;
    color: white;
    border-color: #316b4e
  }

  a {
    outline-offset: 4px
  }

  @media (max-width: 500px) {
    main {
      padding: 24px
    }

    h1 {
      font-size: 24px
    }

    section {
      margin-top: 12vh
    }
  }`]
})
export class ManagementStatus {
  readonly access = inject(ManagementAccessService);
  private readonly route = inject(ActivatedRoute);
  readonly recovery = this.route.snapshot.data['kind'] === 'recovery';
  readonly forbidden = this.route.snapshot.data['kind'] === 'forbidden';
  readonly code = this.recovery ? '…' : this.forbidden ? '403' : '404';
  readonly title = this.recovery ? 'Chưa thể xác minh tài khoản' : this.forbidden ? 'Bạn không có quyền truy cập' : 'Không tìm thấy trang';
  readonly message = this.recovery ? 'Không thể tải thông tin quyền truy cập. Vui lòng kiểm tra kết nối và thử lại.' : this.forbidden ? 'Tài khoản hiện tại không được phép truy cập chức năng này. Liên hệ quản trị viên nếu bạn cần hỗ trợ.' : 'Đường dẫn có thể đã thay đổi hoặc không tồn tại. Bạn có thể trở về không gian làm việc.';
  readonly retryUrl = safeManagementReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')) ?? '/management';
}
