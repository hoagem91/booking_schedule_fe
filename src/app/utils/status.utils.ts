import { AppointmentEnumStatus } from '../enum/appointment/appointment.enum';
import { AppointmentConstants } from '../constants/appointment/appointment.constants';
import { SpecialtyStatusEnum } from '../enum/specialty/specialty.enum';
import { SpecialtyConstants } from '../constants/specialty/specialty.constants';

export class StatusUtils{
  public static getStatusText(value: SpecialtyStatusEnum): { text: string, color: string } {
    const found = SpecialtyConstants.ListSpecialtyStatus.find(item => item.value === value);
    return found ? found : { text: '', color: '' };
  }
}
