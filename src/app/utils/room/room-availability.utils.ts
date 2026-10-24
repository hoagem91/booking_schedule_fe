export function roomLocalToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function roomLocalTime(value: string): string | null {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)) return null;
  return value.length === 5 ? `${value}:00` : value;
}
export function roomAvailabilityError(workDate: string, start: string, end: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate ?? '')) return 'Vui lòng chọn ngày cần tìm phòng.';
  const parsed = new Date(`${workDate}T12:00:00`);
  if (!Number.isFinite(parsed.getTime()) || `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}` !== workDate)
    return 'Ngày tìm phòng không hợp lệ.';
  if (workDate < roomLocalToday()) return 'Ngày tìm phòng không được ở trong quá khứ.';
  const startTime = roomLocalTime(start), endTime = roomLocalTime(end);
  if (!startTime || !endTime) return 'Vui lòng nhập giờ bắt đầu và kết thúc hợp lệ, không có phần giây lẻ.';
  if (startTime >= endTime) return 'Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.';
  return null;
}
