import { AppointmentEnumStatus } from '../../enum/appointment/appointment.enum';
import { AppointmentConstants } from '../../constants/appointment/appointment.constants';

export class AppointmentUtils{
  public static getAppointmentStatus(value: AppointmentEnumStatus): { text: string, color: string } {
    const found = AppointmentConstants.ListAppointmentStatus.find(item => item.value === value);
    return found ? found : { text: '', color: '' };
  }
}
