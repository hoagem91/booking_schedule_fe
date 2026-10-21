import { afterNextRender, Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';
import { AppointmentService } from '../../services/appointment/appointment.service';
import { AppointmentHistoryItem } from '../../models/appointment.model';
import { appointmentErrorMessage, appointmentResponseSucceeded, appointmentStatusLabels,
  decodeAppointmentText } from '../../utils/appointment-ui.utils';

@Component({
  selector: 'app-appointment-detail', standalone: true,
  imports: [RouterLink, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './appointment-detail.html', styleUrl: './appointment-detail.css'
})
export class AppointmentDetail {
  private readonly appointmentService = inject(AppointmentService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly actionDialog = viewChild<ElementRef<HTMLDialogElement>>('actionDialog');
  private request?: Subscription;
  private currentId = 0;
  readonly appointment = signal<AppointmentHistoryItem | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly actionError = signal('');
  readonly feedback = signal('');
  readonly action = signal<'cancel' | 'review' | null>(null);
  readonly decodeText = decodeAppointmentText;
  readonly statusLabels = appointmentStatusLabels;
  readonly stars = [1, 2, 3, 4, 5];
  cancelNote = '';
  rating = 0;
  comment = '';

  constructor() {
    afterNextRender(() => {
      this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
        this.closeAction();
        this.currentId = Number(params.get('id'));
        this.feedback.set('');
        this.load();
      });
    });
  }

  load(): void {
    this.request?.unsubscribe();
    this.error.set('');
    this.appointment.set(null);
    if (!Number.isSafeInteger(this.currentId) || this.currentId <= 0) {
      this.error.set('Mã lịch hẹn không hợp lệ. Vui lòng quay lại danh sách.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.request = this.appointmentService.getMyAppointment(this.currentId)
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          if (!appointmentResponseSucceeded(res) || !res.result?.id) {
            this.error.set(appointmentErrorMessage(res));
            return;
          }
          this.appointment.set(res.result);
        },
        error: error => this.error.set(appointmentErrorMessage(error))
      });
  }

  canCancel(item: AppointmentHistoryItem): boolean {
    // The cancellation window is configured on the server, which makes the final decision.
    return (item.status === 'PENDING' || item.status === 'CONFIRMED')
      && new Date(`${item.appointmentDate}T${item.startTime}`).getTime() > Date.now();
  }

  openAction(action: 'cancel' | 'review'): void {
    const item = this.appointment();
    if (!item || this.saving() || (action === 'cancel' ? !this.canCancel(item)
      : item.status !== 'COMPLETED' || !item.reviewEligible)) return;
    this.action.set(action);
    this.actionError.set('');
    this.cancelNote = '';
    this.rating = 0;
    this.comment = '';
    this.actionDialog()?.nativeElement.showModal();
  }

  closeAction(): void {
    if (this.saving()) return;
    this.actionDialog()?.nativeElement.close();
    this.action.set(null);
  }

  onDialogCancel(event: Event): void {
    if (this.saving()) event.preventDefault();
    else this.action.set(null);
  }

  submitAction(): void {
    const item = this.appointment();
    const action = this.action();
    if (!item || !action || this.saving()) return;
    if (action === 'cancel' && !this.canCancel(item)) {
      this.actionError.set('Lịch hẹn hiện không thể hủy. Vui lòng tải lại thông tin.');
      return;
    }
    if (action === 'review' && (item.status !== 'COMPLETED' || !item.reviewEligible
      || !Number.isInteger(this.rating) || this.rating < 1 || this.rating > 5)) {
      this.actionError.set('Vui lòng chọn mức đánh giá từ 1 đến 5 sao.');
      return;
    }
    if (this.cancelNote.length > 2000 || this.comment.length > 2000) {
      this.actionError.set('Nội dung không được vượt quá 2.000 ký tự.');
      return;
    }
    this.saving.set(true);
    this.actionError.set('');
    if (action === 'cancel') {
      this.appointmentService.cancelMyAppointment(item.id, this.cancelNote.trim())
        .pipe(finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: res => {
            if (!appointmentResponseSucceeded(res) || !res.result?.id) {
              this.actionError.set(appointmentErrorMessage(res));
              return;
            }
            this.appointment.set(res.result);
            this.finishAction('Lịch hẹn đã được hủy thành công.');
          },
          error: error => this.actionError.set(appointmentErrorMessage(error))
        });
    } else {
      this.appointmentService.reviewMyAppointment(item.id, {
        rating: this.rating, comment: this.comment.trim() || undefined
      }).pipe(finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: res => {
            if (!appointmentResponseSucceeded(res) || !res.result?.id) {
              this.actionError.set(appointmentErrorMessage(res));
              return;
            }
            this.appointment.set({ ...item, reviewEligible: false });
            this.finishAction('Cảm ơn bạn! Đánh giá của bạn đã được gửi.');
          },
          error: error => this.actionError.set(appointmentErrorMessage(error))
        });
    }
  }

  private finishAction(message: string): void {
    this.feedback.set(message);
    this.actionDialog()?.nativeElement.close();
    this.action.set(null);
  }
}
