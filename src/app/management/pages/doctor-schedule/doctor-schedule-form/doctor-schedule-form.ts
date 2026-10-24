import { Component, inject, signal } from '@angular/core';
import { AbstractControl, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { NZ_DRAWER_DATA, NzDrawerRef } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTimePickerModule } from 'ng-zorro-antd/time-picker';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin, of, takeUntil } from 'rxjs';
import { BaseFormComponent } from '../../../../components/base-form.component';
import { ShowLoadingDirective } from '../../../../directives/UI/show-loading.directive';
import { DoctorScheduleAdminService } from '../../../services/admin-doctor-schedule.service';
import { clinicToday } from '../../../services/management-appointments.service';
import { ApiResponse, apiResponseSucceeded } from '../../../../models/api-response.model';
import {
  DoctorScheduleCreateRequest,
  DoctorScheduleUpdateRequest,
  DoctorScheduleResponse,
  ScheduleDoctorOption,
  ScheduleRoomOption
} from '../../../models/doctor-schedule.models';

export function scheduleDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function scheduleTime(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}:00`;
}

export function scheduleTimeRange(control: AbstractControl): ValidationErrors | null {
  const { startTime, endTime } = control.value;
  if (!(startTime instanceof Date) || !(endTime instanceof Date)) return null;
  return scheduleTime(startTime) < scheduleTime(endTime) ? null : { timeRange: true };
}

@Component({
  selector: 'app-doctor-schedule-form',
  imports: [ReactiveFormsModule, NzButtonModule, NzIconModule, NzCardModule, NzFormModule,
    NzSelectModule, NzDatePickerModule, NzTimePickerModule, NzInputNumberModule, ShowLoadingDirective],
  templateUrl: './doctor-schedule-form.html',
  styleUrl: './doctor-schedule-form.css'
})
export class DoctorScheduleForm extends BaseFormComponent {
  private readonly drawerData = inject<{ id?: number; isViewMode?: boolean }>(NZ_DRAWER_DATA, { optional: true }) ?? {};
  protected readonly isEditMode = !!this.drawerData.id;
  protected readonly isViewMode = !!this.drawerData.isViewMode;
  protected scheduleData: DoctorScheduleResponse | null = null;
  protected readonly hasBookingHistory = signal(false);
  private readonly api = inject(DoctorScheduleAdminService);
  private readonly drawer = inject(NzDrawerRef);
  private readonly message = inject(NzMessageService);
  protected readonly isLoadingDataForForm = signal(false);
  protected readonly isSavingForm = signal(false);
  protected readonly optionsReady = signal(false);
  protected readonly formError = signal('');
  protected doctors: ScheduleDoctorOption[] = [];
  protected rooms: ScheduleRoomOption[] = [];
  protected readonly disabledWorkDate = (date: Date): boolean => scheduleDate(date) < clinicToday();

  constructor() {
    super();
    const positiveInteger = (c: AbstractControl): ValidationErrors | null => c.value == null
    || (Number.isSafeInteger(c.value) && c.value > 0) ? null : { positiveInteger: true };
    const validTime = (c: AbstractControl): ValidationErrors | null => c.value instanceof Date && Number.isFinite(c.value.getTime()) ? null : { time: true };
    this.saveForm = this.fb.group({
      doctorId: [null, [Validators.required, positiveInteger]],
      roomId: [null, positiveInteger],
      workDate: [new Date(`${clinicToday()}T00:00:00`), [Validators.required, (c: AbstractControl) =>
        c.value instanceof Date && Number.isFinite(c.value.getTime()) && (scheduleDate(c.value) >= clinicToday()
          || (this.isEditMode && scheduleDate(c.value) === this.scheduleData?.workDate)) ? null : { futureOrPresent: true }]],
      startTime: [null, [Validators.required, validTime]], endTime: [null, [Validators.required, validTime]],
      maxPatients: [20, [Validators.required, positiveInteger, Validators.max(2147483647)]]
    }, { validators: scheduleTimeRange });
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadOptions();
  }

  protected loadOptions(): void {
    if (this.isLoadingDataForForm()) return;
    this.isLoadingDataForForm.set(true);
    this.optionsReady.set(false);
    this.formError.set('');
    forkJoin({
      doctors: this.isViewMode ? of({ code: 1000, result: [] as ScheduleDoctorOption[] }) : this.api.getActiveDoctors(),
      rooms: this.isViewMode ? of({ code: 1000, result: [] as ScheduleRoomOption[] }) : this.api.getAvailableRooms(),
      detail: this.drawerData.id ? this.api.getDoctorScheduleDetail(this.drawerData.id)
        : of<ApiResponse<DoctorScheduleResponse>>({ code: 1000, result: null })
    }).pipe(
      takeUntil(this.unsubscribe), finalize(() => this.isLoadingDataForForm.set(false))
    ).subscribe({
      next: ({ doctors, rooms, detail }) => {
        if (this.isEditMode && (!apiResponseSucceeded(detail) || !detail.result || detail.result.id !== this.drawerData.id)) {
          this.formError.set('Không thể tải thông tin lịch làm việc. Vui lòng thử tải lại.');
          return;
        }
        if (!apiResponseSucceeded(doctors) || !Array.isArray(doctors.result) || !apiResponseSucceeded(rooms) || !Array.isArray(rooms.result)) {
          this.formError.set('Không thể tải danh sách bác sĩ hoặc phòng khám. Vui lòng thử tải lại.');
          return;
        }
        this.doctors = doctors.result.filter(item => item.status === 'ACTIVE');
        this.rooms = rooms.result.filter(item => item.status === 'AVAILABLE');
        if (detail.result) this.patchDataForForm(detail.result);
        this.optionsReady.set(true);
      }, error: () => this.formError.set('Không thể kết nối máy chủ để tải dữ liệu. Vui lòng thử lại.')
    });
  }

  private patchDataForForm(data: DoctorScheduleResponse): void {
    this.scheduleData = data;
    if (!this.doctors.some(d => d.id === data.doctorId)) this.doctors.push({
      id: data.doctorId,
      doctorCode: data.doctorCode, fullName: data.doctorName, specialtyName: data.specialtyName, status: 'INACTIVE'
    });
    if (data.roomId && !this.rooms.some(r => r.id === data.roomId)) this.rooms.push({
      id: data.roomId,
      code: data.roomCode ?? '', name: data.roomName ?? 'Phòng đã phân công', status: 'UNAVAILABLE'
    });
    const time = (value: string) => new Date(`2000-01-01T${value}`);
    this.saveForm.patchValue({
      doctorId: data.doctorId,
      roomId: data.roomId,
      workDate: new Date(`${data.workDate}T00:00:00`),
      startTime: time(data.startTime),
      endTime: time(data.endTime),
      maxPatients: data.maxPatients
    });
    this.hasBookingHistory.set(data.timeSlots.some(slot => slot.bookedCount > 0));
    this.applyFormMode();
    this.saveForm.markAsPristine();
    this.saveForm.markAsUntouched();
  }

  private applyFormMode(): void {
    this.saveForm.enable({ emitEvent: false });
    if (this.isEditMode) this.saveForm.controls['doctorId'].disable({ emitEvent: false });
    if (this.hasBookingHistory()) {
      for (const key of ['workDate', 'startTime', 'endTime']) this.saveForm.controls[key].disable({ emitEvent: false });
      this.saveForm.controls['maxPatients'].addValidators(Validators.min(this.scheduleData!.maxPatients));
      this.saveForm.controls['maxPatients'].updateValueAndValidity({ emitEvent: false });
    }
    if (this.isViewMode) this.saveForm.disable({ emitEvent: false });
  }

  private getUpdatePayload(): DoctorScheduleUpdateRequest {
    const data = this.scheduleData!, value = this.saveForm.getRawValue();
    const body: DoctorScheduleUpdateRequest = {};
    if (scheduleDate(value.workDate) !== data.workDate) body.workDate = scheduleDate(value.workDate);
    if (scheduleTime(value.startTime).slice(0, 5) !== data.startTime.slice(0, 5)) body.startTime = scheduleTime(value.startTime);
    if (scheduleTime(value.endTime).slice(0, 5) !== data.endTime.slice(0, 5)) body.endTime = scheduleTime(value.endTime);
    if (value.roomId != null && value.roomId !== data.roomId) body.roomId = value.roomId;
    if (value.maxPatients !== data.maxPatients) body.maxPatients = value.maxPatients;
    return body;
  }

  protected override handleCancel(): void {
    if (!this.isSavingForm()) this.drawer.close({ success: false });
  }

  protected override handleOk(): void {
    if (this.isViewMode || this.isSavingForm() || !this.optionsReady()) return;
    this.saveForm.markAllAsTouched();
    super.handleOk();
    if (this.saveForm.invalid) return;
    if (!this.hasRole('ADMIN') && !this.hasRole('SUPER_ADMIN')) {
      this.formError.set('Bạn không có quyền lưu lịch làm việc.');
      return;
    }
    const value = this.saveForm.getRawValue();
    if (this.scheduleData?.roomId && value.roomId == null) {
      this.formError.set('Chưa hỗ trợ bỏ phân phòng. Vui lòng giữ phòng hiện tại hoặc chọn phòng khác.');
      return;
    }
    if (this.isEditMode && value.doctorId !== this.scheduleData?.doctorId) {
      this.formError.set('Không thể thay đổi bác sĩ của ca đã tạo.');
      return;
    }
    if (!this.doctors.some(item => item.id === value.doctorId)
      || (value.roomId != null && !this.rooms.some(item => item.id === value.roomId))) {
      this.formError.set('Bác sĩ hoặc phòng khám không hợp lệ. Vui lòng chọn lại.');
      return;
    }
    const body: DoctorScheduleCreateRequest = {
      doctorId: value.doctorId, workDate: scheduleDate(value.workDate),
      startTime: scheduleTime(value.startTime), endTime: scheduleTime(value.endTime), maxPatients: value.maxPatients,
      ...(value.roomId == null ? {} : { roomId: value.roomId })
    };
    this.formError.set('');
    this.isSavingForm.set(true);
    this.saveForm.disable({ emitEvent: false });
    const updateBody = this.isEditMode ? this.getUpdatePayload() : null;
    if (updateBody && !Object.keys(updateBody).length) {
      this.isSavingForm.set(false);
      this.applyFormMode();
      this.message.info('Chưa có thay đổi để cập nhật.');
      return;
    }
    (updateBody ? this.onUpdate(updateBody) : this.api.create(body)).pipe(takeUntil(this.unsubscribe), finalize(() => {
      this.isSavingForm.set(false);
      this.applyFormMode();
    })).subscribe({
      next: res => {
        if (apiResponseSucceeded(res) && res.result?.id && (!this.isEditMode || res.result.id === this.drawerData.id)) {
          this.message.success(this.isEditMode ? 'Cập nhật lịch làm việc thành công' : 'Tạo lịch làm việc thành công');
          this.drawer.close({ success: true, data: res.result });
        } else {
          if (res.code === 6008 && this.scheduleData) {
            this.hasBookingHistory.set(true);
            this.saveForm.patchValue({
              workDate: new Date(`${this.scheduleData.workDate}T00:00:00`),
              startTime: new Date(`2000-01-01T${this.scheduleData.startTime}`),
              endTime: new Date(`2000-01-01T${this.scheduleData.endTime}`)
            });
          }
          this.formError.set(this.createError(res.code));
        }
      },
      error: () => this.formError.set('Không thể xác định kết quả lưu lịch. Vui lòng kiểm tra danh sách trước khi thử lại.')
    });
  }

  private onUpdate(body: DoctorScheduleUpdateRequest) {
    return this.api.update(this.drawerData.id!, body);
  }

  private createError(code: number): string {
    const errors: Record<number, string> = {
      6001: 'Bác sĩ hoặc tài khoản bác sĩ không còn hoạt động.',
      6002: 'Phòng khám không còn tồn tại.',
      6003: 'Phòng khám không còn khả dụng. Vui lòng chọn phòng khác.',
      6005: 'Ngày, giờ hoặc số bệnh nhân không hợp lệ. Vui lòng kiểm tra lại.',
      6006: 'Bác sĩ đã có ca làm việc trùng thời gian này.',
      6007: 'Phòng khám đã được sử dụng trong thời gian này.',
      6004: 'Lịch làm việc không còn tồn tại. Vui lòng tải lại danh sách.',
      6008: 'Ca đã có lịch sử đặt. Chỉ được đổi phòng hoặc tăng sức chứa; không được đổi ngày, giờ hoặc giảm sức chứa.',
      6011: 'Không thể thay đổi bác sĩ của ca đã tạo.',
      6010: 'Sức chứa ca không phù hợp với các khung giờ.',
      1006: 'Phiên đăng nhập đã hết hạn.',
      1007: 'Bạn không có quyền tạo lịch làm việc.'
    };
    return errors[code] || 'Chưa thể lưu lịch làm việc. Vui lòng kiểm tra danh sách trước khi thử lại.';
  }
}
