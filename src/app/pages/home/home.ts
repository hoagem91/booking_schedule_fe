import { Component } from '@angular/core';
import { SiteHeader } from '../../components/site-header/site-header';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true, selector: 'app-home', imports: [SiteHeader, RouterLink],
  template: `
    <app-site-header />
    <main><span class="mark" aria-hidden="true">+</span>
      <h1>Đăng nhập thành công</h1>
      <p>Chào mừng bạn đến với hệ thống đặt lịch khám.</p>
      <p>Trang chức năng đặt lịch sẽ được bổ sung ở bước tiếp theo.</p>
      <section id="account" aria-labelledby="account-heading"><h2 id="account-heading">Tài khoản của bạn</h2>
        <p><a routerLink="/profile">Xem và cập nhật hồ sơ cá nhân</a></p>
      </section>
    </main>`,
  styles: [`main {
    max-width: 600px;
    margin: 8vh auto;
    padding: 32px;
    text-align: center;
  }

  h1, h2 {
    color: #173b42;
  }

  h2 {
    font-size: 20px;
  }

  p {
    color: #70858a;
  }

  .mark {
    color: #168341;
    font-size: 56px;
  }

  section {
    margin-top: 36px;
    padding-top: 24px;
    border-top: 1px solid #e2ebe5;
    scroll-margin-top: 24px;
  }`]
})
export class HomeComponent {
}
