import { afterNextRender, Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true, selector: 'app-login', templateUrl: './login.html', styleUrl: './login.css',
  imports: [ReactiveFormsModule, NzFormModule, NzInputModule, NzButtonModule, NzCheckboxModule, NzAlertModule, RouterLink]
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rememberKey = 'booking-schedule-remember-account';
  readonly loginForm = inject(FormBuilder).nonNullable.group({
    username: ['', [Validators.required, Validators.pattern(/\S/)]],
    password: ['', Validators.required], remember: [true],
  });
  passwordVisible = false;
  isLoading = false;
  errorMessage = '';
  showPasswordHelp = false;

  constructor() {
    afterNextRender(() => {
      if (this.auth.isAuthenticated()) {
        void this.router.navigateByUrl('/home');
        return;
      }
      try {
        const account = JSON.parse(localStorage.getItem(this.rememberKey) ?? 'null');
        if (typeof account?.username === 'string') this.loginForm.patchValue({ username: account.username });
      } catch { /* Storage is optional. */ }
    });
  }

  submitForm(): void {
    if (this.isLoading) return;
    this.errorMessage = '';
    if (this.loginForm.invalid) {
      Object.values(this.loginForm.controls).forEach(control => {
        control.markAsDirty(); control.markAsTouched();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }
    const { username, password, remember } = this.loginForm.getRawValue();
    this.isLoading = true;
    this.auth.login({ username: username.trim(), password })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.isLoading = false))
      .subscribe({
        next: () => {
          try {
            if (remember) localStorage.setItem(this.rememberKey, JSON.stringify({ username: username.trim() }));
            else localStorage.removeItem(this.rememberKey);
          } catch { /* Remembering an account is optional. */ }
          void this.router.navigateByUrl('/home');
        },
        error: (error: Error) => this.errorMessage = error.message,
      });
  }
}
