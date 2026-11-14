export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'REVIEW_REQUIRED';
export interface Payment {
  id: number; paymentCode: string; appointmentId: number; appointmentCode: string;
  patientCode: string; patientName: string; patientPhone: string | null;
  amount: number; paymentMethod: string; paymentStatus: PaymentStatus;
  transactionCode: string | null; paidAt: string | null; createdAt: string; updatedAt: string;
}
export interface PaymentTransaction {
  id: number; paymentId: number; appointmentId: number; txnRef: string; provider: string;
  amount: number; status: TransactionStatus; providerStatus: string | null;
  providerTransactionNo: string | null; expiresAt: string | null; paidAt: string | null; createdAt: string;
}
export interface PayosCheckout {
  txnRef: string; amount: number; paymentLinkId: string; checkoutUrl: string;
  qrCode: string; expiresAt: string;
}
export interface PayosStatus {
  txnRef: string; status: TransactionStatus; providerStatus: string | null;
  amount: number; paidAt: string | null;
}
export interface PaymentPage<T> {
  content: T[]; number: number; size: number; totalElements: number; totalPages: number;
  first: boolean; last: boolean; empty: boolean;
}
export interface PaymentFilter {
  paymentMethod: 'PAYOS'; paymentStatus?: PaymentStatus; keyword?: string;
  appointmentId?: number; fromDate?: string; toDate?: string;
}
export interface TransactionFilter {
  provider: 'PAYOS'; status?: TransactionStatus; paymentId?: number; txnRef?: string;
}
