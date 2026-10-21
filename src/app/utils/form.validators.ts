import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validator dùng chung cho các trường code.
 * Chỉ cho phép nhập chữ thường (a-z), chữ hoa (A-Z) và số (0-9).
 */
export function codeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Không validate nếu giá trị rỗng (dùng Validators.required riêng nếu cần)
    }
    const pattern = /^[a-zA-Z0-9]+$/;
    const valid = pattern.test(control.value);
    return valid ? null : { invalidCode: true };
  };
}
