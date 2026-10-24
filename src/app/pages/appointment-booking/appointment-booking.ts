import { afterNextRender, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';
import { NzDatePickerComponent } from 'ng-zorro-antd/date-picker';
import { NzSelectItemInterface, NzSelectModule } from 'ng-zorro-antd/select';
import { SiteHeader } from '../../components/site-header/site-header';
import { BookingSummary } from './booking-summary';
import { AppointmentService } from '../../services/appointment/appointment.service';
import { PatientService } from '../../services/patient/patient.service';
import { AppointmentHistoryItem } from '../../models/appointment.model';
import { BookingSchedule, BookingService, BookingSpecialty, BookingTimeSlot } from '../../models/booking.model';
import { appointmentErrorMessage, appointmentResponseSucceeded, decodeAppointmentText,
  isUnavailableSlotResponse } from '../../utils/appointment/appointment-ui.utils';

@Component({
  selector: 'app-appointment-booking', standalone: true,
  imports: [SiteHeader, BookingSummary, RouterLink, FormsModule, CurrencyPipe, DatePipe, NzDatePickerComponent, NzSelectModule],
  templateUrl: './appointment-booking.html', styleUrl: './appointment-booking.css'
})
export class AppointmentBooking {
  private readonly appointmentService = inject(AppointmentService);
  private readonly destroyRef = inject(DestroyRef);
  private servicesRequest?: Subscription;
  private schedulesRequest?: Subscription;
  private slotsRequest?: Subscription;
  readonly profile = inject(PatientService).currentProfile;
  readonly step = signal(1);
  readonly steps = ['Chọn dịch vụ', 'Bác sĩ & ngày khám', 'Chọn khung giờ', 'Xác nhận lịch'];
  readonly today = signal('');
  readonly date = signal('');
  readonly quickDates = computed(() => {
    if (!this.today()) return [];
    const start = new Date(`${this.today()}T00:00:00`);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return {
        value: this.formatDate(day),
        label: `${String(day.getDate()).padStart(2, '0')}/${String(day.getMonth() + 1).padStart(2, '0')}`,
        weekday: day.getDay() === 0 ? 'CN' : `T${day.getDay() + 1}`
      };
    });
  });
  readonly calendarDate = computed(() => this.date() ? new Date(`${this.date()}T00:00:00`) : null);
  readonly disablePastDate = (day: Date): boolean => this.formatDate(day) < this.today();
  readonly specialties = signal<BookingSpecialty[]>([]);
  readonly filterSpecialty = (query: string, option: NzSelectItemInterface): boolean => {
    const item = this.specialties().find(item => item.id === option.nzValue);
    if (!item) return false;
    const normalize = (value: string) => this.decodeText(value).normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    return normalize(`${item.name} ${item.description ?? ''}`).includes(normalize(query).trim());
  };
  readonly services = signal<BookingService[]>([]);
  readonly schedules = signal<BookingSchedule[]>([]);
  readonly slots = signal<BookingTimeSlot[]>([]);
  readonly specialty = signal<BookingSpecialty | null>(null);
  readonly service = signal<BookingService | null>(null);
  readonly schedule = signal<BookingSchedule | null>(null);
  readonly slot = signal<BookingTimeSlot | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly booked = signal<AppointmentHistoryItem | null>(null);
  readonly accepted = signal(false);
  readonly decodeText = decodeAppointmentText;
  readonly showOtherDate = signal(false);
  reason = '';
  note = '';


  constructor() {
    afterNextRender(() => {
      const now = new Date();
      const date = this.formatDate(now);
      this.today.set(date);
      this.date.set(date);
      this.loadSpecialties();
    });
  }

  loadSpecialties(): void {
    this.loading.set(true);
    this.error.set('');
    this.appointmentService.getSpecialties()
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          if (!appointmentResponseSucceeded(res) || !Array.isArray(res.result)) {
            this.error.set(appointmentErrorMessage(res));
            return;
          }
          this.specialties.set(res.result);
        },
        error: error => this.error.set(appointmentErrorMessage(error))
      });
  }

  selectSpecialty(id: number): void {
    if (this.saving()) return;
    this.servicesRequest?.unsubscribe();
    this.clearSchedule();
    this.specialty.set(this.specialties().find(item => item.id === id) ?? null);
    this.service.set(null);
    this.services.set([]);
    this.error.set('');
    if (!this.specialty()) return;
    this.loading.set(true);
    this.servicesRequest = this.appointmentService.getServices(id)
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          if (!appointmentResponseSucceeded(res) || !Array.isArray(res.result)) {
            this.error.set(appointmentErrorMessage(res));
            return;
          }
          this.services.set(res.result);
        },
        error: error => this.error.set(appointmentErrorMessage(error))
      });
  }

  selectService(value: BookingService): void {
    if (this.saving() || value.price === null || value.price < 0) return;
    this.clearSchedule();
    this.service.set(value);
    this.error.set('');
  }

  changeDate(date: string): void {
    if (this.saving() || date === this.date()) return;
    this.date.set(date);
    this.loadSchedules();
  }

  changeCalendarDate(day: Date | null): void {
    if (day && Number.isFinite(day.getTime()) && !this.disablePastDate(day)) {
      this.changeDate(this.formatDate(day));
    }
  }

  private formatDate(day: Date): string {
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  }

  loadSchedules(): void {
    this.clearSchedule();
    this.error.set('');
    if (!this.specialty() || !/^\d{4}-\d{2}-\d{2}$/.test(this.date()) || this.date() < this.today()) {
      this.error.set('Vui lòng chọn ngày khám từ hôm nay trở đi.');
      return;
    }
    this.loading.set(true);
    this.schedulesRequest = this.appointmentService.getSchedules(this.specialty()!.id, this.date())
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          if (!appointmentResponseSucceeded(res) || !Array.isArray(res.result)) {
            this.error.set(appointmentErrorMessage(res));
            return;
          }
          this.schedules.set(res.result.filter(item => item.workDate === this.date()
            && item.status !== 'CANCELLED' && item.status !== 'CLOSED'));
        },
        error: error => this.error.set(appointmentErrorMessage(error))
      });
  }

  selectSchedule(value: BookingSchedule): void {
    if (this.saving()) return;
    this.slotsRequest?.unsubscribe();
    this.schedule.set(value);
    this.slot.set(null);
    this.slots.set([]);
  }

  loadTimeSlots(): void {
    this.slotsRequest?.unsubscribe();
    this.slot.set(null);
    this.slots.set([]);
    this.error.set('');
    const schedule = this.schedule();
    if (!schedule) return;
    this.loading.set(true);
    this.slotsRequest = this.appointmentService.getTimeSlots(schedule.id)
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          if (!appointmentResponseSucceeded(res) || !Array.isArray(res.result)) {
            this.error.set(appointmentErrorMessage(res));
            return;
          }
          this.slots.set(res.result.filter(item => item.scheduleId === schedule.id));
        },
        error: error => this.error.set(appointmentErrorMessage(error))
      });
  }

  slotAvailable(value: BookingTimeSlot): boolean {
    return value.status === 'AVAILABLE' && value.bookedCount < value.maxPatients
      && new Date(`${this.date()}T${value.startTime}`).getTime() > Date.now();
  }

  selectSlot(value: BookingTimeSlot): void {
    if (!this.saving() && this.slotAvailable(value)) this.slot.set(value);
  }

  next(): void {
    if (this.loading() || this.saving()) return;
    if (this.step() === 1 && this.service()) {
      this.step.set(2);
      this.loadSchedules();
    } else if (this.step() === 2 && this.schedule()) {
      this.step.set(3);
      this.loadTimeSlots();
    } else if (this.step() === 3 && this.slot() && this.slotAvailable(this.slot()!)) {
      this.error.set('');
      this.step.set(4);
    }
  }

  backTo(step: number): void {
    if (this.saving() || step < 1 || step >= this.step()) return;
    this.schedulesRequest?.unsubscribe();
    this.slotsRequest?.unsubscribe();
    this.step.set(step);
    this.error.set('');
    this.notice.set('');
  }

  retry(): void {
    if (this.step() === 1) {
      if (this.specialty()) this.selectSpecialty(this.specialty()!.id);
      else this.loadSpecialties();
    } else if (this.step() === 2) this.loadSchedules();
    else if (this.step() === 3) this.loadTimeSlots();
  }

  submit(): void {
    if (this.saving() || this.accepted() || this.step() !== 4) return;
    const service = this.service();
    const schedule = this.schedule();
    const slot = this.slot();
    if (!service || !schedule || !slot || !this.slotAvailable(slot)) {
      if (schedule) {
        this.notice.set('Vui lòng chọn lại một khung giờ còn khả dụng.');
        this.step.set(3);
        this.loadTimeSlots();
      } else this.error.set('Vui lòng chọn lại dịch vụ và ca khám.');
      return;
    }
    if (this.reason.length > 2000 || this.note.length > 2000) {
      this.error.set('Lý do khám và ghi chú không được vượt quá 2.000 ký tự.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.appointmentService.createAppointment({
      doctorId: schedule.doctorId, serviceId: service.id, timeSlotId: slot.id,
      appointmentDate: this.date(), reason: this.reason.trim() || undefined,
      note: this.note.trim() || undefined
    }).pipe(finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          if (!appointmentResponseSucceeded(res)) {
            if (isUnavailableSlotResponse(res)) {
              this.notice.set(appointmentErrorMessage(res));
              this.step.set(3);
              this.loadTimeSlots();
            } else this.error.set(appointmentErrorMessage(res));
            return;
          }
          this.accepted.set(true);
          if (!res.result?.id || !res.result.appointmentCode) {
            // An accepted booking must not be retried blindly if its response is incomplete.
            this.notice.set('Yêu cầu đã được tiếp nhận. Vui lòng kiểm tra lịch hẹn của bạn trước khi đặt lại.');
            return;
          }
          this.booked.set(res.result);
        },
        error: error => this.error.set(appointmentErrorMessage(error))
      });
  }

  private clearSchedule(): void {
    this.schedulesRequest?.unsubscribe();
    this.slotsRequest?.unsubscribe();
    this.schedule.set(null);
    this.schedules.set([]);
    this.slot.set(null);
    this.slots.set([]);
    this.notice.set('');
  }
}
