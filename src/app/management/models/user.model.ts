export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'DOCTOR' | 'PATIENT';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type UserEditorMode =
  'create'
  | 'edit'
  | 'view'
  | 'status'
  | 'roles'
  | 'password'
  | 'deactivate'
  | 'self-password';

export interface AdminRole {
  id: number;
  name: UserRole;
}

export interface UserCapabilities {
  self: boolean;
  lastActiveSuperAdmin: boolean;
  canEdit: boolean;
  canChangeStatus: boolean;
  canChangeRoles: boolean;
  canResetPassword: boolean;
  canDeactivate: boolean;
}

export interface AdminUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  roles: AdminRole[];
  doctorId: number | null;
  patientId: number | null;
  capabilities: UserCapabilities | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUserCreateRequest {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone?: string;
  roles: UserRole[];
}

export interface AdminUserUpdateRequest {
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface AdminUserSearchRequest {
  keyword: string | null;
  role: UserRole | null;
  status: UserStatus | null;
}

export interface UserDeactivateResponse {
  id: number;
  action: 'DEACTIVATED';
  status: 'INACTIVE';
  message: string;
}

export interface UserAuditResponse {
  id: number;
  actorUserId: number;
  targetUserId: number;
  action: string;
  passwordChanged: boolean;
  beforeState: string | null;
  afterState: string | null;
  createdAt: string;
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Quản trị hệ thống', ADMIN: 'Quản trị viên', STAFF: 'Nhân viên', DOCTOR: 'Bác sĩ', PATIENT: 'Bệnh nhân'
};
export const USER_EDITOR_TITLES: Record<UserEditorMode, string> = {
  create: 'Tạo tài khoản',
  edit: 'Cập nhật tài khoản',
  view: 'Chi tiết tài khoản',
  status: 'Khóa / mở tài khoản',
  roles: 'Thay đổi vai trò',
  password: 'Đặt lại mật khẩu',
  deactivate: 'Vô hiệu hóa tài khoản',
  'self-password': 'Đổi mật khẩu cá nhân'
};
