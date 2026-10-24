import { AppointmentHistoryItem, AppointmentStatus } from '../../models/appointment.model';

export type AppointmentAction = 'confirm' | 'in-progress' | 'complete' | 'cancel' | 'no-show';

export interface AppointmentActionOption {
  action: AppointmentAction;
  label: string;
  target: AppointmentStatus;
  description: string;
  disabledReason: string;
}

export interface AppointmentActionResult {
  changed?: boolean;
  refresh: boolean;
  appointment?: AppointmentHistoryItem;
}

export const actionDefinitions: Record<AppointmentAction, Omit<AppointmentActionOption, 'disabledReason'>> = {
  confirm: {
    action: 'confirm',
    label: 'Xác nhận lịch',
    target: 'CONFIRMED',
    description: 'Xác nhận lịch khám này với bệnh nhân.'
  },
  'in-progress': {
    action: 'in-progress',
    label: 'Bắt đầu khám',
    target: 'IN_PROGRESS',
    description: 'Chuyển lượt hẹn sang trạng thái đang khám.'
  },
  complete: {
    action: 'complete',
    label: 'Hoàn thành lượt khám',
    target: 'COMPLETED',
    description: 'Xác nhận lượt khám đã kết thúc.'
  },
  cancel: {
    action: 'cancel',
    label: 'Hủy lịch hẹn',
    target: 'CANCELLED',
    description: 'Hủy lịch hẹn và giải phóng chỗ đã đặt. Vui lòng nhập lý do để các bộ phận theo dõi.'
  },
  'no-show': {
    action: 'no-show',
    label: 'Đánh dấu không đến',
    target: 'NO_SHOW',
    description: 'Xác nhận bệnh nhân không đến sau khi khung giờ khám kết thúc.'
  }
};

export function appointmentActions(item: AppointmentHistoryItem, now = Date.now()): AppointmentActionOption[] {
  const allowed: AppointmentAction[] = item.status === 'PENDING' ? ['confirm', 'cancel', 'no-show']
    : item.status === 'CONFIRMED' ? ['in-progress', 'cancel', 'no-show']
      : item.status === 'IN_PROGRESS' ? ['complete'] : [];
  return allowed.map(action => {
    let disabledReason = '';
    if (action === 'in-progress' || action === 'no-show') {
      const time = action === 'in-progress' ? item.startTime : item.endTime;
      const deadline = Date.parse(`${item.appointmentDate}T${time}+07:00`);
      if (!Number.isFinite(deadline)) disabledReason = 'Chưa có thông tin giờ khám hợp lệ.';
      else if (now < deadline) disabledReason = action === 'in-progress' ? 'Chưa đến giờ bắt đầu khám.' : 'Khung giờ khám chưa kết thúc.';
    }
    return { ...actionDefinitions[action], disabledReason };
  });
}

export function actionError(response: { code?: number; message?: string }): string {
  switch (response.code) {
    case 1006:
    case 401:
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    case 1007:
    case 403:
      return 'Tài khoản không còn quyền xử lý lịch hẹn này.';
    case 8001:
    case 404:
      return 'Lịch hẹn không còn tồn tại. Vui lòng tải lại danh sách.';
    case 8005:
    case 409:
      return 'Lịch hẹn vừa thay đổi và không thể thực hiện thao tác. Vui lòng tải lại dữ liệu.';
    case 8013:
      return 'Chưa đến thời điểm được phép thực hiện thao tác này.';
    case 8011:
      return 'Thiếu thông tin giá dịch vụ để hoàn thành lượt khám. Vui lòng kiểm tra lại.';
    case 0:
      return 'Không thể kết nối máy chủ. Bạn có thể thử lại để kiểm tra trạng thái hiện tại.';
    default:
      return 'Chưa thể xử lý lịch hẹn. Vui lòng thử lại để kiểm tra trạng thái hiện tại.';
  }
}
