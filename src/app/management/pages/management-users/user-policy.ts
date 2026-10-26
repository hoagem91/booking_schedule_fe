import { ManagementUser } from '../../models/management.models';
import { AdminRole, AdminUser, UserEditorMode, UserRole } from '../../models/user.model';

export function userIsAdmin(actor: ManagementUser | null): boolean {
  return actor?.status === 'ACTIVE' && actor.roles.some(role => ['ADMIN', 'SUPER_ADMIN'].includes(role.name)) || false;
}
export function userActionAllowed(actor: ManagementUser | null, target: AdminUser, mode: UserEditorMode): boolean {
  if (!userIsAdmin(actor)) return false;
  if (mode === 'view') return true;
  const self = actor!.id === target.id || !!target.capabilities?.self;
  if (target.roles.some(role => role.name === 'SUPER_ADMIN') && !actor!.roles.some(role => role.name === 'SUPER_ADMIN')) return false;
  const cap = target.capabilities;
  if (!cap) return false;
  if (mode === 'edit') return cap.canEdit;
  if (mode === 'roles') return cap.canChangeRoles;
  if (mode === 'password') return cap.canResetPassword && !self;
  if (mode === 'status') return cap.canChangeStatus && !self && !cap.lastActiveSuperAdmin;
  if (mode === 'deactivate') return cap.canDeactivate && !self && !cap.lastActiveSuperAdmin;
  return false;
}
export function assignableUserRoles(catalog: AdminRole[], actor: ManagementUser | null, target: AdminUser | null): AdminRole[] {
  const superAdmin = actor?.roles.some(role => role.name === 'SUPER_ADMIN');
  return catalog.filter(role => (['ADMIN', 'STAFF'].includes(role.name)
    || (role.name === 'SUPER_ADMIN' && superAdmin)
    || (role.name === 'DOCTOR' && !!target?.doctorId) || (role.name === 'PATIENT' && !!target?.patientId)));
}
export function userRolesError(roles: UserRole[], catalog: AdminRole[], actor: ManagementUser | null, target: AdminUser | null): string | null {
  const options = assignableUserRoles(catalog, actor, target);
  if (!roles.length || roles.some(role => !options.some(item => item.name === role))) return 'Vui lòng chọn vai trò được phép cấp và có trong danh mục.';
  if ((target?.doctorId && !roles.includes('DOCTOR')) || (target?.patientId && !roles.includes('PATIENT'))) return 'Không được bỏ vai trò gắn với hồ sơ Bác sĩ/Bệnh nhân.';
  if (target?.capabilities?.lastActiveSuperAdmin && !roles.includes('SUPER_ADMIN')) return 'Cần giữ vai trò SUPER_ADMIN của quản trị hệ thống cuối cùng.';
  if (target && (target.id === actor?.id || target.capabilities?.self) && !roles.some(role => ['ADMIN', 'SUPER_ADMIN'].includes(role))) return 'Cần giữ vai trò ADMIN hoặc SUPER_ADMIN cho chính mình.';
  return null;
}
