import { afterNextRender, Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, exhaustMap, expand, finalize, forkJoin, of, reduce, Subscription, take, throwError, timer } from 'rxjs';
import { NzQRCodeModule } from 'ng-zorro-antd/qr-code';
import { SiteHeader } from '../../components/site-header/site-header';
import { PaymentService } from '../../services/payment.service';
import { AppointmentService } from '../../services/appointment/appointment.service';
import { AuthService } from '../../services/auth.service';
import { AppointmentHistoryItem } from '../../models/appointment.model';
import { Payment, PaymentTransaction, PayosCheckout, PayosStatus } from '../../models/payment.model';
import { clinicDate, paymentError, paymentLabels, safeCheckoutUrl, statusMessage, validTxnRef } from '../../utils/payment.utils';
import { appointmentResponseSucceeded } from '../../utils/appointment/appointment-ui.utils';

@Component({
  standalone: true,
  imports: [SiteHeader, RouterLink, CurrencyPipe, DatePipe, NzQRCodeModule],
  templateUrl: './patient-payment.html', styleUrl: './payment.css'
})
export class PatientPayment {
  private readonly api = inject(PaymentService);
  private readonly appointments = inject(AppointmentService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly generation = this.auth.sessionGeneration();
  private poll?: Subscription;
  private requests = new Subscription();
  readonly appointmentId = signal<number | null>(null);
  readonly appointment = signal<AppointmentHistoryItem | null>(null);
  readonly payment = signal<Payment | null>(null);
  readonly history = signal<PaymentTransaction[]>([]);
  readonly checkout = signal<PayosCheckout | null>(null);
  readonly transaction = signal<PayosStatus | null>(null);
  readonly txnRef = signal<string | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly ready = signal(false);
  readonly uncertain = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly labels = paymentLabels;
  readonly clinicDate = clinicDate;
  readonly statusMessage = statusMessage;
  readonly safeCheckoutUrl = safeCheckoutUrl;
  private readonly now = signal(Date.now());
  readonly remainingSeconds = computed(() => {
    const expiresAt = clinicDate(this.checkout()?.expiresAt);
    const deadline = expiresAt ? Date.parse(expiresAt) : NaN;
    return Number.isFinite(deadline) ? Math.max(0, Math.ceil((deadline - this.now()) / 1000)) : null;
  });
  readonly expired = computed(() => this.remainingSeconds() === 0);
  readonly countdown = computed(() => {
    const remaining = this.remainingSeconds();
    if (remaining === null) return '—';
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    const pad = (value: number) => String(value).padStart(2, '0');
    return hours ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
  });

  constructor() {
    effect(() => {
      if (this.auth.sessionGeneration() !== this.generation) {
        this.poll?.unsubscribe(); this.requests.unsubscribe();
        this.checkout.set(null); this.transaction.set(null); this.payment.set(null);
        this.appointment.set(null); this.history.set([]); this.ready.set(false); this.txnRef.set(null);
        this.appointmentId.set(null);
      }
    });
    this.destroyRef.onDestroy(() => { this.poll?.unsubscribe(); this.requests.unsubscribe(); });
    afterNextRender(() => {
      this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
        this.poll?.unsubscribe(); this.requests.unsubscribe(); this.requests = new Subscription();
        this.checkout.set(null); this.transaction.set(null); this.history.set([]);
        this.appointment.set(null); this.payment.set(null); this.appointmentId.set(null); this.notice.set('');
        this.txnRef.set(null); this.ready.set(false); this.uncertain.set(false); this.error.set('');
        const id = Number(params.get('id'));
        const order = this.route.snapshot.queryParamMap.get('orderCode') ?? this.api.latestTransaction();
        const isResult = this.route.snapshot.data['paymentResult'] === true;
        if (isResult) {
          if (!validTxnRef(order)) { this.error.set('Thiếu mã giao dịch hợp lệ. Mở lại thanh toán từ chi tiết lịch hẹn.'); return; }
          this.txnRef.set(order);
          this.appointmentId.set(this.api.appointmentFor(order));
          if (this.appointmentId()) this.loadOverview();
          this.refresh();
        } else if (Number.isSafeInteger(id) && id > 0) {
          this.appointmentId.set(id);
          this.txnRef.set(this.api.transactionFor(id));
          this.uncertain.set(this.api.isUncertain(id));
          this.loadOverview();
        } else this.error.set('Mã lịch hẹn không hợp lệ.');
      });
      timer(0, 1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.now.set(Date.now());
      });
    });
  }
  private active(): boolean { return this.generation === this.auth.sessionGeneration() && !this.destroyRef.destroyed; }

  loadOverview(): void {
    const id = this.appointmentId();
    if (!id || !this.active() || this.loading()) return;
    this.loading.set(true); this.ready.set(false); this.error.set('');
    this.requests.add(forkJoin({
      appointment: this.appointments.getMyAppointment(id),
      payment: this.api.forAppointment(id).pipe(catchError(error =>
        error.status === 404 || error.error?.code === 9201 ? of(null) : throwError(() => error)))
    }).pipe(finalize(() => {
      this.loading.set(false);
      this.autoInitPayment();
    })).subscribe({
      next: data => {
        if (!this.active()) return;
        if (!appointmentResponseSucceeded(data.appointment) || !data.appointment.result) {
          this.error.set('Không thể xác minh lịch hẹn. Vui lòng tải lại.'); return;
        }
        this.appointment.set(data.appointment.result); this.payment.set(data.payment);
        if (data.payment) this.loadHistory(data.payment.id);
        else { this.history.set([]); this.ready.set(true); }
      }, error: error => { if (this.active()) this.error.set(paymentError(error)); }
    }));
  }
  private loadHistory(paymentId: number): void {
    this.requests.add(this.api.transactions(paymentId).pipe(
      expand(page => page.last ? EMPTY : this.api.transactions(paymentId, page.number + 1)),
      reduce((all, page) => [...all, ...page.content], [] as PaymentTransaction[])
    ).subscribe({
      next: items => {
        if (!this.active()) return;
        this.history.set(items); this.ready.set(true);
        const pending = items.find(item => item.provider === 'PAYOS' && ['PENDING', 'REVIEW_REQUIRED'].includes(item.status));
        const saved = this.txnRef();
        const candidate = this.route.snapshot.data['paymentResult'] === true && saved
          ? items.find(item => item.txnRef === saved && item.provider === 'PAYOS')
          : pending ?? items.find(item => item.txnRef === saved && item.provider === 'PAYOS');
        if (candidate && !this.transaction()) {
          this.txnRef.set(candidate.txnRef);
          this.api.remember(this.appointmentId()!, candidate.txnRef);
          this.transaction.set(candidate);
          if (candidate.status === 'PENDING') this.startPoll();
        }
        if (items.length && !items.some(item => ['PENDING', 'REVIEW_REQUIRED'].includes(item.status))) {
          this.uncertain.set(false); this.api.markUncertain(this.appointmentId()!, false);
        }
        this.autoInitPayment();
      }, error: error => { if (this.active()) this.error.set(paymentError(error)); }
    }));
  }
  autoInitPayment(): void {
    if (!this.active()) return;
    if (this.route.snapshot.data['paymentResult'] === true) return;
    if (this.checkout() || this.busy()) return;
    if (this.payment()?.paymentStatus === 'SUCCESS' || this.transaction()?.status === 'SUCCESS') return;
    if (!this.ready() || this.loading()) {
      setTimeout(() => { if (this.active()) this.autoInitPayment(); }, 150);
      return;
    }
    if (this.canCreate() || this.canResume()) {
      this.create();
    }
  }
  canCreate(): boolean {
    const appointment = this.appointment();
    return this.active() && this.ready() && !this.busy() && !this.loading() && !this.uncertain()
      && !!appointment && ['PENDING', 'CONFIRMED', 'COMPLETED'].includes(appointment.status)
      && !['SUCCESS', 'REFUNDED'].includes(this.payment()?.paymentStatus ?? '')
      && !['PENDING', 'SUCCESS', 'REVIEW_REQUIRED'].includes(this.transaction()?.status ?? '')
      && (!this.txnRef() || !!this.transaction())
      && !this.history().some(item => ['PENDING', 'SUCCESS', 'REVIEW_REQUIRED'].includes(item.status));
  }
  create(): void {
    if (!this.canCreate() && !this.canResume()) return;
    const id = this.appointmentId()!;
    this.poll?.unsubscribe(); this.busy.set(true); this.error.set(''); this.checkout.set(null);
    this.requests.add(this.api.create(id).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: checkout => {
        if (!this.active()) return;
        if (!validTxnRef(checkout.txnRef)) { this.uncertain.set(true); this.api.markUncertain(id, true); this.error.set('BE chưa trả mã giao dịch hợp lệ. Kiểm tra khoản thu trước khi tiếp tục.'); return; }
        this.api.remember(id, checkout.txnRef); this.txnRef.set(checkout.txnRef);
        this.api.markUncertain(id, false); this.uncertain.set(false);
        this.checkout.set(checkout);
        this.now.set(Date.now());
        this.transaction.set({ ...checkout, status: 'PENDING', providerStatus: null, paidAt: null });
        this.notice.set('Quét mã hoặc mở payOS để thanh toán. Giữ trang này để theo dõi kết quả.');
        this.startPoll();
      }, error: error => {
        if (!this.active()) return;
        this.error.set(paymentError(error));
        const ref = error.error?.result?.txnRef;
        if (validTxnRef(ref)) { this.txnRef.set(ref); this.api.remember(id, ref); }
        // An ambiguous POST is never retried automatically, including after a reload.
        if (error.status === 0 || error.status >= 500 || error.name === 'TimeoutError' || error.error?.code === 9101) {
          this.uncertain.set(true); this.api.markUncertain(id, true);
        }
      }
    }));
  }
  canResume(): boolean {
    return this.active() && this.ready() && !this.busy() && !this.loading() && !this.uncertain()
      && !this.checkout() && this.transaction()?.status === 'PENDING'
      && !!this.appointment() && ['PENDING', 'CONFIRMED', 'COMPLETED'].includes(this.appointment()!.status)
      && !['SUCCESS', 'REFUNDED'].includes(this.payment()?.paymentStatus ?? '')
      && !this.history().some(item => item.status === 'REVIEW_REQUIRED' || item.status === 'SUCCESS'
        || (item.provider !== 'PAYOS' && item.status === 'PENDING'));
  }
  refresh(): void {
    const ref = this.txnRef();
    if (!ref || this.busy() || !this.active()) return;
    this.poll?.unsubscribe(); this.busy.set(true); this.error.set(''); this.notice.set('');
    this.requests.add(this.api.status(ref, true).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: status => {
        if (!this.active()) return;
        this.accept(status);
        if (status.status === 'PENDING') this.startPoll();
        this.loadOverview();
      }, error: error => { if (this.active()) this.error.set(paymentError(error)); }
    }));
  }
  checkTransaction(txnRef: string): void {
    if (this.busy()) return;
    this.checkout.set(null); this.txnRef.set(txnRef); this.transaction.set(null); this.refresh();
  }
  private accept(status: PayosStatus): void {
    this.transaction.set(status);
    if (status.status !== 'PENDING') {
      this.poll?.unsubscribe();
      this.uncertain.set(false);
      if (this.appointmentId()) this.api.markUncertain(this.appointmentId()!, false);
    }
  }
  private startPoll(): void {
    this.poll?.unsubscribe();
    const ref = this.txnRef();
    if (!ref) return;
    this.poll = timer(4000, 4000).pipe(take(45), exhaustMap(() =>
      this.api.status(ref).pipe(catchError(error => {
        if (this.active()) this.error.set(paymentError(error));
        return EMPTY;
      })))
    ).subscribe({
      next: status => {
        if (!this.active()) return;
        this.accept(status);
        if (status.status !== 'PENDING') this.loadOverview();
      }, complete: () => {
        if (this.active() && this.transaction()?.status === 'PENDING') this.notice.set('Đã tạm dừng tự kiểm tra. Bạn có thể bấm Kiểm tra lại; nếu đã chuyển tiền, không thanh toán thêm.');
      }
    });
  }
}
