import { AdminUserUpdateRequest, UserStatus } from './user.model';

export interface DoctorCapabilities {
  canEditProfile: boolean;
  canEditAccount: boolean;
  canChangeStatus: boolean;
  canDeactivateProfile: boolean;
  canDeactivateAccount: boolean;
  canDeleteProfile: false;
}
export interface AdminDoctor {
  id: number; userId: number; doctorCode: string;
  username: string; fullName: string; email: string; phone: string | null;
  specialtyId: number; specialtyName: string; specialtyStatus: UserStatus;
  position: string; experienceYears: number; description: string | null;
  status: UserStatus; userStatus: UserStatus;
  capabilities: DoctorCapabilities | null;
  createdAt: string; updatedAt: string;
}
export interface DoctorNewUser {
  username: string; password: string; fullName: string; email: string; phone?: string;
}
export type AdminDoctorCreateRequest = {
  specialtyId: number; doctorCode?: string; position: string; experienceYears: number; description?: string;
} & ({ userId: number; user?: never } | { user: DoctorNewUser; userId?: never });
export interface AdminDoctorUpdateRequest {
  specialtyId?: number; doctorCode?: string; position?: string; experienceYears?: number;
  description?: string; clearDescription?: boolean; status?: UserStatus;
  account?: AdminUserUpdateRequest;
}
export interface AdminDoctorSearchRequest {
  keyword: string | null; specialtyId: number | null; status: UserStatus | null; userStatus: UserStatus | null;
}
export interface DoctorAuditResponse {
  id: number; actorUserId: number; doctorId: number;
  action: 'CREATE' | 'UPDATE' | 'STATUS_CHANGED' | 'DEACTIVATED';
  changedFields: string[]; createdAt: string;
}
export interface DoctorDeactivateResponse {
  id: number; action: 'DEACTIVATED'; status: 'INACTIVE'; message: string;
}
export interface DoctorSpecialtyOption { id: number; name: string; status: string; }
