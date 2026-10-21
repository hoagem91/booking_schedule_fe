import { afterNextRender, Component, DestroyRef, inject, signal } from '@angular/core';

import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { PatientService } from '../../../services/patient.service';
import { PatientProfile, PatientUpdateRequest } from '../../../models/patient.model';
import { Gender } from '../../../models/auth.model';

const birthDateValidator: ValidatorFn = (control: AbstractControl) => {
  const value = control.value as string;
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime())
    || date.getFullYear() !== Number(value.slice(0, 4))
    || date.getMonth() + 1 !== Number(value.slice(5, 7))
    || date.getDate() !== Number(value.slice(8, 10))) return { invalidDate: true };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today ? { futureDate: true } : null;
};

@Component({
  selector: 'app-profile-details', standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile-details.html', styleUrl: './profile-details.css',
})
export class ProfileDetails {
  readonly insuranceOnly = inject(ActivatedRoute).snapshot.data['section'] === 'insurance';
  private readonly patients = inject(PatientService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  readonly profile = signal<PatientProfile | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal('');
  readonly saveError = signal('');
  readonly success = signal('');
  readonly today = (() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  })();
  readonly form = this.fb.nonNullable.group({
    dateOfBirth: ['', this.insuranceOnly ? [] : [Validators.required, birthDateValidator]],
    gender: ['', this.insuranceOnly ? [] : [Validators.required, Validators.pattern(/^(MALE|FEMALE|OTHER)$/)]],
    address: ['', [Validators.maxLength(500), Validators.pattern(/\S/)]],
    healthInsuranceCode: ['', [Validators.maxLength(100), Validators.pattern(/\S/)]],
  });

  constructor() { afterNextRender(() => this.load()); }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.patients.ensureMe().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({ next: value => this.applyProfile(value), error: (error: Error) => this.loadError.set(error.message) });
  }

  private applyProfile(value: PatientProfile): void {
    this.profile.set(value);
    this.form.reset({ dateOfBirth: value.dateOfBirth || '', gender: value.gender || '',
      address: value.address || '', healthInsuranceCode: value.healthInsuranceCode || '' });
  }

  cancel(): void {
    const value = this.profile();
    if (!value || this.saving()) return;
    this.applyProfile(value);
    this.saveError.set('');
    this.success.set('');
  }

  genderLabel(value: Gender | null): string {
    return value === 'MALE' ? 'Nam' : value === 'FEMALE' ? 'Nữ' : value === 'OTHER' ? 'Khác' : 'Chưa cập nhật';
  }

  invalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }

  save(): void {
    const previous = this.profile();
    if (this.saving() || !previous || !this.form.dirty) return;
    this.saveError.set('');
    this.success.set('');
    const raw = this.form.getRawValue();
    this.form.patchValue({ address: raw.address.trim(), healthInsuranceCode: raw.healthInsuranceCode.trim() });
    // Backend ignores null and rejects empty strings; do not silently claim an existing value was deleted.
    for (const field of ['address', 'healthInsuranceCode'] as const) {
      if (previous[field] && !this.form.controls[field].value) this.form.controls[field].setErrors({ cannotClear: true });
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const request: PatientUpdateRequest = this.insuranceOnly ? {
      ...(value.healthInsuranceCode ? { healthInsuranceCode: value.healthInsuranceCode } : {}),
    } : {
      dateOfBirth: value.dateOfBirth, gender: value.gender as Gender,
      ...(value.address ? { address: value.address } : {}),
      ...(value.healthInsuranceCode ? { healthInsuranceCode: value.healthInsuranceCode } : {}),
    };
    this.saving.set(true);
    this.patients.updateMe(request).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({ next: profile => {
        this.applyProfile(profile);
        this.success.set('Đã lưu thay đổi hồ sơ của bạn.');
      }, error: (error: Error) => this.saveError.set(error.message) });
  }
}
