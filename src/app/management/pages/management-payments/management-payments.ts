import { afterNextRender, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize, forkJoin, Subscription } from 'rxjs';
import { PaymentService } from '../../../services/payment.service';
import { AuthService } from '../../../services/auth.service';
import { Payment, PaymentPage, PaymentStatus, PaymentTransaction, TransactionStatus } from '../../../models/payment.model';
import { clinicDate, paymentError, paymentLabels, validTxnRef } from '../../../utils/payment.utils';

@Component({
  standalone: true, imports: [FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './management-payments.html', styleUrl: './management-payments.css'
})
export class ManagementPayments {
  private readonly api = inject(PaymentService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly generation = this.auth.sessionGeneration();
  private listRequest?: Subscription;
  private detailRequest?: Subscription;
  private refreshRequest?: Subscription;
  readonly mode = signal<'payments' | 'transactions'>('payments');
  readonly payments = signal<PaymentPage<Payment> | null>(null);
  readonly transactions = signal<PaymentPage<PaymentTransaction> | null>(null);
  readonly selected = signal<Payment | null>(null);
  readonly selectedTransaction = signal<PaymentTransaction | null>(null);
  readonly history = signal<PaymentPage<PaymentTransaction> | null>(null);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly refreshing = signal(false);
  readonly error = signal('');
  readonly detailError = signal('');
  readonly feedback = signal('');
  readonly labels = paymentLabels;
  readonly clinicDate = clinicDate;
  readonly paymentStatuses: PaymentStatus[] = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'];
  readonly transactionStatuses: TransactionStatus[] = ['PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'REVIEW_REQUIRED'];
  keyword = ''; paymentStatus: PaymentStatus | '' = ''; transactionStatus: TransactionStatus | '' = '';
  fromDate = ''; toDate = ''; appointmentId: number | null = null; paymentId: number | null = null; txnRef = '';

  constructor() {
    const cancel = () => { this.listRequest?.unsubscribe(); this.detailRequest?.unsubscribe(); this.refreshRequest?.unsubscribe(); };
    this.destroyRef.onDestroy(cancel);
    effect(() => {
      if (!this.active()) { cancel(); this.payments.set(null); this.transactions.set(null); this.selected.set(null); this.selectedTransaction.set(null); this.history.set(null); }
    });
    afterNextRender(() => {
      if (this.route?.snapshot.queryParamMap.get('reviewRequired') === 'true') this.needsReview();
      else this.search();
    });
  }
  private active(): boolean { return !this.destroyRef.destroyed && this.auth.sessionGeneration() === this.generation; }
  changeMode(mode: 'payments' | 'transactions'): void {
    if (this.refreshing()) return;
    this.mode.set(mode); this.closeDetail(); this.search();
  }
  needsReview(): void {
    if (this.refreshing()) return;
    this.transactionStatus = 'REVIEW_REQUIRED'; this.paymentId = null; this.txnRef = '';
    this.mode.set('transactions'); this.closeDetail(); this.search();
  }
  search(page = 0): void {
    if (!this.active()) return;
    this.error.set('');
    if (this.mode() === 'payments' && this.fromDate && this.toDate && this.fromDate > this.toDate) { this.error.set('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.'); return; }
    if (this.keyword.length > 100) { this.error.set('Từ khóa tối đa 100 ký tự.'); return; }
    const id = this.mode() === 'payments' ? this.appointmentId : this.paymentId;
    if (id != null && (!Number.isSafeInteger(id) || id <= 0)) { this.error.set('ID phải là số nguyên dương.'); return; }
    if (this.mode() === 'transactions' && this.txnRef.trim() && !validTxnRef(this.txnRef.trim())) { this.error.set('Mã giao dịch payOS phải là mã số chính xác.'); return; }
    this.listRequest?.unsubscribe(); this.loading.set(true);
    if (this.mode() === 'payments') {
      this.listRequest = this.api.searchPayments({ paymentMethod: 'PAYOS', paymentStatus: this.paymentStatus || undefined,
        keyword: this.keyword.trim() || undefined, fromDate: this.fromDate || undefined, toDate: this.toDate || undefined,
        appointmentId: this.appointmentId ?? undefined }, page).pipe(finalize(() => this.loading.set(false))).subscribe({
        next: result => { if (this.active()) this.payments.set(result); },
        error: error => { if (this.active()) { this.payments.set(null); this.error.set(paymentError(error)); } }
      });
    } else {
      this.listRequest = this.api.searchTransactions({ provider: 'PAYOS', status: this.transactionStatus || undefined,
        paymentId: this.paymentId ?? undefined, txnRef: this.txnRef.trim() || undefined }, page)
        .pipe(finalize(() => this.loading.set(false))).subscribe({
          next: result => { if (this.active()) this.transactions.set(result); },
          error: error => { if (this.active()) { this.transactions.set(null); this.error.set(paymentError(error)); } }
        });
    }
  }
  currentPage() { return this.mode() === 'payments' ? this.payments() : this.transactions(); }
  openPayment(id: number): void {
    if (this.refreshing() || !this.active()) return;
    this.closeDetail(); this.detailLoading.set(true);
    this.fetchPayment(id);
  }
  private fetchPayment(id: number, historyPage = 0): void {
    this.detailRequest?.unsubscribe(); this.detailLoading.set(true); this.detailError.set('');
    this.detailRequest = forkJoin({ payment: this.api.adminPayment(id),
      history: this.api.searchTransactions({ provider: 'PAYOS', paymentId: id }, historyPage) })
      .pipe(finalize(() => this.detailLoading.set(false))).subscribe({
        next: result => { if (this.active()) { this.selected.set(result.payment); this.history.set(result.history); } },
        error: error => { if (this.active()) this.detailError.set(paymentError(error)); }
      });
  }
  openTransaction(txnRef: string): void {
    if (this.refreshing() || !this.active()) return;
    this.closeDetail(); this.fetchTransaction(txnRef);
  }
  private fetchTransaction(txnRef: string): void {
    this.detailRequest?.unsubscribe(); this.detailLoading.set(true); this.detailError.set('');
    this.detailRequest = this.api.adminTransaction(txnRef).subscribe({
      next: transaction => {
        if (!this.active()) return;
        this.selectedTransaction.set(transaction); this.fetchPayment(transaction.paymentId);
      }, error: error => { if (this.active()) { this.detailLoading.set(false); this.detailError.set(paymentError(error)); } }
    });
  }
  historyPage(page: number): void {
    if (this.selected() && !this.detailLoading() && !this.refreshing()) this.fetchPayment(this.selected()!.id, page);
  }
  refresh(txnRef: string): void {
    if (this.refreshing() || !this.active()) return;
    this.refreshing.set(true); this.detailError.set(''); this.feedback.set('');
    this.refreshRequest = this.api.status(txnRef, true, true).pipe(finalize(() => this.refreshing.set(false))).subscribe({
      next: result => {
        if (!this.active()) return;
        this.feedback.set(`Đã kiểm tra ${result.txnRef}: ${this.labels[result.status]}.`);
        // Refresh both the aggregate payment and the transaction history, even if status did not change.
        this.fetchTransaction(txnRef); this.search(this.currentPage()?.number ?? 0);
      }, error: error => { if (this.active()) this.detailError.set(paymentError(error)); }
    });
  }
  closeDetail(): void {
    if (this.refreshing()) return;
    this.detailRequest?.unsubscribe(); this.selected.set(null); this.selectedTransaction.set(null); this.history.set(null);
    this.detailError.set(''); this.feedback.set(''); this.detailLoading.set(false);
  }
  clearFilters(): void {
    this.keyword = ''; this.paymentStatus = ''; this.transactionStatus = ''; this.fromDate = ''; this.toDate = '';
    this.appointmentId = null; this.paymentId = null; this.txnRef = ''; this.search();
  }
}
