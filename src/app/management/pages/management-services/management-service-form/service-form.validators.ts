import { AbstractControl, ValidationErrors } from '@angular/forms';

export function servicePriceValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === '') return null; // Required is checked separately.
  return typeof value === 'number' && Number.isFinite(value) && /^\d{1,13}(\.\d{1,2})?$/.test(String(value))
    ? null : { servicePrice: true };
}
export function serviceDurationValidator(control: AbstractControl): ValidationErrors | null {
  if (control.value === null || control.value === '') return null;
  return Number.isInteger(control.value) && control.value >= 1 && control.value <= 2147483647
    ? null : { serviceDuration: true };
}
