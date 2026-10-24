import { Component, DestroyRef, inject, signal } from '@angular/core';
import { AbstractControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { NZ_DRAWER_DATA, NzDrawerRef } from 'ng-zorro-antd/drawer';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { finalize, forkJoin, of, Subscription, switchMap, takeUntil } from 'rxjs';
import { BaseFormComponent } from '../../../../components/base-form.component';
import { ShowLoadingDirective } from '../../../../directives/UI/show-loading.directive';
import { ShowErrorDirective } from '../../../../directives/UI/show-error.directive';
import { apiResponseSucceeded } from '../../../../models/api-response.model';
import { AppointmentHistoryItem, AppointmentStatus } from '../../../../models/appointment.model';
import { BookingService, BookingTimeSlot } from '../../../../models/booking.model';
import { PatientProfile } from '../../../../models/patient.model';
import { ManagementAppointmentsService, clinicToday } from '../../../services/management-appointments.service';
import { AdminPatientService } from '../../../services/admin-patient.service';
import { AdminAppointmentCreateRequest, AppointmentDoctorOption } from '../../../models/appointment-create.models';
import { appointmentStatusLabels } from '../../../../utils/appointment/appointment-ui.utils';

export interface AppointmentFormDrawerData {
  id?: number;
  isViewMode?: boolean;
  onStatusChanged?: () => void;
}

export function appointmentDateValue(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-management-appointment-form',
  imports: [ReactiveFormsModule, NzIconModule, NzButtonModule, NzInputModule, NzSelectModule, NzCardModule,
    NzFormModule, NzDatePickerModule, ShowLoadingDirective, ShowErrorDirective],
  templateUrl: './management-appointment-form.html', styleUrl: './management-appointment-form.css'
})
export class ManagementAppointmentForm extends BaseFormComponent {
  protected readonly appointmentService = inject(ManagementAppointmentsService);
  protected readonly patientService = inject(AdminPatientService);
  protected readonly drawerData = inject<AppointmentFormDrawerData>(NZ_DRAWER_DATA, { optional: true });
  protected readonly message = inject(NzMessageService);
  private readonly drawerRef = inject(NzDrawerRef, { optional: true });
  protected readonly isLoadingDataForForm = signal(false);
  protected readonly isSavingForm = signal(false);
  protected readonly loadingSlots = signal(false);
  protected readonly lookupsReady = signal(false);
  protected readonly formError = signal('');
  protected readonly slotError = signal('');
  protected readonly isEditMode = !!this.drawerData?.id;
  // Appointment field updates have no backend endpoint. Existing records stay read-only.
  protected readonly isViewMode = this.isEditMode;
  protected appointmentData: AppointmentHistoryItem | null = null;
  protected readonly detailLoadFailed = signal(false);
  protected patients: PatientProfile[] = [];
  protected doctors: AppointmentDoctorOption[] = [];
  protected services: BookingService[] = [];
  protected slots: BookingTimeSlot[] = [];
  private slotsRequest?: Subscription;
  protected readonly disabledAppointmentDate = (date: Date) => appointmentDateValue(date) < clinicToday();

  protected statusLabel(status: AppointmentStatus): string {
    return appointmentStatusLabels[status] ?? 'Chưa xác định';
  }

  protected get selectedPatient(): PatientProfile | undefined {
    return this.patients.find(p => p.id === this.saveForm.getRawValue().patientId);
  }

  protected get availableServices(): BookingService[] {
    const doctor = this.doctors.find(d => d.id === this.saveForm.getRawValue().doctorId);
    return doctor ? this.services.filter(s => s.specialtyId == null || s.specialtyId === doctor.specialtyId) : [];
  }

  constructor() {
    super();
    const id = [Validators.required, (c: AbstractControl) => Number.isSafeInteger(c.value) && c.value > 0 ? null : { positiveId: true }];
    this.saveForm = this.fb.group({
      patientId: [null, id],
      doctorId: [null, id],
      serviceId: [null, id],
      timeSlotId: [null, id],
      appointmentDate: [new Date(`${clinicToday()}T00:00:00`), [Validators.required, (c: AbstractControl) =>
        c.value instanceof Date && Number.isFinite(c.value.getTime()) && appointmentDateValue(c.value) >= clinicToday() ? null : { date: true }]],
      reason: ['', Validators.maxLength(2000)],
      note: ['', Validators.maxLength(2000)],
      promotionId: [{ value: null, disabled: true }]
    });
    if (this.isViewMode) this.saveForm.disable({ emitEvent: false });
    inject(DestroyRef).onDestroy(() => this.slotsRequest?.unsubscribe());
  }

  override ngOnInit(): void {
    super.ngOnInit();
    if (this.isEditMode) {
      this.loadDataForForm();
      return;
    }
    this.saveForm.controls['doctorId'].valueChanges.pipe(takeUntil(this.unsubscribe)).subscribe(() => {
      this.saveForm.patchValue({ serviceId: null }, { emitEvent: false });
      this.loadSlots();
    });
    this.saveForm.controls['appointmentDate'].valueChanges.pipe(takeUntil(this.unsubscribe)).subscribe(() => this.loadSlots());
    this.loadDataForPatient();
  }

  protected loadDataForPatient(): void {
    if (this.isLoadingDataForForm() || this.isEditMode) return;
    if (!this.hasRole('ADMIN') && !this.hasRole('SUPER_ADMIN')) {
      this.formError.set('Tài khoản chưa được cấp quyền tải danh sách bệnh nhân và bác sĩ để tạo lịch.');
      return;
    }
    this.isLoadingDataForForm.set(true);
    this.lookupsReady.set(false);
    this.formError.set('');
    forkJoin({
      patients: this.patientService.getAllPatients(),
      doctors: this.appointmentService.getDoctors(),
      services: this.appointmentService.getServices()
    })
      .pipe(takeUntil(this.unsubscribe), finalize(() => this.isLoadingDataForForm.set(false))).subscribe({
      next: res => {
        if (!apiResponseSucceeded(res.patients) || !Array.isArray(res.patients.result)
          || !apiResponseSucceeded(res.doctors) || !Array.isArray(res.doctors.result)
          || !apiResponseSucceeded(res.services) || !Array.isArray(res.services.result)) {
          this.formError.set('Không thể tải bệnh nhân, bác sĩ hoặc dịch vụ. Vui lòng thử tải lại.');
          return;
        }
        this.patients = res.patients.result;
        this.doctors = res.doctors.result.filter(d => d.status === 'ACTIVE');
        this.services = res.services.result;
        this.lookupsReady.set(true);
      }, error: () => this.formError.set('Không thể kết nối máy chủ để tải dữ liệu lựa chọn.')
    });
  }

  protected loadSlots(): void {
    this.slotsRequest?.unsubscribe();
    this.slots = [];
    this.slotError.set('');
    this.saveForm.patchValue({ timeSlotId: null }, { emitEvent: false });
    const value = this.saveForm.getRawValue();
    if (!value.doctorId || this.saveForm.controls['appointmentDate'].invalid) {
      this.loadingSlots.set(false);
      return;
    }
    const date = appointmentDateValue(value.appointmentDate), doctorId = value.doctorId;
    this.loadingSlots.set(true);
    this.slotsRequest = this.appointmentService.getSchedules(doctorId, date).pipe(switchMap(response => {
      if (!apiResponseSucceeded(response) || !Array.isArray(response.result)) throw new Error('Không thể tải ca khám. Vui lòng thử lại.');
      const schedules = response.result.filter(s => s.doctorId === doctorId && s.workDate === date && s.status === 'OPEN');
      return schedules.length ? forkJoin(schedules.map(s => this.appointmentService.getSlots(s.id).pipe(switchMap(res => {
        if (!apiResponseSucceeded(res) || !Array.isArray(res.result)) throw new Error('Không thể tải khung giờ. Vui lòng thử lại.');
        return of(res.result.filter(slot => slot.scheduleId === s.id));
      })))) : of([] as BookingTimeSlot[][]);
    }), takeUntil(this.unsubscribe), finalize(() => this.loadingSlots.set(false))).subscribe({
      next: groups => {
        this.slots = [...new Map(groups.flat().filter(slot => this.isAvailableSlot(slot, date)).map(slot => [slot.id, slot])).values()]
          .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id - b.id);
      }, error: e => this.slotError.set(e instanceof Error ? e.message : 'Không thể tải khung giờ.')
    });
  }

  private isAvailableSlot(slot: BookingTimeSlot, date: string): boolean {
    return slot.status === 'AVAILABLE' && slot.bookedCount < slot.maxPatients
      && Date.parse(`${date}T${slot.startTime}+07:00`) > Date.now();
  }

  protected loadDataForForm(): void {
    if (!this.drawerData?.id) return;
    this.clearError();
    this.detailLoadFailed.set(false);
    this.isLoadingDataForForm.set(true);
    this.appointmentService.getAppointmentDetail(this.drawerData.id).pipe(takeUntil(this.unsubscribe),
      finalize(() => this.isLoadingDataForForm.set(false))).subscribe(res => {
      if (apiResponseSucceeded(res) && res.result?.id === this.drawerData!.id) {
        this.appointmentData = res.result!;
        const data = res.result!;
        this.saveForm.patchValue({
          patientId: data.patientId, doctorId: data.doctorId, serviceId: data.serviceId,
          timeSlotId: data.timeSlotId, appointmentDate: new Date(`${data.appointmentDate}T00:00:00`),
          reason: data.reason, note: data.note, promotionId: data.promotionId
        }, { emitEvent: false });
      } else {
        this.appointmentData = null;
        this.detailLoadFailed.set(true);
        this.setError('Không thể tải thông tin lịch hẹn. Vui lòng đóng và mở lại để thử lại.', res.code);
      }
    });
  }

  protected override handleCancel(): void {
    if (!this.isSavingForm()) this.drawerRef?.close({ success: false });
  }


  protected override handleOk(): void {
    if (this.isViewMode || this.isSavingForm() || this.isLoadingDataForForm() || this.loadingSlots() || !this.lookupsReady()) return;
    this.saveForm.markAllAsTouched();
    super.handleOk();
    if (this.saveForm.invalid) return;
    if (!this.hasRole('ADMIN') && !this.hasRole('SUPER_ADMIN')) {
      this.formError.set('Bạn không có quyền tạo lịch hẹn.');
      return;
    }
    const data = this.getDataPayLoad(), slot = this.slots.find(s => s.id === data.timeSlotId);
    if (!this.patients.some(p => p.id === data.patientId) || !this.doctors.some(d => d.id === data.doctorId)
      || !this.availableServices.some(s => s.id === data.serviceId) || !slot || !this.isAvailableSlot(slot, data.appointmentDate)) {
      this.formError.set('Lựa chọn không còn hợp lệ. Vui lòng chọn lại bệnh nhân, bác sĩ, dịch vụ hoặc khung giờ.');
      return;
    }
    this.onCreate(data);
  }

  private onCreate(data: AdminAppointmentCreateRequest): void {
    this.formError.set('');
    this.isSavingForm.set(true);
    this.saveForm.disable({ emitEvent: false });
    this.appointmentService.create(data).pipe(takeUntil(this.unsubscribe), finalize(() => {
      this.isSavingForm.set(false);
      this.saveForm.enable({ emitEvent: false });
      this.saveForm.controls['promotionId'].disable({ emitEvent: false });
    })).subscribe({
      next: res => {
        if (apiResponseSucceeded(res) && res.result?.id) {
          this.message.success('Tạo lịch hẹn thành công');
          this.drawerRef?.close({ success: true, data: res.result });
        } else {
          const messages: Record<number, string> = {
            2003: 'Hồ sơ bệnh nhân không còn tồn tại. Vui lòng tải lại danh sách.',
            1012: 'Tài khoản liên quan không còn hoạt động. Vui lòng kiểm tra lại hồ sơ.',
            4002: 'Bác sĩ không còn tồn tại. Vui lòng chọn lại.',
            5003: 'Dịch vụ không còn tồn tại. Vui lòng chọn lại.',
            3004: 'Chuyên khoa không còn hoạt động.',
            8002: 'Thông tin đặt lịch hoặc ngày khám không hợp lệ.',
            7001: 'Khung giờ không còn tồn tại. Vui lòng chọn lại.',
            6004: 'Ca khám không còn tồn tại. Vui lòng chọn lại.',
            8004: 'Bệnh nhân đã có lịch hẹn trùng thời gian.',
            8008: 'Dịch vụ không thuộc chuyên khoa của bác sĩ.',
            7003: 'Khung giờ vừa hết chỗ hoặc không còn nhận đặt. Vui lòng chọn lại.',
            8003: 'Khung giờ không khớp bác sĩ hoặc ngày khám. Vui lòng chọn lại.',
            6001: 'Bác sĩ không còn hoạt động.',
            8007: 'Dịch vụ không còn hoạt động.',
            1007: 'Tài khoản không còn quyền tạo lịch.',
            1006: 'Phiên đăng nhập đã hết hạn.'
          };
          this.formError.set(messages[res.code] || 'Chưa thể xác định kết quả tạo lịch. Vui lòng kiểm tra danh sách trước khi thử lại.');
          if ([6004, 7001, 7003, 8003].includes(res.code)) this.loadSlots();
        }
      },
      error: () => this.formError.set('Không thể xác định kết quả tạo lịch. Vui lòng kiểm tra danh sách trước khi thử lại.')
    });
  }

  private getDataPayLoad(): AdminAppointmentCreateRequest {
    const value = this.saveForm.getRawValue();
    return {
      patientId: value.patientId, doctorId: value.doctorId, serviceId: value.serviceId, timeSlotId: value.timeSlotId,
      appointmentDate: appointmentDateValue(value.appointmentDate), ...(value.reason?.trim() ? { reason: value.reason.trim() } : {}),
      ...(value.note?.trim() ? { note: value.note.trim() } : {})
    };
  }
}
