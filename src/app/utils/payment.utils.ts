import { PayosStatus, PaymentStatus, TransactionStatus } from '../models/payment.model';

export const paymentLabels: Record<PaymentStatus | TransactionStatus, string> = {
  PENDING: 'Đang chờ thanh toán', SUCCESS: 'Thanh toán thành công', FAILED: 'Đã hủy / thất bại',
  REFUNDED: 'Đã hoàn tiền', EXPIRED: 'Hết hạn', REVIEW_REQUIRED: 'Cần đối soát'
};
export function clinicDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}+07:00`;
}
export function validTxnRef(value: unknown): value is string {
  return typeof value === 'string' && /^\d{1,20}$/.test(value);
}
export function safeCheckoutUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'pay.payos.vn' || url.hostname.endsWith('.pay.payos.vn'))
      && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function paymentError(error: any): string {
  const body = error?.error ?? error;
  const code = body?.code;
  if (String(body?.message ?? '').includes('PAYOS_DISABLED')) return 'Kênh payOS chưa được bật. Vui lòng liên hệ phòng khám.';
  if (error?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi kiểm tra giao dịch.';
  if (error?.status === 403) return 'Bạn không có quyền truy cập khoản thu hoặc giao dịch này.';
  if (error?.status === 404 || code === 9201) return 'Không tìm thấy khoản thu hoặc giao dịch.';
  if (code === 9102) return 'Thông tin đối chiếu chưa phù hợp. Giữ mã giao dịch và liên hệ phòng khám.';
  if (code === 9203) return 'Giao dịch này không thuộc payOS nên không thể đồng bộ tại đây.';
  if (code === 9101) return 'Chưa rõ kết quả tạo link. Hãy kiểm tra giao dịch, không thanh toán thêm.';
  if (code === 9103) return 'Chưa thể đồng bộ với payOS. Giữ mã giao dịch và kiểm tra lại sau.';
  if (error?.status === 0 || error?.name === 'TimeoutError') return 'Kết nối bị gián đoạn. Kiểm tra khoản thu trước khi tạo lại thanh toán.';
  return body?.message || 'Chưa thể xử lý thanh toán. Vui lòng thử kiểm tra lại.';
}
export function statusMessage(status: PayosStatus): string {
  switch (status.status) {
    case 'SUCCESS': return 'Phòng khám đã ghi nhận thanh toán. Bạn có thể xem trạng thái lịch hẹn bên dưới.';
    case 'REVIEW_REQUIRED': return 'Giao dịch cần phòng khám đối soát. Giữ mã giao dịch và không thanh toán thêm.';
    case 'EXPIRED': return 'Link đã hết hạn. Nếu đã chuyển tiền, hãy kiểm tra lại hoặc liên hệ phòng khám trước khi thanh toán tiếp.';
    case 'FAILED': return status.providerStatus === 'CANCELLED'
      ? 'Link thanh toán đã hủy. Lịch khám vẫn giữ trạng thái riêng.' : 'Lần thanh toán này thất bại. Kiểm tra khoản thu trước khi thử lại.';
    default: return 'Đang chờ xác nhận từ ngân hàng. Nếu đã chuyển tiền, vui lòng không thanh toán lần nữa.';
  }
}
