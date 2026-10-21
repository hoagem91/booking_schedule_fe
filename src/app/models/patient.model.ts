import { Gender } from './auth.model';

export interface PatientProfile {
  id: number;
  patientCode: string;
  userId: number;
  username: string;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  address: string | null;
  healthInsuranceCode: string | null;
  createdAt: string;
  updatedAt: string;
}

// Identity/contact fields belong to User and are not accepted by PatientUpdateRequest.
export interface PatientUpdateRequest {
  dateOfBirth?: string;
  gender?: Gender;
  address?: string;
  healthInsuranceCode?: string;
}
