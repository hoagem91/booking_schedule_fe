export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE';
export const ROOM_STATUSES: { value: RoomStatus; label: string; color: string }[] = [
  { value: 'AVAILABLE', label: 'Sẵn sàng', color: 'green' },
  { value: 'OCCUPIED', label: 'Đang sử dụng', color: 'blue' },
  { value: 'MAINTENANCE', label: 'Bảo trì', color: 'orange' },
  { value: 'INACTIVE', label: 'Ngừng hoạt động', color: 'red' },
];
export interface RoomResponse {
  id: number;
  code: string;
  name: string;
  location: string | null;
  specialtyId: number | null;
  specialtyName: string | null;
  status: RoomStatus;
  createdAt?: string;
  updatedAt?: string;
}
/** POST/PUT require code and name. Null specialty/location clears those fields on PUT. */
export interface RoomRequest {
  code: string;
  name: string;
  location?: string | null;
  specialtyId?: number | null;
  status?: RoomStatus;
}
/** PATCH preserves omitted fields and uses explicit clear flags. */
export interface RoomUpdateRequest {
  code?: string;
  name?: string;
  location?: string;
  specialtyId?: number;
  status?: RoomStatus;
  clearLocation?: boolean;
  clearSpecialty?: boolean;
}
export interface RoomSearchRequest {
  keyword: string | null;
  specialtyId: number | null;
  sharedOnly: boolean;
  status?: RoomStatus | null;
}
export interface RoomAvailabilityRequest extends Omit<RoomSearchRequest, 'status'> {
  workDate: string;
  startTime: string;
  endTime: string;
  excludeScheduleId?: number;
}
export interface RoomDeleteResponse {
  id: number;
  action: 'DELETED' | 'DEACTIVATED';
  status: RoomStatus | null;
  message: string;
}
export interface RoomSpecialtyOption { id: number; name: string; status: 'ACTIVE' | 'INACTIVE'; }
