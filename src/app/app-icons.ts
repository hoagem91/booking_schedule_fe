import { IconDefinition } from '@ant-design/icons-angular';
// import {
//   ArrowLeftOutline, ArrowRightOutline, CalendarOutline, CheckOutline, CheckSquareOutline, ClockCircleOutline, ControlOutline,
//   DollarOutline, DownOutline, EditOutline, EyeOutline, FileTextOutline, FilterFill,
//   GiftOutline, HolderOutline, InfoCircleOutline, LoadingOutline, MailOutline, MinusCircleOutline,
//   PhoneOutline, PlayCircleOutline, PlusOutline, ReloadOutline, SaveOutline, SearchOutline, SettingOutline,
//   ToolOutline, UndoOutline, UserOutline, PoweroffOutline, SyncOutline, StopOutline,
//   DashboardOutline, AuditOutline, ScheduleOutline, MedicineBoxOutline, AppstoreOutline, HomeOutline, TeamOutline,
//   CopyOutline, SafetyCertificateOutline, CrownOutline, IdcardOutline, CheckCircleOutline, CloseCircleOutline,
//   HistoryOutline, LockOutline, UnlockOutline, KeyOutline, SafetyOutline, LinkOutline, EnvironmentOutline
// } from '@ant-design/icons-angular/icons';
//
// // Register application icons locally so rendering does not require SVG asset requests.
// export const APP_ICONS: IconDefinition[] = [
//   ArrowLeftOutline, ArrowRightOutline, CalendarOutline, CheckOutline, CheckSquareOutline, ClockCircleOutline, ControlOutline,
//   DollarOutline, DownOutline, EditOutline, EyeOutline, FileTextOutline, FilterFill,
//   GiftOutline, HolderOutline, InfoCircleOutline, LoadingOutline, MailOutline, MinusCircleOutline,
//   PhoneOutline, PlayCircleOutline, PlusOutline, ReloadOutline, SaveOutline, SearchOutline, SettingOutline,
//   ToolOutline, UndoOutline, UserOutline, PoweroffOutline, SyncOutline, StopOutline,
//   DashboardOutline, AuditOutline, ScheduleOutline, MedicineBoxOutline, AppstoreOutline, HomeOutline, TeamOutline,
//   CopyOutline, SafetyCertificateOutline, CrownOutline, IdcardOutline, CheckCircleOutline, CloseCircleOutline,
//   HistoryOutline, LockOutline, UnlockOutline, KeyOutline, SafetyOutline, LinkOutline, EnvironmentOutline
// ];
import * as AllIcons from '@ant-design/icons-angular/icons';

const antDesignIcons = AllIcons as Record<string, IconDefinition>;
export const icons = Object.keys(antDesignIcons).map(key => antDesignIcons[key])
