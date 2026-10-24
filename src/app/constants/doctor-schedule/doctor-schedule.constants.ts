import { AppointmentEnumStatus } from '../../enum/appointment/appointment.enum';
import { DoctorScheduleEnumStatus } from '../../enum/doctor-schedule/doctor-schedule.enum';

export class DoctorScheduleConstants{
  public static readonly ListDoctorScheduleStatus: { text: string; value: DoctorScheduleEnumStatus; color: string; }[] = [
    { text: 'Đang mở', value: DoctorScheduleEnumStatus.OPEN, color: 'green' },
    { text: 'Đã đầy', value: DoctorScheduleEnumStatus.FULL, color: 'orange' },
    { text: 'Đã đóng', value: DoctorScheduleEnumStatus.CLOSED, color: 'gray' },
    { text: 'Đã hủy', value: DoctorScheduleEnumStatus.CANCELLED, color: 'red' },
  ];
}
