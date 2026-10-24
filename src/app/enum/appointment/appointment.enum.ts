export enum AppointmentEnumStatus {
  PENDING = 'PENDING',      // Mới đặt, chờ xác nhận
  CONFIRMED = 'CONFIRMED',    // Đã xác nhận
  IN_PROGRESS = 'IN_PROGRESS',  // Đang khám
  COMPLETED = 'COMPLETED',    // Đã khám xong
  CANCELLED = 'CANCELLED',    // Đã hủy
  NO_SHOW = 'NO_SHOW',
}
