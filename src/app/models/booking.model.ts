export interface BookingSpecialty {
  id: number;
  name: string;
  description: string | null;
}

export interface BookingService {
  id: number;
  name: string;
  specialtyId: number | null;
  price: number | null;
  durationMinutes: number | null;
  description: string | null;
}

export interface BookingSchedule {
  id: number;
  doctorId: number;
  doctorName: string;
  specialtyName: string;
  roomName: string;
  workDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface BookingTimeSlot {
  id: number;
  scheduleId: number;
  startTime: string;
  endTime: string;
  maxPatients: number;
  bookedCount: number;
  status: string;
}

export interface CreateAppointmentRequest {
  doctorId: number;
  serviceId: number;
  timeSlotId: number;
  appointmentDate: string;
  reason?: string;
  note?: string;
}

export interface AppointmentReviewRequest {
  rating: number;
  comment?: string;
}

export interface AppointmentReview {
  id: number;
  appointmentId: number;
  rating: number;
  comment: string | null;
}
