import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';

@Component({
  standalone: true,
  selector: 'app-share-date-range',
  imports: [FormsModule, NzDatePickerModule],
  templateUrl: './share-date-range.html',
  styleUrl: './share-date-range.css'
})
export class ShareDateRange {
  @Input() value: Date[] | null = null;
  @Input() disabled = false;
  @Input() allowClear = true;
  @Input() showTime = false;
  @Input() showPeriodOptions = false;
  @Input() showQuarterOption = false;
  @Input() period: 'date' | 'month' | 'quarter' | 'year' = 'date';
  @Output() valueChange = new EventEmitter<Date[] | null>();
  @Output() periodChange = new EventEmitter<'date' | 'month' | 'quarter' | 'year'>();
  protected onPeriodChanged(period: 'date' | 'month' | 'quarter' | 'year'): void {
    this.period = period;
    this.periodChange.emit(period);
    const today = new Date();
    let start = new Date(today.getFullYear(), today.getMonth(), 1);
    let end = today;
    if (period === 'quarter') {
      const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), quarterStartMonth, 1);
      end = new Date(today.getFullYear(), quarterStartMonth + 3, 0);
    }
    this.onRangeChanged([start, end]);
  }
  protected onRangeChanged(range: Date[] | null): void {
    if (!range?.[0] || !range?.[1]) {
      this.valueChange.emit(null);
      return;
    }
    const start = new Date(range[0]);
    const end = new Date(range[1]);
    if (this.period === 'month') { start.setDate(1); end.setMonth(end.getMonth() + 1, 0); }
    if (this.period === 'quarter') {
      start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
      end.setMonth(Math.floor(end.getMonth() / 3) * 3 + 3, 0);
    }
    if (this.period === 'year') { start.setMonth(0, 1); end.setMonth(11, 31); }
    this.valueChange.emit([start, end]);
  }
}
