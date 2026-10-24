import { DoctorScheduleEnumStatus } from '../../enum/doctor-schedule/doctor-schedule.enum';
import { DoctorScheduleConstants } from '../../constants/doctor-schedule/doctor-schedule.constants';

export class DoctorScheduleUtils{
  public static getDoctorScheduleStatus(value: DoctorScheduleEnumStatus): { text: string, color: string } {
    const found = DoctorScheduleConstants.ListDoctorScheduleStatus.find(item => item.value === value);
    return found ? found : { text: '', color: '' };
  }
  public static getDoctorScheduleStatusText(value: string): { text: string; color: string } {
    const found = DoctorScheduleConstants.ListDoctorScheduleStatus.find(item => item.value === value);
    return found ? found : { text: '', color: '' };
  }
}
