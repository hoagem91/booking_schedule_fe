import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { EMPTY, finalize, switchMap } from 'rxjs';
import { AppointmentHistoryItem } from '../../models/appointment.model';
import { apiResponseSucceeded } from '../../models/api-response.model';
import { AuthService } from '../../services/auth.service';
import { ManagementAccessService } from '../services/management-access.service';
import { ManagementAppointmentsService } from '../services/management-appointments.service';
import { actionDefinitions, actionError, AppointmentAction, AppointmentActionResult, appointmentActions } from './appointment-actions.policy';

export interface AppointmentActionDialogData { appointment: AppointmentHistoryItem; action: AppointmentAction; }

@Component({
  standalone: true, imports: [ReactiveFormsModule, NzButtonModule, NzInputModule],
  template: `
    <p>{{ definition.description }}</p>
    <p><strong>{{ data.appointment.appointmentCode }}</strong> · {{ data.appointment.patientName }}</p>
    <form [formGroup]="form" (ngSubmit)="submit()" [attr.aria-busy]="busy()">
      <label
        for="workflow-note">{{ data.action === 'cancel' ? 'Lý do hủy (bắt buộc)' : 'Ghi chú (không bắt buộc)' }}</label>
      <textarea nz-input id="workflow-note" formControlName="note" rows="3" maxlength="2000" [readOnly]="busy()"
                [attr.aria-invalid]="form.controls.note.touched && form.controls.note.invalid"
                aria-describedby="workflow-validation"></textarea>
      @if (form.controls.note.touched && form.controls.note.invalid) {
        <p id="workflow-validation" class="error"
           role="alert">{{ data.action === 'cancel' ? 'Vui lòng nhập lý do hủy, tối đa 2.000 ký tự.' : 'Ghi chú tối đa 2.000 ký tự.' }}</p>
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      <div class="footer">
        <button nz-button type="button" [disabled]="busy()"
                (click)="close()">{{ needsRefresh() ? 'Đóng và tải lại' : 'Quay lại' }}
        </button>
        <button nz-button nzType="primary" type="submit" [nzDanger]="data.action === 'cancel'" [nzLoading]="busy()"
                [disabled]="busy() || needsRefresh()">{{ definition.label }}
        </button>
      </div>
    </form>
  `,
  styles: [`p{line-height:1.7;overflow-wrap:anywhere}label{display:block;margin:18px 0 8px;font-size:13px;font-weight:600}.error{color:#ac302b;background:#fff2ef;padding:10px;border-radius:6px;font-size:13px}.footer{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px;margin-top:22px}`],
})
export class AppointmentActionDialog {
  readonly data = inject<AppointmentActionDialogData>(NZ_MODAL_DATA);
  readonly definition = actionDefinitions[this.data.action];
  readonly busy = signal(false);
  readonly error = signal('');
  readonly needsRefresh = signal(false);
  private readonly api = inject(ManagementAppointmentsService);
  private readonly access = inject(ManagementAccessService);
  private readonly auth = inject(AuthService);
  private readonly generation = this.auth.sessionGeneration();
  private readonly ref = inject<NzModalRef<AppointmentActionDialog, AppointmentActionResult>>(NzModalRef);
  private readonly destroyRef = inject(DestroyRef);
  readonly form = inject(FormBuilder).nonNullable.group({ note: ['', this.data.action === 'cancel'
    ? [Validators.required, Validators.pattern(/\S/), Validators.maxLength(2000)] : [Validators.maxLength(2000)]] });

  close(): void { if (!this.busy()) this.ref.close({ refresh: this.needsRefresh() }); }

  submit(): void {
    if (this.busy() || this.needsRefresh()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    if (!this.authorized()) return;
    this.busy.set(true); this.error.set('');
    this.ref.updateConfig({ nzClosable: false, nzKeyboard: false, nzMaskClosable: false });
    this.api.getAppointmentDetail(this.data.appointment.id).pipe(
      switchMap(response => {
        if (!this.authorized()) return EMPTY;
        if (!apiResponseSucceeded(response) || !response.result || response.result.id !== this.data.appointment.id) {
          this.fail(response.code); return EMPTY;
        }
        const fresh = response.result;
        const action = appointmentActions(fresh).find(option => option.action === this.data.action);
        if (fresh.status !== this.data.appointment.status || !action) {
          this.error.set('Lịch hẹn vừa thay đổi trạng thái. Vui lòng đóng hộp thoại để tải lại dữ liệu.');
          this.needsRefresh.set(true); return EMPTY;
        }
        if (action.disabledReason) { this.error.set(action.disabledReason); return EMPTY; }
        return this.api.transition(fresh.id, this.data.action, this.form.controls.note.value.trim() || undefined);
      }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.busy.set(false);
        if (!this.destroyRef.destroyed) this.ref.updateConfig({ nzClosable: true, nzKeyboard: true });
      }),
    ).subscribe({
      next: response => {
        if (!this.authorized()) return;
        if (apiResponseSucceeded(response)) {
          if (response.result?.id === this.data.appointment.id && response.result.status === this.definition.target) {
            this.ref.close({ changed: true, refresh: true, appointment: response.result });
          } else {
            this.error.set('Máy chủ đã tiếp nhận yêu cầu. Vui lòng đóng hộp thoại và tải lại để kiểm tra kết quả.');
            this.needsRefresh.set(true);
          }
        } else this.fail(response.code);
      },
      error: () => { this.error.set('Không thể kết nối máy chủ. Bạn có thể thử lại để kiểm tra trạng thái hiện tại.'); },
    });
  }

  private authorized(): boolean {
    if (this.generation === this.auth.sessionGeneration() && this.auth.isAuthenticated() && this.access.can('appointments:update-status')) return true;
    this.error.set('Phiên đăng nhập hoặc quyền thao tác đã thay đổi. Vui lòng đóng hộp thoại.');
    this.needsRefresh.set(true); return false;
  }
  private fail(code: number): void {
    this.error.set(actionError({ code }));
    if ([8005, 409, 8001, 404, 1007, 403, 1006, 401].includes(code)) this.needsRefresh.set(true);
  }
}
