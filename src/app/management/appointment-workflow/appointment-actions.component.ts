import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { take } from 'rxjs';
import { AppointmentHistoryItem } from '../../models/appointment.model';
import { ManagementAccessService } from '../services/management-access.service';
import { AppointmentActionClock } from './appointment-action-clock.service';
import { AppointmentActionDialog, AppointmentActionDialogData } from './appointment-action-dialog';
import {
  AppointmentAction,
  AppointmentActionOption,
  AppointmentActionResult,
  appointmentActions
} from './appointment-actions.policy';

/** Cấu hình màu sắc và icon cho từng action */
const ACTION_STYLE: Record<AppointmentAction, { icon: string; colorClass: string; danger: boolean }> = {
  confirm: { icon: 'check-circle', colorClass: 'action-btn--confirm', danger: false },
  'in-progress': { icon: 'play-circle', colorClass: 'action-btn--in-progress', danger: false },
  complete: { icon: 'check-square', colorClass: 'action-btn--complete', danger: false },
  cancel: { icon: 'close-circle', colorClass: 'action-btn--cancel', danger: true },
  'no-show': { icon: 'minus-circle', colorClass: 'action-btn--no-show', danger: true }
};

@Component({
  selector: 'app-appointment-actions', standalone: true,
  imports: [NzButtonModule, NzDropDownModule, NzIconModule, NzToolTipModule],
  template: `
    @if (options().length) {
      @if (compact()) {
        <button type="button" nz-button nzSize="small" nz-dropdown [nzDropdownMenu]="actionMenu" nzTrigger="click"
                [disabled]="dialogOpen()"
                [attr.aria-label]="'Xử lý lịch hẹn ' + appointment().appointmentCode">
          <nz-icon nzType="setting" />
          Xử lý
        </button>
        <nz-dropdown-menu #actionMenu="nzDropdownMenu">
          <ul nz-menu role="menu">
            @for (option of options(); track option.action) {
              <li nz-menu-item role="menuitem" [attr.aria-disabled]="!!option.disabledReason"
                  [nzDisabled]="!!option.disabledReason" [title]="option.disabledReason"
                  (click)="open(option)">
                <nz-icon [nzType]="actionStyle(option.action).icon" style="margin-right:6px" />
                {{ option.label }}
              </li>
            }
          </ul>
        </nz-dropdown-menu>
      } @else {
        @for (option of options(); track option.action) {
          <span [title]="option.disabledReason">
            <button nz-button nzType="default" type="button"
                    [class]="'action-btn ' + actionStyle(option.action).colorClass"
                    [nzDanger]="actionStyle(option.action).danger"
                    [disabled]="dialogOpen() || !!option.disabledReason"
                    (click)="open(option)">
              <nz-icon [nzType]="actionStyle(option.action).icon" />
              {{ option.label }}
            </button>
          </span>
        }
      }
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* Base action button */
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
      border-width: 1.5px;
    }

    /* Xác nhận — xanh lá */
    .action-btn--confirm {
      color: #16a34a;
      border-color: #16a34a;
      background: #f0fdf4;
    }

    .action-btn--confirm:not([disabled]):hover {
      background: #dcfce7 !important;
      border-color: #15803d !important;
      color: #15803d !important;
    }

    /* Bắt đầu khám — xanh dương */
    .action-btn--in-progress {
      color: #2563eb;
      border-color: #2563eb;
      background: #eff6ff;
    }

    .action-btn--in-progress:not([disabled]):hover {
      background: #dbeafe !important;
      border-color: #1d4ed8 !important;
      color: #1d4ed8 !important;
    }

    /* Hoàn thành — tím/indigo */
    .action-btn--complete {
      color: #7c3aed;
      border-color: #7c3aed;
      background: #f5f3ff;
    }

    .action-btn--complete:not([disabled]):hover {
      background: #ede9fe !important;
      border-color: #6d28d9 !important;
      color: #6d28d9 !important;
    }

    /* Hủy — đỏ (nzDanger handles color, override bg) */
    .action-btn--cancel {
      background: #fff5f5;
    }

    .action-btn--cancel:not([disabled]):hover {
      background: #fee2e2 !important;
    }

    /* Không đến — cam */
    .action-btn--no-show {
      color: #d97706;
      border-color: #d97706;
      background: #fffbeb;
    }

    .action-btn--no-show:not([disabled]):hover {
      background: #fef3c7 !important;
      border-color: #b45309 !important;
      color: #b45309 !important;
    }

    /* Disabled state */
    .action-btn[disabled] {
      opacity: 0.45;
      cursor: not-allowed;
    }
  `]
})
export class AppointmentActionsComponent {
  readonly appointment = input.required<AppointmentHistoryItem>();
  readonly compact = input(false);
  readonly refreshRequested = output<AppointmentActionResult>();
  readonly dialogOpen = signal(false);
  private readonly access = inject(ManagementAccessService);
  private readonly clock = inject(AppointmentActionClock);
  private readonly modals = inject(NzModalService);
  private readonly destroyRef = inject(DestroyRef);
  private modal: NzModalRef<AppointmentActionDialog, AppointmentActionResult> | null = null;
  readonly options = computed(() => this.access.can('appointments:update-status')
    ? appointmentActions(this.appointment(), this.clock.now()) : []);

  protected actionStyle(action: AppointmentAction) {
    return ACTION_STYLE[action];
  }

  constructor() {
    this.destroyRef.onDestroy(() => this.modal?.destroy());
  }

  open(option: AppointmentActionOption): void {
    if (this.dialogOpen() || !this.access.can('appointments:update-status')) return;
    const current = appointmentActions(this.appointment()).find(item => item.action === option.action);
    if (!current || current.disabledReason) return;
    this.dialogOpen.set(true);
    this.modal = this.modals.create<AppointmentActionDialog, AppointmentActionDialogData, AppointmentActionResult>({
      nzTitle: current.label, nzContent: AppointmentActionDialog, nzFooter: null,
      nzWidth: 480, nzMaskClosable: false,
      nzOnCancel: () => {
        this.modal?.getContentComponent()?.close();
        return false;
      },
      nzData: { appointment: { ...this.appointment() }, action: current.action }
    });
    this.modal.afterClose.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe(result => {
      this.modal = null;
      this.dialogOpen.set(false);
      if (result?.refresh) this.refreshRequested.emit(result);
    });
  }
}
