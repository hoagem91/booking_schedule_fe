import { AppointmentStatus } from '../../models/appointment.model';

export interface DashboardRange { fromDate: string; toDate: string; }
export interface DashboardSummary {
  date: string; timezone: string; appointmentsToday: number; confirmedToday: number;
  completedToday: number; collectedToday: number; pendingAppointments: number;
  reviewRequiredTransactions: number; totalPatients: number; workingDoctorsToday: number;
  activeSpecialties: number; activeServices: number; successfulPaymentsMissingPaidAt: number;
}
export interface DashboardRank { id: number; name: string; count: number; }
export interface DashboardAnalytics extends DashboardRange {
  timezone: string; totalAppointments: number; newlyCreatedAppointments: number;
  statusCounts: Record<AppointmentStatus, number>;
  dailyAppointments: { date: string; count: number }[];
  topSpecialties: DashboardRank[]; topDoctors: DashboardRank[];
}
export interface DashboardRevenue extends DashboardRange {
  timezone: string; currency: string; successfulPayments: number; collectedAmount: number;
  dailyRevenue: { date: string; successfulPayments: number; collectedAmount: number }[];
  byPaymentMethod: { method: string; successfulPayments: number; collectedAmount: number }[];
  successfulPaymentsMissingPaidAt: number;
}
export interface DashboardAppointment {
  id: number; appointmentCode: string; patientId: number; patientName: string;
  doctorId: number; doctorName: string; specialtyId: number | null; specialtyName: string | null;
  serviceName: string; appointmentDate: string; startTime: string; endTime: string;
  status: AppointmentStatus;
}
export interface DashboardAppointmentPage {
  content: DashboardAppointment[]; totalElements: number; totalPages: number; number: number; size: number;
}
