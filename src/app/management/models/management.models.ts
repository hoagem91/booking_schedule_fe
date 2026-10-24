export type InternalRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'DOCTOR';
export type ManagementPermission = 'workspace:view' | 'appointments:read' | 'appointments:update-status';

// Matches UserResponse / RoleResponse from GET /users/me.
export interface ManagementUser {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: string;
  roles: { id: number; name: string }[];
}

export const roleLabels: Record<InternalRole, string> = {
  SUPER_ADMIN: 'Quản trị hệ thống', ADMIN: 'Quản trị viên', STAFF: 'Nhân viên', DOCTOR: 'Bác sĩ',
};

// Only expose features that have an implemented UI and a supported backend contract.
export const managementNavigation: { label: string; path: string; symbol: string; permission: ManagementPermission }[] = [
  { label: 'Không gian làm việc', path: '/management/dashboard', symbol: '▦', permission: 'workspace:view' },
  { label: 'Quản lý lịch hẹn', path: '/management/appointments', symbol: '▤', permission: 'appointments:read' },
  { label: 'Xử lý lịch hẹn', path: '/management/appointments/review', symbol: '\u2713', permission: 'appointments:update-status' },
  { label: 'Tài khoản của tôi', path: '/management/account', symbol: '○', permission: 'workspace:view' },
  { label: 'Lịch làm của bác sĩ', path: '/management/doctor-schedule', symbol: '○', permission: 'workspace:view' },
];

export function internalRoles(user: ManagementUser | null): InternalRole[] {
  return user?.roles.map(role => role.name).filter((name): name is InternalRole => Object.hasOwn(roleLabels, name)) ?? [];
}

export function hasManagementPermission(user: ManagementUser | null, permission: ManagementPermission): boolean {
  if (user?.status !== 'ACTIVE') return false;
  const roles = internalRoles(user);
  if (permission === 'workspace:view') return roles.length > 0;
  return ['appointments:read', 'appointments:update-status'].includes(permission)
    && roles.some(role => ['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(role));
}

export function managementHome(user: ManagementUser | null): string {
  if (!hasManagementPermission(user, 'workspace:view')) return '/403';
  return internalRoles(user).includes('STAFF') && !internalRoles(user).some(role => ['ADMIN', 'SUPER_ADMIN'].includes(role))
    ? '/management/appointments' : '/management/dashboard';
}

export function safeManagementReturnUrl(url: string | null | undefined): string | null {
  // Reject external URLs, login loops, recovery pages and unimplemented routes.
  if (!url || !/^\/management\/(dashboard|account|appointments(?:\/review|\/[1-9]\d*)?)(?:\?[^#]*)?$/.test(url)) return null;
  return url;
}
