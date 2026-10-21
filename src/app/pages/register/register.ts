import { Component, DestroyRef, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { AuthService } from '../../services/auth.service';
import { Gender, RegisterRequest } from '../../models/auth.model';
import { NzDatePickerComponent } from 'ng-zorro-antd/date-picker';

const passwordsMatch: ValidatorFn = (form: AbstractControl): ValidationErrors | null =>
  form.get('password')?.value === form.get('confirmPassword')?.value ? null : { passwordMismatch: true };

const validBirthDate: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value) return null; // Required is handled separately.
  const date = control.value;
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return { invalidDate: true };
  const now = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    > new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() ? { futureDate: true } : null;
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NzAlertModule, NzFormModule, NzInputModule, NzButtonModule, NzDatePickerComponent],
  templateUrl: './register.html',
  styleUrls: ['../login/login.css', './register.css'],
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly disableFutureDate = (date: Date): boolean => validBirthDate({ value: date } as AbstractControl) !== null;
  readonly saveForm = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(100), Validators.pattern(/^[a-zA-Z0-9_.]+$/)]],
    password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100), Validators.pattern(/\S/)]],
    confirmPassword: ['', Validators.required],
    fullName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.pattern(/^(0|\+84)[0-9]{9}$/)],
    dateOfBirth: this.fb.control<Date | null>(null, [Validators.required, validBirthDate]),
    gender: ['', [Validators.required, Validators.pattern(/^(MALE|FEMALE|OTHER)$/)]],
  }, { validators: passwordsMatch });

  submitForm(): void {
    if (this.isLoading()) return;
    this.errorMessage.set('');
    const raw = this.saveForm.getRawValue();
    this.saveForm.patchValue({ username: raw.username.trim(), fullName: raw.fullName.trim(),
      email: raw.email.trim(), phone: raw.phone.trim() });
    if (this.saveForm.invalid) {
      Object.values(this.saveForm.controls).forEach(control => {
        control.markAsDirty();
        control.markAsTouched();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }
    const { confirmPassword, gender, phone, dateOfBirth, ...values } = this.saveForm.getRawValue();
    if (!dateOfBirth) return;
    // Serialize the local calendar date, without a UTC conversion that could shift the day.
    const birthDate = `${dateOfBirth.getFullYear()}-${String(dateOfBirth.getMonth() + 1).padStart(2, '0')}-${String(dateOfBirth.getDate()).padStart(2, '0')}`;
    const request: RegisterRequest = { ...values, dateOfBirth: birthDate, gender: gender as Gender, ...(phone ? { phone } : {}) };
    this.isLoading.set(true);
    this.authService.register(request)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => { void this.router.navigateByUrl('/login'); },
        error: (error: Error) => this.errorMessage.set(error.message),
      });
  }
}
