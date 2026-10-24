import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse, apiResponseSucceeded } from '../../models/api-response.model';
import { AppointmentStatus } from '../../models/appointment.model';
import { specialtyBusinessErrorMessage } from '../specialty/specialty-error.utils';

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', IN_PROGRESS: 'Đang khám',
  COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy', NO_SHOW: 'Không đến khám'
};

// BaseService preserves the server message when it converts HTTP errors into responses.
const bookingErrors: Record<string, string> = {
  'Time slot or schedule is not available': 'Khung giờ này vừa hết chỗ hoặc không còn khả dụng. Vui lòng chọn giờ khác.',
  'Patient has an overlapping appointment': 'Bạn đã có lịch hẹn trùng thời gian này. Vui lòng chọn giờ khác.',
  'Cancellation deadline has passed': 'Lịch hẹn đã quá thời hạn hủy. Vui lòng liên hệ tổng đài để được hỗ trợ.',
  'Appointment status transition is not allowed': 'Trạng thái lịch hẹn đã thay đổi và không thể thực hiện thao tác này.',
  'Only a completed appointment can be reviewed once': 'Lịch hẹn này chưa đủ điều kiện đánh giá hoặc bạn đã gửi đánh giá trước đó.',
  'Slot does not match doctor or appointment date': 'Khung giờ không còn phù hợp với bác sĩ hoặc ngày khám. Vui lòng chọn lại.',
  'Patient not existed': 'Tài khoản chưa có hồ sơ bệnh nhân. Vui lòng liên hệ tổng đài.',
  'Historical appointment price is unavailable': 'Giá dịch vụ chưa được cập nhật. Vui lòng chọn dịch vụ khác.',
  'Service is not active': 'Dịch vụ này hiện không nhận đặt lịch. Vui lòng chọn dịch vụ khác.'
};

export function appointmentResponseSucceeded<T>(res: ApiResponse<T> | null | undefined): boolean {
  return apiResponseSucceeded(res);
}

export function appointmentErrorMessage(error: unknown): string {
  const specialtyMessage = specialtyBusinessErrorMessage(error);
  if (specialtyMessage) return specialtyMessage;
  const fallback = 'Chưa thể thực hiện yêu cầu. Vui lòng thử lại.';
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Không thể kết nối máy chủ. Vui lòng thử lại.';
    if (error.status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
    return appointmentErrorMessage(error.error);
  }
  if (!error || typeof error !== 'object') return fallback;
  const res = error as { code?: number; message?: string };
  const code = res.code;
  if (code === 1006) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (code === 2003) return 'Tài khoản chưa có hồ sơ bệnh nhân. Vui lòng liên hệ tổng đài.';
  if (code === 7003) return bookingErrors['Time slot or schedule is not available'];
  if (code === 8004) return bookingErrors['Patient has an overlapping appointment'];
  if (code === 8006) return bookingErrors['Cancellation deadline has passed'];
  if (code === 8014) return bookingErrors['Only a completed appointment can be reviewed once'];
  if (res.message?.startsWith('Http failure response')) return 'Không thể tải dữ liệu. Vui lòng kiểm tra kết nối và thử lại.';
  return bookingErrors[res.message ?? ''] ?? res.message ?? fallback;
}

export function isUnavailableSlotResponse(res: { code?: number; message?: string }): boolean {
  return res.code === 7003
    || res.message === 'Time slot or schedule is not available';
}

export function decodeAppointmentText(text: string): string {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity: string) => {
    if (entity.startsWith('#')) {
      const hex = entity.slice(0, 2).toLowerCase() === '#x';
      const point = parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
        ? String.fromCodePoint(point) : match;
    }
    return entities[entity.toLowerCase()] ?? match;
  });
}
