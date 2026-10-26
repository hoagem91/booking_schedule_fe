import { AbstractControl } from '@angular/forms';
import { ManagementUser } from '../../models/management.models';
import { AdminUser } from '../../models/user.model';
import { AdminPatient } from '../../models/admin-patient.model';
import { clinicToday, isCalendarDate } from '../../services/management-appointments.service';
import { userIsAdmin } from '../management-users/user-policy';

export function patientBirthDateValidator(control: AbstractControl) {
  const value = control.value;
  return !value || (typeof value === 'string' && isCalendarDate(value) && value <= clinicToday()) ? null : { birthDate: true };
}
export function patientBirthRangeError(from: string | null, to: string | null): string | null {
  if ([from, to].some(value => value && (!isCalendarDate(value) || value > clinicToday()))) return 'Khoảng ngày sinh phải hợp lệ và không ở tương lai.';
  return from && to && from > to ? 'Ngày sinh bắt đầu phải trước hoặc bằng ngày kết thúc.' : null;
}
export function patientUserEligibility(actor: ManagementUser | null, user: AdminUser): string | null {
  if (!userIsAdmin(actor)) return 'Bạn không có quyền tạo hồ sơ bệnh nhân.';
  if (user.status !== 'ACTIVE') return 'Tài khoản đã ngừng hoạt động.';
  if (user.patientId) return 'Tài khoản đã có hồ sơ bệnh nhân.';
  if (user.roles.some(role => role.name === 'SUPER_ADMIN') && !actor!.roles.some(role => role.name === 'SUPER_ADMIN')) return 'Chỉ quản trị hệ thống được tạo hồ sơ cho tài khoản SUPER_ADMIN.';
  return null;
}
export function patientCanEdit(actor: ManagementUser | null, patient: AdminPatient): boolean {
  return userIsAdmin(actor) && !!(patient.capabilities?.canEditProfile || patient.capabilities?.canEditAccount);
}
export function patientCanChangeAccountStatus(actor: ManagementUser | null, patient: AdminPatient): boolean {
  return userIsAdmin(actor) && patient.userId !== actor?.id && !!patient.capabilities?.canDeactivateAccount;
}
