import { HttpErrorResponse } from '@angular/common/http';
import { userErrorMessage } from '../user/user-error.utils';

export const DOCTOR_ERROR_MESSAGES: Readonly<Record<number, string>> = {
  1011: 'Không thể cấp vai trò bác sĩ. Vui lòng liên hệ quản trị hệ thống.',
  1012: 'Tài khoản đã ngừng hoạt động. Tạo hoặc kích hoạt hồ sơ yêu cầu tài khoản đang hoạt động.',
  3003: 'Chuyên khoa không còn tồn tại. Vui lòng tải lại và chọn chuyên khoa khác.',
  3004: 'Chuyên khoa đã ngừng hoạt động. Vui lòng chọn chuyên khoa đang hoạt động.',
  4001: 'Tài khoản đã có hồ sơ bác sĩ. Vui lòng tải lại và chọn tài khoản khác.',
  4002: 'Hồ sơ bác sĩ không còn tồn tại. Vui lòng tải lại danh sách.',
  4007: 'Mã bác sĩ đã tồn tại (không phân biệt hoa/thường).',
  4008: 'Thông tin hồ sơ hoặc lựa chọn tài khoản không hợp lệ. Vui lòng kiểm tra lại.',
  4009: 'Bác sĩ còn ca OPEN/FULL chưa kết thúc. Hãy xử lý các ca này trước khi ngừng hoạt động hồ sơ.',
  4010: 'Bác sĩ còn ca OPEN/FULL/CLOSED chưa kết thúc. Hãy xử lý các ca này trước khi đổi chuyên khoa.',
  403: 'Bạn không có quyền quản lý hồ sơ bác sĩ.',
};
export function doctorErrorMessage(error: unknown, fallback = 'Không thể thực hiện thao tác hồ sơ bác sĩ. Vui lòng thử lại.'): string {
  const response = error instanceof HttpErrorResponse ? error.error : error;
  const code = response && typeof response === 'object' ? Number((response as { code?: unknown }).code) : undefined;
  return (code !== undefined ? DOCTOR_ERROR_MESSAGES[code] : undefined) ?? userErrorMessage(error, fallback);
}
