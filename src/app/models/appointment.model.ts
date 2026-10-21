export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface AppointmentHistoryItem {
  id: number;
  appointmentCode: string;
  patientId: number;
  patientCode: string;
  patientName: string;
  patientPhone: string | null;
  doctorId: number;
  doctorCode: string;
  doctorName: string;
  serviceId: number;
  serviceName: string;
  servicePrice: number | null;
  finalAmount: number | null;
  reviewEligible: boolean;
  timeSlotId: number;
  startTime: string;
  endTime: string;
  promotionId: number | null;
  promotionCode: string | null;
  promotionName: string | null;
  discountType: string | null;
  discountValue: number | null;
  maxDiscount: number | null;
  appointmentDate: string;
  reason: string | null;
  status: AppointmentStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentHistoryPage {
  content: AppointmentHistoryItem[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  numberOfElements: number;
}

export type HistorySort = 'id,desc' | 'id,asc';
