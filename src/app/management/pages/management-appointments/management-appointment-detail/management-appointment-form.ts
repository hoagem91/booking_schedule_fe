import { Component, inject, signal } from '@angular/core';
import { AppointmentService } from '../../../../services/appointment/appointment.service';
import { BaseFormComponent } from '../../../../components/base-form.component';
import { NZ_DRAWER_DATA, NzDrawerRef, NzDrawerService } from 'ng-zorro-antd/drawer';
import { ManagementAppointmentsService } from '../../../services/management-appointments.service';
import { takeUntil } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { apiResponseSucceeded } from '../../../../models/api-response.model';
import { AppointmentHistoryItem } from '../../../../models/appointment.model';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonComponent } from 'ng-zorro-antd/button';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { ShowLoadingDirective } from '../../../../directives/UI/show-loading.directive';
import { ShowErrorDirective } from '../../../../directives/UI/show-error.directive';
import { clinicToday } from '../../../services/management-appointments.service';

export interface AppointmentFormDrawerData {
  id?: number;
  isViewMode?: boolean;
}

@Component({
  selector: 'app-management-appointment-detail',
  imports: [ReactiveFormsModule, NzIconModule, NzButtonComponent, NzInputModule, NzSelectModule,
    NzCardModule, NzFormModule, NzDatePickerModule, ShowLoadingDirective, ShowErrorDirective],
  templateUrl: './management-appointment-form.html',
  styleUrl: './management-appointment-form.css'
})
export class ManagementAppointmentForm extends BaseFormComponent {
  protected appointmentService = inject(ManagementAppointmentsService);
  protected drawerData: AppointmentFormDrawerData = inject(NZ_DRAWER_DATA, { optional: true });
  protected drawerService = inject(NzDrawerService);
  protected message = inject(NzMessageService);
  private drawerRef = inject(NzDrawerRef, { optional: true });

  protected isLoadingDataForForm = signal<boolean>(false);
  protected isSavingForm = signal<boolean>(false);
  protected isViewMode = false;
  protected isEditMode = false;
  protected readonly today = clinicToday();
  protected readonly disabledAppointmentDate = (date: Date): boolean =>
    date < new Date(`${this.today}T00:00:00`);

  protected appointmentData: AppointmentHistoryItem|null = null;

  constructor() {
    super();
    this.isEditMode = !!this.drawerData?.id;
    this.isViewMode = !!this.drawerData?.isViewMode;
    this.saveForm = this.fb.group({
      patientId: [null, [Validators.required, Validators.min(1)]],
      doctorId: [null, [Validators.required, Validators.min(1)]],
      serviceId: [null, [Validators.required, Validators.min(1)]],
      timeSlotId: [null, [Validators.required, Validators.min(1)]],
      appointmentDate: [new Date(`${this.today}T00:00:00`), Validators.required],
      reason: ['', Validators.maxLength(2000)],
      note: ['', Validators.maxLength(2000)],
      promotionId: [null, Validators.min(1)],
    });
    if (this.isViewMode) this.saveForm.disable();
  };

  override ngOnInit() {
    super.ngOnInit();
    this.loadDataForForm();
  }

  protected loadDataForForm(): void {
    if (!this.drawerData?.id) return;
    this.isLoadingDataForForm.set(true);
    this.appointmentService.getAppointmentDetail(this.drawerData.id)
      .pipe(
        takeUntil(this.unsubscribe),
        tap((res) => {
          this.errorCode.set(String(res.code));
          if (apiResponseSucceeded(res) && res.result) {
            const data = res.result;
            this.appointmentData = data;
            this.saveForm.patchValue({
              id: data.id,
              appointmentCode: data.appointmentCode,
              patientId: data.patientId,
              patientName: data.patientName,
              patientPhone: data.patientPhone,
              doctorId: data.doctorId,
              doctorCode: data.doctorCode,
              doctorName: data.doctorName,
              serviceId: data.serviceId,
              serviceName: data.serviceName,
              servicePrice: data.servicePrice,
              finalAmount: data.finalAmount,
              reviewEligible: data.reviewEligible,
              timeSlotId: data.timeSlotId,
              startTime: data.startTime,
              endTime: data.endTime,
              appointmentDate: new Date(`${data.appointmentDate}T00:00:00`),
              promotionId: data.promotionId,
              reason: data.reason,
              status: data.status,
              note: data.note,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            });
          }
        }),
        finalize(() => this.isLoadingDataForForm.set(false))
      )
      .subscribe();
  }

  protected override handleCancel() {
    this.drawerRef?.close();
  }

  protected override handleOk() {
    super.handleOk();
    if (this.isViewMode || this.isSavingForm() || this.isLoadingDataForForm()) return;
    if (this.saveForm.invalid) return;
    if (this.isEditMode && this.drawerData?.id) {
      this.onUpdate();
    } else {
      this.onCreate();
    }
  }

  private onCreate(): void {
    this.isSavingForm.set(true);
    const data = this.getDataPayLoad();
    this.appointmentService.create(data)
      .pipe(
        takeUntil(this.unsubscribe),
        tap((res) => {
          if (apiResponseSucceeded(res)) {
            this.drawerRef?.close({ success: true });
          } else {
            this.message.error(res.message || 'Thêm mới thất bại');
          }
        }),
        finalize(() => this.isSavingForm.set(false))
      ).subscribe();
  }
  private onUpdate(): void {
    this.isSavingForm.set(true);
    const data = this.getDataPayLoad();
    this.appointmentService.create(data)
      .pipe(
        takeUntil(this.unsubscribe),
        tap((res) => {
          if (apiResponseSucceeded(res)) {
            this.drawerRef?.close({ success: true });
          } else {
            this.message.error(res.message || 'Thêm mới thất bại');
          }
        }),
        finalize(() => this.isSavingForm.set(false))
      ).subscribe();
  }
  private getDataPayLoad() {
    const formData = this.saveForm.getRawValue();
    return;
  }

}
