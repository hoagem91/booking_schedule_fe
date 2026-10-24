import { AppointmentStatus } from '../../models/appointment.model';

export type StatusCountMap = Partial<Record<AppointmentStatus, number>>;

export interface AppointmentSummaryDoctor {
  doctorId: number;
  doctorCode: string;
  doctorName: string;
  total: number;
  statusCounts: StatusCountMap;
}

export interface AppointmentSummaryResult {
  total: number;
  statusCounts: StatusCountMap;
  doctors: AppointmentSummaryDoctor[];
}

export interface AppointmentSummaryRequest {
  doctorKeyword?: string | null;
  keyword?: string | null;
  doctorId?: number | null;
  patientId?: number | null;
  status?: AppointmentStatus | null;
  fromDate?: string | null;
  toDate?: string | null;
}
