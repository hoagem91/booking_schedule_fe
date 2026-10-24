export type ServiceStatus = 'ACTIVE' | 'INACTIVE';
export interface ServiceResponse {
  id: number;
  code: string;
  name: string;
  specialtyId: number | null;
  specialtyName: string | null;
  price: number;
  durationMinutes: number;
  description: string | null;
  status: ServiceStatus;
  createdAt?: string;
  updatedAt?: string;
}
export interface ServiceCreateRequest {
  code?: string;
  name: string;
  specialtyId?: number;
  price: number;
  durationMinutes?: number;
  description?: string;
}
export interface ServiceUpdateRequest extends Partial<ServiceCreateRequest> {
  clearSpecialty?: boolean;
  status?: ServiceStatus;
}
export interface ServiceSearchRequest {
  keyword: string | null;
  specialtyId: number | null;
  status: ServiceStatus | null;
}
export interface ServiceDeleteResponse {
  id: number;
  action: 'DELETED' | 'DEACTIVATED';
  status: ServiceStatus | null;
  message: string;
}
export interface ServiceSpecialtyOption { id: number; name: string; status: ServiceStatus; }
