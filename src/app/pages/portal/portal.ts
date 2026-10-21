import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteHeader } from '../../components/site-header/site-header';

@Component({
  selector: 'app-portal', standalone: true, imports: [SiteHeader, RouterLink],
  template: `<app-site-header />
    <main>
      <div class="breadcrumb">Trang chủ <span>/</span> Cổng thông tin</div>
      <section class="welcome" aria-labelledby="portal-heading">
        <span class="eyebrow">BOOKING SCHEDULE</span>
        <h1 id="portal-heading">Chăm sóc sức khỏe,<br>khởi đầu từ sự chủ động.</h1>
        <p>Chào mừng bạn đến với hệ thống đặt lịch khám.<br>Đăng nhập để tiếp tục hành trình chăm sóc sức khỏe của bạn.</p>
        <a routerLink="/home">Truy cập tài khoản <span aria-hidden="true">→</span></a>
      </section>
    </main>`,
  styles: [`:host { display: block; min-height: 100dvh; background: #f7faf8; }
    main { width: min(1200px, calc(100% - 64px)); margin-inline: auto; padding: 28px 0 80px; }
    .breadcrumb { color: #839189; font-size: 12px; } .breadcrumb span { margin: 0 10px; color: #bbc6be; }
    .welcome { padding: 70px 0; } .eyebrow { color: #168341; font-size: 11px; font-weight: 700; letter-spacing: 2px; }
    h1 { margin: 20px 0; color: #254333; font-size: clamp(30px, 3.5vw, 46px); line-height: 1.25; font-weight: 600; letter-spacing: -1.3px; }
    p { color: #74877a; font-size: 15px; line-height: 1.9; margin: 0 0 28px; }
    .welcome a { display: inline-flex; gap: 24px; padding: 13px 20px; border-radius: 6px; background: #168341; color: #fff; font-size: 14px; font-weight: 600; text-decoration: none; }
    .welcome a:hover { background: #107235; } a:focus-visible { outline: 2px solid #c88b19; outline-offset: 4px; }
    @media(max-width:700px) { main { width: calc(100% - 32px); padding-top: 24px; } .welcome { padding-top: 44px; } }`],
})
export class Portal {}
