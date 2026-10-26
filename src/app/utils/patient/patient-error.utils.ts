import { HttpErrorResponse } from '@angular/common/http';
import { userErrorMessage } from '../user/user-error.utils';

const messages: Readonly<Record<number, string>> = {
  1005: 'Tài khoản được chọn không còn tồn tại. Vui lòng chọn lại.',
  1011: 'Không thể cấp vai trò bệnh nhân. Vui lòng liên hệ quản trị hệ thống.',
  1012: 'Tài khoản được chọn hoặc người đang thao tác đã ngừng hoạt động. Tạo hồ sơ yêu cầu tài khoản đang hoạt động.',
  2001: 'Tài khoản đã có hồ sơ bệnh nhân. Vui lòng tải lại và chọn tài khoản khác.',
  2002: 'Tài khoản không có vai trò phù hợp để sử dụng chức năng hồ sơ bệnh nhân này.',
  2003: 'Hồ sơ bệnh nhân không còn tồn tại. Vui lòng tải lại danh sách.',
  2005: 'Không được xóa hồ sơ bệnh nhân. Nếu cần ngừng truy cập, hãy khóa tài khoản liên kết; hồ sơ và lịch sử vẫn được giữ.',
  2006: 'Thông tin hồ sơ, lựa chọn tài khoản hoặc khoảng ngày sinh không hợp lệ. Vui lòng kiểm tra lại.',
};
export function patientErrorMessage(error: unknown, fallback = 'Không thể thực hiện thao tác hồ sơ bệnh nhân. Vui lòng thử lại.'): string {
  const response = error instanceof HttpErrorResponse ? error.error : error;
  const code = response && typeof response === 'object' ? Number((response as { code?: unknown }).code) : undefined;
  return (code !== undefined ? messages[code] : undefined) ?? userErrorMessage(error, fallback);
}
