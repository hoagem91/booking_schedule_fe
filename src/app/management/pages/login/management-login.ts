import { afterNextRender, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, switchMap } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ManagementAccessService, managementError } from '../../services/management-access.service';
import { hasManagementPermission, managementHome, safeManagementReturnUrl } from '../../models/management.models';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './management-login.html', styleUrl: './management-login.css',
})
export class ManagementLogin {
  private readonly auth = inject(AuthService);
  private readonly access = inject(ManagementAccessService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly denied = signal(false);
  readonly passwordVisible = signal(false);
  readonly help = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', [Validators.required, Validators.pattern(/\S/)]],
    password: ['', Validators.required],
  });

  constructor() {
    afterNextRender(() => { if (this.auth.isAuthenticated()) this.verifyExistingSession(); });
  }

  private destination(): string {
    return safeManagementReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')) ?? managementHome(this.access.user());
  }

  private enter(): void {
    if (!hasManagementPermission(this.access.user(), 'workspace:view')) {
      this.auth.setLoginArea('patient');
      this.denied.set(true);
      this.error.set('Tài khoản này không có quyền truy cập khu vực nội bộ. Bạn có thể trở về trang bệnh nhân hoặc dùng tài khoản khác.');
      return;
    }
    this.auth.setLoginArea('management');
    void this.router.navigateByUrl(this.destination());
  }

  verifyExistingSession(): void {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.denied.set(false);
    this.access.load(true).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false)))
      .subscribe({ next: () => this.enter(), error: error => this.error.set(managementError(error)) });
  }

  hasSession(): boolean { return this.auth.isAuthenticated(); }

  submit(): void {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true); this.error.set(''); this.denied.set(false);
    this.access.reset();
    const { username, password } = this.form.getRawValue();
    this.auth.login({ username: username.trim(), password }, 'management').pipe(
      switchMap(() => this.access.load(true)),
      takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false)),
    ).subscribe({ next: () => { this.form.controls.password.reset(); this.enter(); }, error: error => this.error.set(managementError(error)) });
  }
}
