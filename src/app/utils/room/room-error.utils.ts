import { HttpErrorResponse } from '@angular/common/http';
import { specialtyBusinessErrorMessage } from '../specialty/specialty-error.utils';

const messages: Readonly<Record<number, string>> = {
  6002: 'Phòng khám không còn tồn tại. Vui lòng tải lại danh sách.',
  6003: 'Phòng khám không sẵn sàng để phân công. Vui lòng chọn phòng khác.',
  6004: 'Lịch làm việc cần kiểm tra không còn tồn tại. Vui lòng tải lại dữ liệu.',
  6007: 'Phòng vừa có lịch phân công trùng thời gian. Vui lòng tìm lại phòng rảnh.',
  9001: 'Mã phòng đã tồn tại (không phân biệt hoa/thường). Vui lòng nhập mã khác.',
  9002: 'Dữ liệu phòng hoặc điều kiện tìm kiếm không hợp lệ. Vui lòng kiểm tra lại thông tin.',
  9003: 'Phòng còn ca khám đang mở hoặc đã đủ chỗ từ hôm nay trở đi. Cần hủy hoặc chuyển các ca này trước khi bảo trì, ngừng hoạt động hoặc xóa phòng.',
  9004: 'Phòng còn lịch phân công chưa hủy từ hôm nay trở đi. Cần hủy hoặc chuyển các lịch này trước khi đổi chuyên khoa hoặc chuyển về phòng dùng chung.',
  1006: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  1007: 'Bạn không có quyền thực hiện thao tác phòng khám này.',
  401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác phòng khám này.',
};
export function roomErrorMessage(error: unknown, fallback = 'Không thể thực hiện thao tác phòng khám. Vui lòng thử lại.'): string {
  const specialty = specialtyBusinessErrorMessage(error);
  if (specialty) return specialty;
  const response = error instanceof HttpErrorResponse ? error.error : error;
  const code = response && typeof response === 'object' ? Number((response as { code?: unknown }).code) : undefined;
  return code !== undefined ? messages[code] ?? fallback : fallback;
}
