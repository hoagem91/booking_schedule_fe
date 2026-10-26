const fields = {
  username: 'Tên đăng nhập',
  fullName: 'Họ và tên',
  email: 'Email',
  phone: 'Điện thoại',
  status: 'Trạng thái',
  roles: 'Vai trò'
};

function snapshot(value: string | null): Record<string, unknown> | null {
  if (value === null) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function display(value: unknown): string {
  if (Array.isArray(value)) return value.map(item => typeof item === 'string' ? item : (item && typeof item === 'object' && typeof item.name === 'string' ? item.name : ''))
    .filter(item => ['ADMIN', 'SUPER_ADMIN', 'STAFF', 'DOCTOR', 'PATIENT'].includes(item)).sort().join(', ') || '—';
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '—';
}

/** Never render raw JSON or keys outside the documented snapshot whitelist. */
export function userAuditDiff(beforeState: string | null, afterState: string | null) {
  const before = snapshot(beforeState), after = snapshot(afterState);
  if (!before || !after) return null;
  return Object.entries(fields).map(([key, label]) => ({
    label,
    before: display(before[key]),
    after: display(after[key])
  }))
    .filter(field => field.before !== field.after);
}

export const USER_AUDIT_LABELS: Record<string, string> = {
  CREATE: 'Tạo tài khoản',
  UPDATE: 'Cập nhật thông tin',
  STATUS_CHANGE: 'Đổi trạng thái',
  ROLES_CHANGE: 'Thay đổi vai trò',
  PASSWORD_RESET: 'Đặt lại mật khẩu',
  DEACTIVATE: 'Vô hiệu hóa',
  SELF_PASSWORD_CHANGE: 'Đổi mật khẩu cá nhân'
};
