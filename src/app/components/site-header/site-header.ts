import { afterNextRender, Component, computed, DestroyRef, ElementRef, HostListener, inject, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { PatientService } from '../../services/patient/patient.service';

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
})
export class SiteHeader {
  private readonly auth = inject(AuthService);
  private readonly patients = inject(PatientService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  readonly displayName = input('');
  readonly phone = input('1900.888.866');
  readonly address = input('Số 78, đường Giải Phóng, phường Kim Liên, Thành phố Hà Nội');
  readonly authenticated = signal(false);
  readonly accountName = signal('Bạn');
  readonly resolvedName = computed(() => this.patients.currentProfile()?.fullName || this.displayName() || this.accountName());
  readonly mobileOpen = signal(false);
  readonly accountOpen = signal(false);
  readonly loggingOut = signal(false);
  readonly logoutError = signal('');
  readonly activeOptions = { paths: 'exact', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'exact' } as const;

  constructor() {
    afterNextRender(() => {
      this.authenticated.set(this.auth.isAuthenticated());
      if (this.authenticated()) {
        this.patients.ensureMe().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => {} });
      }
      // JWT subject is only used as a display label; authorization stays in the route guard/backend.
      try {
        const payload = this.auth.getToken()?.split('.')[1];
        if (!payload) return;
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), c => c.charCodeAt(0));
        const subject = JSON.parse(new TextDecoder().decode(bytes)).sub;
        if (typeof subject === 'string' && subject.trim()) this.accountName.set(subject.slice(0, 100));
      } catch { /* A missing display name does not affect the authenticated session. */ }
    });
  }

  closeMenus(): void { this.mobileOpen.set(false); this.accountOpen.set(false); }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent): void {
    if (!this.element.nativeElement.contains(event.target as Node)) this.closeMenus();
  }

  @HostListener('keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent): void {
    if (this.accountOpen()) {
      this.accountOpen.set(false);
      this.element.nativeElement.querySelector<HTMLButtonElement>('.account-trigger')?.focus();
    } else if (this.mobileOpen()) {
      this.mobileOpen.set(false);
      this.element.nativeElement.querySelector<HTMLButtonElement>('.menu-toggle')?.focus();
    }
    event.stopPropagation();
  }

  logout(): void {
    if (this.loggingOut()) return;
    this.logoutError.set('');
    this.loggingOut.set(true);
    this.auth.logout().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loggingOut.set(false)))
      .subscribe({ error: () => this.logoutError.set('Chưa thể đăng xuất. Vui lòng thử lại.') });
  }
}
