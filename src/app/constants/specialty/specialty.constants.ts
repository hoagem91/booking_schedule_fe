import { DoctorScheduleEnumStatus } from '../../enum/doctor-schedule/doctor-schedule.enum';
import { SpecialtyStatusEnum } from '../../enum/specialty/specialty.enum';

export class SpecialtyConstants {
  public static readonly ListSpecialtyStatus: { text: string; value: SpecialtyStatusEnum; color: string; }[] = [
    { text: 'Đang hoạt động', value: SpecialtyStatusEnum.ACTIVE, color: 'green' },
    { text: 'Ngừng hoạt động', value: SpecialtyStatusEnum.INACTIVE, color: 'red' }
  ];
}
