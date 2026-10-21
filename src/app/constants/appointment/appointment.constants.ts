import { AppointmentEnumStatus } from '../../enum/appointment/appointment.enum';

export class AppointmentConstants {
  public static readonly ListAppointmentStatus: { text: string; value: AppointmentEnumStatus; color: string; }[] = [
    { text: 'Chờ xác nhận', value: AppointmentEnumStatus.PENDING, color: 'orange' },
    { text: 'Đã xác nhận', value: AppointmentEnumStatus.CONFIRMED, color: 'blue' },
    { text: 'Đang khám', value: AppointmentEnumStatus.IN_PROGRESS, color: 'cyan' },
    { text: 'Hoàn thành', value: AppointmentEnumStatus.COMPLETED, color: 'green' },
    { text: 'Đã hủy', value: AppointmentEnumStatus.CANCELLED, color: 'red' },
    { text: 'Không đến khám', value: AppointmentEnumStatus.NO_SHOW, color: 'volcano' }
  ];
}
