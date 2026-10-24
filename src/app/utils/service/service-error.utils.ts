import { HttpErrorResponse } from '@angular/common/http';
import { specialtyBusinessErrorMessage } from '../specialty/specialty-error.utils';

const messages: Readonly<Record<number, string>> = {
  5002: 'Mã dịch vụ đã tồn tại (không phân biệt hoa/thường). Vui lòng chọn mã khác.',
  5003: 'Dịch vụ không còn tồn tại. Vui lòng tải lại danh sách.',
  5005: 'Dịch vụ đang được sử dụng và đã ngừng hoạt động. Không thể xóa dịch vụ này.',
  5006: 'Thông tin dịch vụ không hợp lệ. Vui lòng kiểm tra mã, trạng thái và chuyên khoa đã chọn.',
  1006: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  1007: 'Bạn không có quyền thực hiện thao tác dịch vụ này.',
  401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác dịch vụ này.',
};
export function serviceErrorMessage(error: unknown, fallback = 'Không thể thực hiện thao tác dịch vụ. Vui lòng thử lại.'): string {
  const specialty = specialtyBusinessErrorMessage(error);
  if (specialty) return specialty;
  const response = error instanceof HttpErrorResponse ? error.error : error;
  const code = response && typeof response === 'object' ? Number((response as { code?: unknown }).code) : undefined;
  return code !== undefined ? messages[code] ?? fallback : fallback;
}
