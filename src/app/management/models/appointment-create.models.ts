import { CreateAppointmentRequest } from '../../models/booking.model';
export interface AdminAppointmentCreateRequest extends CreateAppointmentRequest {
  patientId: number;
  promotionId?: number;
}
export interface AppointmentDoctorOption {
  id: number;
  doctorCode: string;
  fullName: string;
  specialtyId: number | null;
  specialtyName: string;
  status: string;
}
