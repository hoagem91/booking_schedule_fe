import { HttpErrorResponse } from '@angular/common/http';
export const USER_ERROR_MESSAGES: Readonly<Record<number, string>> = {
  1002: 'Tên đăng nhập hoặc email đã được sử dụng. Vui lòng kiểm tra lại.',
  1004: 'Mật khẩu phải dài 6–100 ký tự và không chỉ chứa khoảng trắng.',
  1005: 'Tài khoản không còn tồn tại. Vui lòng tải lại danh sách.',
  1006: 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.',
  1007: 'Bạn không có quyền thực hiện thao tác này hoặc tài khoản đích có vai trò SUPER_ADMIN.',
  1011: 'Vui lòng chọn ít nhất một vai trò hợp lệ có trong danh mục.',
  1012: 'Tài khoản đang thao tác đã bị ngừng hoạt động. Vui lòng đăng nhập lại.',
  1013: 'Vai trò không khớp hồ sơ. Cần giữ vai trò Bác sĩ/Bệnh nhân khi đã có hồ sơ tương ứng.',
  1014: 'Bạn không thể tự khóa hoặc vô hiệu hóa tài khoản của mình.',
  1015: 'Không thể bỏ vai trò hoặc khóa SUPER_ADMIN đang hoạt động cuối cùng.',
  1016: 'Bạn phải giữ ít nhất một vai trò ADMIN hoặc SUPER_ADMIN cho chính mình.',
  1017: 'Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu cá nhân.',
  1018: 'Mật khẩu hiện tại không đúng. Vui lòng kiểm tra lại.',
  1019: 'Tên đăng nhập đã tồn tại (không phân biệt hoa/thường).',
  1020: 'Email đã được sử dụng (không phân biệt hoa/thường).',
  1021: 'Thông tin hoặc trạng thái tài khoản không hợp lệ. Vui lòng kiểm tra lại.',
  1022: 'Không thể đặt lại mật khẩu của chính mình bằng chức năng quản trị. Hãy dùng Đổi mật khẩu cá nhân.',
  401: 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền quản lý tài khoản người dùng.',
};
export function userErrorMessage(error: unknown, fallback = 'Không thể thực hiện thao tác tài khoản. Vui lòng thử lại.'): string {
  const response = error instanceof HttpErrorResponse ? error.error : error;
  const code = response && typeof response === 'object' ? Number((response as { code?: unknown }).code) : undefined;
  return code !== undefined ? USER_ERROR_MESSAGES[code] ?? fallback : fallback;
}
