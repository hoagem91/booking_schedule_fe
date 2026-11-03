import { AbstractControl } from '@angular/forms';
import { ManagementUser } from '../../models/management.models';
import { AdminDoctor } from '../../models/admin-doctor.model';
import { AdminUser } from '../../models/user.model';
import { userIsAdmin } from '../management-users/user-policy';

export function doctorExperienceValidator(control: AbstractControl) {
  const value = control.value;
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 70 ? null : { experience: true };
}
export function doctorUserEligibility(actor: ManagementUser | null, user: AdminUser): string | null {
  if (!userIsAdmin(actor)) return 'Bạn không có quyền tạo hồ sơ bác sĩ.';
  if (user.status !== 'ACTIVE') return 'Tài khoản đã ngừng hoạt động.';
  if (user.doctorId != null) return 'Tài khoản đã có hồ sơ bác sĩ.';
  if (user.roles.some(role => role.name === 'SUPER_ADMIN') && !actor!.roles.some(role => role.name === 'SUPER_ADMIN')) return 'Chỉ quản trị hệ thống được tạo hồ sơ cho tài khoản SUPER_ADMIN.';
  return null;
}
export function doctorCanEdit(actor: ManagementUser | null, doctor: AdminDoctor): boolean {
  return userIsAdmin(actor) && !!(doctor.capabilities?.canEditProfile || doctor.capabilities?.canEditAccount);
}
export function doctorCanChangeAccountStatus(actor: ManagementUser | null, doctor: AdminDoctor): boolean {
  return userIsAdmin(actor) && doctor.userId !== actor?.id && !!doctor.capabilities?.canDeactivateAccount;
}
