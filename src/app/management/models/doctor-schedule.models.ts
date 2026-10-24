export interface DoctorScheduleCreateRequest {
  doctorId: number;
  roomId?: number;
  workDate: string;
  startTime: string;
  endTime: string;
  maxPatients?: number;
}
export type DoctorScheduleUpdateRequest = Partial<DoctorScheduleCreateRequest>;
export interface ScheduleDoctorOption {
  id: number;
  doctorCode: string;
  fullName: string;
  specialtyName: string;
  status: string;
}
export interface ScheduleRoomOption { id: number; code: string; name: string; status: string; }

export interface DoctorScheduleResponse {
  id: number;
  doctorId: number;
  doctorCode: string;
  doctorName: string;
  specialtyName: string;

  roomId: number | null;
  roomCode: string | null;
  roomName: string | null;

  workDate: string;
  startTime: string;
  endTime: string;
  maxPatients: number;
  status: string;

  timeSlots: TimeSlot[];

  createdAt: string;
  updatedAt: string;
}
export interface TimeSlot {
  id: number;
  scheduleId: number;
  startTime: string;
  endTime: string;
  maxPatients: number;
  bookedCount: number;
  status: string;
}
