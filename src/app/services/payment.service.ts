import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { map, Observable, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, apiResponseSucceeded } from '../models/api-response.model';
import { Payment, PaymentFilter, PaymentPage, PaymentTransaction, PayosCheckout, PayosStatus, TransactionFilter } from '../models/payment.model';
import { AuthService } from './auth.service';
import { validTxnRef } from '../utils/payment.utils';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly base = `${environment.api.baseUrl}/api`;
  private readonly memory = new Map<string, string>();

  private unwrap<T>(request: Observable<ApiResponse<T>>): Observable<T> {
    return request.pipe(timeout(15000), map(response => {
      if (!apiResponseSucceeded(response) || response.result == null) throw { error: response };
      return response.result;
    }));
  }
  create(appointmentId: number) {
    return this.unwrap(this.http.post<ApiResponse<PayosCheckout>>(`${this.base}/patient/appointments/${appointmentId}/payments/payos`, null));
  }
  status(txnRef: string, refresh = false, admin = false) {
    const path = admin ? `admin/payments/transactions/${encodeURIComponent(txnRef)}` : `patient/payments/payos/${encodeURIComponent(txnRef)}`;
    return this.unwrap(refresh
      ? this.http.post<ApiResponse<PayosStatus>>(`${this.base}/${path}/refresh`, null)
      : this.http.get<ApiResponse<PayosStatus>>(`${this.base}/${path}`));
  }
  forAppointment(id: number) {
    return this.unwrap(this.http.get<ApiResponse<Payment>>(`${this.base}/patient/appointments/${id}/payment`));
  }
  transactions(paymentId: number, page = 0) {
    return this.unwrap(this.http.get<ApiResponse<PaymentPage<PaymentTransaction>>>(`${this.base}/patient/payments/${paymentId}/transactions`, { params: { page, size: 20 } }));
  }
  searchPayments(filter: PaymentFilter, page = 0) {
    return this.unwrap(this.http.post<ApiResponse<PaymentPage<Payment>>>(`${this.base}/admin/payments/search`, filter, { params: { page, size: 20 } }));
  }
  searchTransactions(filter: TransactionFilter, page = 0) {
    return this.unwrap(this.http.post<ApiResponse<PaymentPage<PaymentTransaction>>>(`${this.base}/admin/payments/transactions/search`, filter, { params: { page, size: 20 } }));
  }
  adminPayment(id: number) {
    return this.unwrap(this.http.get<ApiResponse<Payment>>(`${this.base}/admin/payments/${id}`));
  }
  adminTransaction(txnRef: string) {
    return this.unwrap(this.http.get<ApiResponse<PaymentTransaction>>(`${this.base}/admin/payments/transactions/${encodeURIComponent(txnRef)}`));
  }
  remember(appointmentId: number, txnRef: string): void {
    if (!validTxnRef(txnRef) || !Number.isSafeInteger(appointmentId) || appointmentId <= 0) return;
    this.write(`txn:${txnRef}`, String(appointmentId));
    this.write(`appointment:${appointmentId}`, txnRef);
    this.write('latest', txnRef);
  }
  appointmentFor(txnRef: string): number | null {
    const value = Number(this.read(`txn:${txnRef}`));
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  transactionFor(appointmentId: number): string | null {
    const value = this.read(`appointment:${appointmentId}`);
    return validTxnRef(value) ? value : null;
  }
  markUncertain(appointmentId: number, value: boolean): void { this.write(`uncertain:${appointmentId}`, value ? '1' : '0'); }
  isUncertain(appointmentId: number): boolean { return this.read(`uncertain:${appointmentId}`) === '1'; }
  latestTransaction(): string | null {
    const value = this.read('latest');
    return validTxnRef(value) ? value : null;
  }
  private key(suffix: string): string { return `booking-payos:${this.auth.getUserId()}:${suffix}`; }
  private write(suffix: string, value: string): void {
    const key = this.key(suffix);
    this.memory.set(key, value);
    if (this.browser) try { sessionStorage.setItem(key, value); } catch { /* In-memory fallback. */ }
  }
  private read(suffix: string): string | null {
    const key = this.key(suffix);
    if (this.browser) try { return sessionStorage.getItem(key) ?? this.memory.get(key) ?? null; } catch { /* Use memory. */ }
    return this.memory.get(key) ?? null;
  }
}
