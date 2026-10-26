import { AbstractControl, Validators } from '@angular/forms';

export function userPhoneValidator(control: AbstractControl) {
  const phone = String(control.value ?? '').trim();
  return !phone || /^(0|\+84)[0-9]{9}$/.test(phone) ? null : { phone: true };
}
export function userEmailValidator(control: AbstractControl) {
  return Validators.email({ value: String(control.value ?? '').trim() } as AbstractControl);
}
export function userUsernameValidator(control: AbstractControl) {
  return /^[a-zA-Z0-9._]{4,100}$/.test(String(control.value ?? '').trim()) ? null : { username: true };
}
