import { RegisteredPipeName } from '../../services/pipe-registry/pipe-registry.service';
export interface TableColumn {
  title: string;           // Tiêu đề hiển thị trên header
  key: string;            // Tên trường dữ liệu
  width: number | null;
  minWidth: number | null;
  visible?: boolean;        // Ẩn cột (mặc định là false)
  fixed?: 'left' | 'right'; // Ghim cột bên trái hoặc phải
  sortable?: boolean;     // Cho phép sắp xếp
  sortOrder?: 'ascend' | 'descend' | null; // Thứ tự sắp xếp mặc định
  sortPriority?: number | false; // Ưu tiên sort nhiều cột (số nhỏ = ưu tiên cao hơn, false = không dùng multi-sort)
  sortDirections?: Array<'ascend' | 'descend' | null>; // Các hướng sort cho phép
  filterKey?: string; // Key gửi lên backend khi filter (mặc định dùng key)
  align: 'left' | 'center' | 'right' | null; // Căn chỉnh nội dung
  headerAlign?: 'left' | 'center' | 'right' | null; // Căn chỉnh riêng header; mặc định căn trái
  ellipsis?: boolean;     // Hiển thị dấu ... khi nội dung dài
  render?: 'text' | 'custom' | 'actions' | 'link'; // Kiểu hiển thị
  filterOption?: FilterOption; // Tùy chọn lọc,
  allowCopy?: boolean; // Cho phép sao chép nội dung cột,
  className?: string;
  pipeName?: RegisteredPipeName;
  pipeArgs?: any[];
  numberDigits?: string; // Định dạng số theo Angular, ví dụ 1.0-3
  tooltip?: boolean; // Hiển thị tooltip khi hover chuột
  expandable?: boolean;
  permissions?: string[]; // Mảng quyền hạn để hiển thị cột
}

interface FilterOption {
  allowFilter?: boolean; // Cho phép lọc
  useSelectFilter?: boolean; // Sử dụng nz-select làm filter (cho phép tìm kiếm, bỏ tag)
  filterMultiple?: boolean; // Cho phép lọc nhiều giá trị
  filterData: Array<{ text: string; value: any; byDefault?: boolean }>; // Dữ liệu lọc
  defaultRange?: [Date, Date] | null;
  filterType?: 'default' | 'dateRange' | 'date' | 'timeRange' | 'numberRange'; // Loại filter: mặc định|khoảng ngày|ngày đơn|khoảng thời gian|khoảng số
  numberRangeStep?: number; // Bước nhảy cho numberRange (mặc định: 1000)
  numberRangeMin?: number;  // Giá trị tối thiểu cho numberRange (mặc định: 0)
  dateOnly?: boolean; // Chỉ chọn ngày (không chọn giờ), emit YYYY-MM-DD
}

export interface ExpandConfig {
  expandRow: boolean;
  expandMultiple?: boolean;
  width?: string;
  fixed?: boolean;
}
