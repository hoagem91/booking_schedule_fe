export type InternalRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'DOCTOR';
export type ManagementPermission = 'workspace:view' | 'appointments:read' | 'appointments:update-status' | 'services:read' | 'rooms:read' | 'users:read' | 'patients:read';

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
export const managementNavigation: {
  label: string;
  path: string;
  symbol: string;
  permission: ManagementPermission;
}[] = [
  {
    label: 'Không gian làm việc',
    path: '/management/dashboard',
    symbol: 'dashboard',
    permission: 'workspace:view'
  },
  {
    label: 'Quản lý lịch hẹn',
    path: '/management/appointments',
    symbol: 'calendar',
    permission: 'appointments:read'
  },
  {
    label: 'Xử lý lịch hẹn',
    path: '/management/appointments/review',
    symbol: 'audit',
    permission: 'appointments:update-status'
  },
  {
    label: 'Tài khoản của tôi',
    path: '/management/account',
    symbol: 'user',
    permission: 'workspace:view'
  },
  {
    label: 'Lịch làm của bác sĩ',
    path: '/management/doctor-schedule',
    symbol: 'schedule',
    permission: 'workspace:view'
  },
  {
    label: 'Quản lý chuyên khoa',
    path: '/management/specialty',
    symbol: 'medicine-box',
    permission: 'workspace:view'
  },
  {
    label: 'Quản lý dịch vụ',
    path: '/management/services',
    symbol: 'appstore',
    permission: 'services:read'
  },
  {
    label: 'Quản lý phòng khám',
    path: '/management/rooms',
    symbol: 'home',
    permission: 'rooms:read'
  },
  { label: 'Hồ sơ bệnh nhân', path: '/management/patients', symbol: 'user', permission: 'patients:read' },
  {
    label: 'Quản lý tài khoản',
    path: '/management/users',
    symbol: 'team',
    permission: 'users:read'
  }
];

export function internalRoles(user: ManagementUser | null): InternalRole[] {
  return user?.roles.map(role => role.name).filter((name): name is InternalRole => Object.hasOwn(roleLabels, name)) ?? [];
}

export function hasManagementPermission(user: ManagementUser | null, permission: ManagementPermission): boolean {
  if (user?.status !== 'ACTIVE') return false;
  const roles = internalRoles(user);
  if (permission === 'workspace:view') return roles.length > 0;
  if (permission === 'users:read' || permission === 'patients:read') return roles.some(role => ['SUPER_ADMIN', 'ADMIN'].includes(role));
  return ['appointments:read', 'appointments:update-status', 'services:read', 'rooms:read'].includes(permission)
    && roles.some(role => ['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(role));
}

export function managementHome(user: ManagementUser | null): string {
  if (!hasManagementPermission(user, 'workspace:view')) return '/403';
  return internalRoles(user).includes('STAFF') && !internalRoles(user).some(role => ['ADMIN', 'SUPER_ADMIN'].includes(role))
    ? '/management/appointments' : '/management/dashboard';
}

export function safeManagementReturnUrl(url: string | null | undefined): string | null {
  // Reject external URLs, login loops, recovery pages and unimplemented routes.
  if (!url || !/^\/management\/(dashboard|account|services|rooms|users|patients|appointments(?:\/review|\/[1-9]\d*)?)(?:\?[^#]*)?$/.test(url)) return null;
  return url;
}
