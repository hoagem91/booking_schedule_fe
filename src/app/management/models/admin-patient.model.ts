import { Gender } from '../../models/auth.model';
import { PatientProfile } from '../../models/patient.model';
import { AdminUserUpdateRequest } from './user.model';

export interface PatientCapabilities {
  canEditProfile: boolean;
  canEditAccount: boolean;
  canDeactivateAccount: boolean;
  canDeleteProfile: false;
}
export interface AdminPatient extends PatientProfile {
  userStatus: 'ACTIVE' | 'INACTIVE';
  capabilities: PatientCapabilities | null;
}
export interface PatientNewUser {
  username: string; password: string; fullName: string; email: string; phone?: string;
}
export type AdminPatientCreateRequest = {
  dateOfBirth: string; gender: Gender; address?: string; healthInsuranceCode?: string;
} & ({ userId: number; user?: never } | { user: PatientNewUser; userId?: never });
export interface AdminPatientUpdateRequest {
  dateOfBirth?: string; gender?: Gender; address?: string; healthInsuranceCode?: string;
  clearAddress?: boolean; clearHealthInsuranceCode?: boolean;
  account?: AdminUserUpdateRequest;
}
export interface AdminPatientSearchRequest {
  keyword: string | null; gender: Gender | null; userStatus: 'ACTIVE' | 'INACTIVE' | null;
  dateOfBirthFrom: string | null; dateOfBirthTo: string | null;
}
export interface PatientAuditResponse {
  id: number; actorUserId: number; patientId: number;
  action: 'CREATE' | 'UPDATE' | 'SELF_CREATE' | 'SELF_UPDATE' | 'SELF_REGISTER';
  changedFields: string[]; createdAt: string;
}
export const PATIENT_GENDERS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }, { value: 'OTHER', label: 'Khác' },
];
