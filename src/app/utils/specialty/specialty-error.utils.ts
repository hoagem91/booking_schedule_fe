import { HttpErrorResponse } from '@angular/common/http';

export const SPECIALTY_ERROR_MESSAGES: Readonly<Record<number, string>> = {
  3001: 'Không tìm thấy chuyên khoa. Vui lòng chọn lại chuyên khoa cho phòng.',
  3003: 'Chuyên khoa không còn tồn tại. Vui lòng tải lại danh sách.',
  3004: 'Chuyên khoa đã ngừng hoạt động. Vui lòng chọn chuyên khoa đang hoạt động.',
  3005: 'Chuyên khoa đang có dữ liệu liên quan và đã được ngừng hoạt động. Không thể xóa chuyên khoa này.',
  3006: 'Mã chuyên khoa đã tồn tại (không phân biệt hoa/thường). Vui lòng chọn mã khác.',
  3007: 'Tên chuyên khoa đã tồn tại (không phân biệt hoa/thường). Vui lòng nhập tên khác.',
  3008: 'Chuyên khoa còn ca khám đang mở hoặc đã đủ chỗ từ hôm nay trở đi của bác sĩ hoặc phòng thuộc khoa. Cần xử lý các ca này trước khi xóa hoặc ngừng hoạt động.',
  3009: 'Dữ liệu hoặc trạng thái chuyên khoa không hợp lệ. Vui lòng kiểm tra lại thông tin.',
};

/** Accept both BaseService responses and HTTP errors without confusing HTTP status with business code. */
export function specialtyBusinessErrorMessage(error: unknown): string | undefined {
  const response = error instanceof HttpErrorResponse ? error.error : error;
  if (!response || typeof response !== 'object') return undefined;
  const code = (response as { code?: unknown }).code;
  return typeof code === 'number' || typeof code === 'string'
    ? SPECIALTY_ERROR_MESSAGES[Number(code)] : undefined;
}

export function specialtyErrorMessage(error: unknown, fallback = 'Không thể thực hiện thao tác chuyên khoa. Vui lòng thử lại.'): string {
  const businessMessage = specialtyBusinessErrorMessage(error);
  if (businessMessage) return businessMessage;
  const response = error instanceof HttpErrorResponse ? error.error : error;
  const code = response && typeof response === 'object' ? Number((response as { code?: unknown }).code) : undefined;
  if (code === 1006) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (code === 1007) return 'Bạn không có quyền thực hiện thao tác chuyên khoa này.';
  return fallback;
}
