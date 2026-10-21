import { Component, TemplateRef, input, output, contentChild, inject, effect } from '@angular/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NgClass, NgTemplateOutlet, formatNumber } from '@angular/common';
import { NzTableQueryParams } from 'ng-zorro-antd/table';
import { TableColumn, ExpandConfig } from './share-table.interface';
import { NgxPermissionsModule } from 'ngx-permissions';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { FormsModule } from '@angular/forms';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzTimePickerModule } from 'ng-zorro-antd/time-picker';
import { NzDividerComponent } from 'ng-zorro-antd/divider';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { PipeRegistryService } from '../../services/pipe-registry/pipe-registry.service';

@Component({
  standalone: true,
  selector: 'app-share-table',
  templateUrl: './share-table.component.html',
  styleUrl: './share-table.component.css',
  imports: [
    NzTableModule,
    NzIconModule,
    NzTypographyModule,
    NzTooltipModule,
    NgTemplateOutlet,
    NgClass,
    NgxPermissionsModule,
    NzDatePickerModule,
    FormsModule,
    NzDropDownModule,
    NzButtonModule,
    NzSelectModule,
    NzCheckboxModule,
    NzTimePickerModule,
    NzDividerComponent,
    NzInputNumberModule
  ]
})
export class ShareTableComponent {
  readonly summaryData = input<any | null>(null);
  readonly summaryLabel = input<string>('Tổng');
  readonly summaryLabelKey = input<string>('summaryLabel');
  readonly summaryColumnKey = input<string>('summaryLabelColumnKey');
  readonly summaryLabelSpan = input<number>(1);
  readonly summaryLabelValueKey = input<string | null>(null);
  readonly summaryLabelTwoLines = input<boolean>(false);
  readonly summaryLabelValuePrefix = input<string>('');
  readonly summaryCurrencyTwoLines = input<boolean>(false);
  readonly stickySummary = input<boolean>(false);
  readonly detailMode = input<boolean>(false);
  readonly columns = input<TableColumn[]>([]);
  readonly dataSource = input<any[]>([]);
  readonly loading = input<boolean>(false);
  readonly total = input<number>(0);
  readonly currentPage = input<number>(1);
  readonly pageSize = input<number>(20);
  readonly scrollY = input<string>('800px');
  readonly scrollX = input<string>('100%');
  readonly showPagination = input<boolean>(true);
  readonly showSizeChanger = input<boolean>(true);
  // Hiện tổng số bản ghi bên trái phân trang.
  readonly showTotal = input<boolean>(false);
  readonly paginationItemLabel = input<string>('bản ghi');
  readonly pageSizeOptions = input<number[]>([10, 20, 50, 100]);
  readonly frontPagination = input<boolean>(false);
  readonly size = input<'middle' | 'small' | 'default'>('default');
  readonly highlightId = input<number | null>(null);

  readonly expandConfig = input<ExpandConfig | null>(null);
  expandSet = new Set<any>();

  readonly showCheckbox = input<boolean>(false);
  readonly checkedIds = input<number[]>([]);
  readonly checkedIdsChange = output<number[]>();

  checked = false;
  indeterminate = false;
  setOfCheckedId = new Set<any>();

  readonly queryParamsChange = output<NzTableQueryParams>();
  readonly columnResize = output<{
    column: TableColumn;
    width?: number;
  }>();
  readonly dateRangeChange = output<{ key: string; start: string | null; end: string | null }>();
  readonly dateChange = output<{ key: string; value: string | null }>();
  readonly selectFilterChange = output<{ key: string; value: any }>();
  readonly numberRangeChange = output<{ key: string; from: number | null; to: number | null }>();
  readonly expandChange = output<{ item: any; expanded: boolean }>();

  readonly customCellTemplate = contentChild<TemplateRef<any>>('customCell');
  readonly actionsCellTemplate = contentChild<TemplateRef<any>>('actionsCell');
  readonly expandTemplate = contentChild<TemplateRef<any>>('expandRow');

  private readonly pipeRegistry = inject(PipeRegistryService);

  constructor() {
    effect(() => {
      const ids = this.checkedIds() || [];
      const currentIds = Array.from(this.setOfCheckedId);
      if (ids.length !== currentIds.length || !ids.every(id => this.setOfCheckedId.has(id))) {
        this.setOfCheckedId = new Set(ids);
        this.refreshCheckedStatus();
      }
    });

    effect(() => {
      // Trigger refresh when dataSource changes
      const data = this.dataSource() || [];
      this.refreshCheckedStatus();
    });

    effect(() => {
      const cols = this.columns() || [];
      cols.forEach(col => {
        if (col.filterOption?.filterType === 'dateRange') {
          const key = col.filterKey || col.key;
          const range = col.filterOption.defaultRange;
          if (range && range.length === 2 && range.every(date => date && !isNaN(new Date(date).getTime()))) {
            this.dateRangeValueMap[key] = [new Date(range[0]), new Date(range[1])];
          } else if (range === null) {
            this.dateRangeValueMap[key] = null;
          }
        }
        if (col.filterOption?.useSelectFilter) {
          const key = col.filterKey || col.key;
          if (col.filterOption.filterMultiple) {
            this.selectValueMap[key] = col.filterOption.filterData.filter(d => d.byDefault).map(d => d.value);
          } else {
            const defaultItem = col.filterOption.filterData.find(d => d.byDefault);
            this.selectValueMap[key] = defaultItem ? defaultItem.value : null;
          }
          this.updateSelectFilterOptions(col);
        }
      });
    });
  }

  ngOnInit() { }

  updateCheckedSet(id: any, checked: boolean): void {
    if (checked) {
      this.setOfCheckedId.add(id);
    } else {
      this.setOfCheckedId.delete(id);
    }
  }

  onItemChecked(id: any, checked: boolean): void {
    this.updateCheckedSet(id, checked);
    this.refreshCheckedStatus();
    this.checkedIdsChange.emit(Array.from(this.setOfCheckedId));
  }

  onAllChecked(value: boolean): void {
    const currentPageData = this.dataSource() || [];
    currentPageData.forEach(item => {
      if (item.id !== undefined && item.id !== null) {
        this.updateCheckedSet(item.id, value);
      }
    });
    this.refreshCheckedStatus();
    this.checkedIdsChange.emit(Array.from(this.setOfCheckedId));
  }

  refreshCheckedStatus(): void {
    const currentPageData = this.dataSource() || [];
    if (currentPageData.length === 0) {
      this.checked = false;
      this.indeterminate = false;
      return;
    }
    const allChecked = currentPageData.every(item => this.setOfCheckedId.has(item.id));
    const anyChecked = currentPageData.some(item => this.setOfCheckedId.has(item.id));
    this.checked = allChecked;
    this.indeterminate = anyChecked && !allChecked;
  }

  // Per-column date range state
  dateRangeVisibleMap: Record<string, boolean> = {};
  dateRangeValueMap: Record<string, [Date, Date] | null> = {};

  isDateRangeActive(key: string): boolean {
    return !!this.dateRangeValueMap[key];
  }

  onDateRangeChange(key: string, result: Date[] | null): void {
    if (result && result.length === 2) {
      this.dateRangeValueMap[key] = [result[0], result[1]];
    } else {
      this.dateRangeValueMap[key] = null;
    }
  }

  applyDateRangeFilter(column: TableColumn): void {
    const key = column.filterKey || column.key;
    const range = this.dateRangeValueMap[key];
    const dateOnly = column.filterOption?.dateOnly ?? false;
    this.dateRangeVisibleMap[key] = false;
    this.dateRangeChange.emit({
      key,
      start: range ? this.formatDate(range[0], false, dateOnly) : null,
      end: range ? this.formatDate(range[1], false, dateOnly) : null
    });
  }

  resetDateRangeFilter(column: TableColumn): void {
    const key = column.filterKey || column.key;
    this.dateRangeValueMap[key] = null;
    this.dateRangeVisibleMap[key] = false;
    this.dateRangeChange.emit({ key, start: null, end: null });
  }

  // Per-column time range state
  timeRangeVisibleMap: Record<string, boolean> = {};
  timeRangeValueMap: Record<string, [Date | null, Date | null]> = {};

  isTimeRangeActive(key: string): boolean {
    const val = this.timeRangeValueMap[key];
    return !!(val && (val[0] || val[1]));
  }

  onTimeRangeChange(key: string, index: 0 | 1, result: Date | null): void {
    if (!this.timeRangeValueMap[key]) {
      this.timeRangeValueMap[key] = [null, null];
    }
    this.timeRangeValueMap[key][index] = result;
  }

  formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}:00`;
  }

  private _disabledStartTimeHoursMap: Record<string, () => number[]> = {};
  getDisabledStartTimeHours(key: string): () => number[] {
    if (!this._disabledStartTimeHoursMap[key]) {
      this._disabledStartTimeHoursMap[key] = () => {
        const end = this.timeRangeValueMap[key]?.[1];
        if (!end) return [];
        return Array.from({ length: 24 }, (_, i) => i).filter(h => h > end.getHours());
      };
    }
    return this._disabledStartTimeHoursMap[key];
  }

  private _disabledStartTimeMinutesMap: Record<string, (hour: number) => number[]> = {};
  getDisabledStartTimeMinutes(key: string): (hour: number) => number[] {
    if (!this._disabledStartTimeMinutesMap[key]) {
      this._disabledStartTimeMinutesMap[key] = (hour: number) => {
        const end = this.timeRangeValueMap[key]?.[1];
        if (!end) return [];
        if (hour === end.getHours()) {
          return Array.from({ length: 60 }, (_, i) => i).filter(m => m > end.getMinutes());
        }
        return [];
      };
    }
    return this._disabledStartTimeMinutesMap[key];
  }

  private _disabledEndTimeHoursMap: Record<string, () => number[]> = {};
  getDisabledEndTimeHours(key: string): () => number[] {
    if (!this._disabledEndTimeHoursMap[key]) {
      this._disabledEndTimeHoursMap[key] = () => {
        const start = this.timeRangeValueMap[key]?.[0];
        if (!start) return [];
        return Array.from({ length: 24 }, (_, i) => i).filter(h => h < start.getHours());
      };
    }
    return this._disabledEndTimeHoursMap[key];
  }

  private _disabledEndTimeMinutesMap: Record<string, (hour: number) => number[]> = {};
  getDisabledEndTimeMinutes(key: string): (hour: number) => number[] {
    if (!this._disabledEndTimeMinutesMap[key]) {
      this._disabledEndTimeMinutesMap[key] = (hour: number) => {
        const start = this.timeRangeValueMap[key]?.[0];
        if (!start) return [];
        if (hour === start.getHours()) {
          return Array.from({ length: 60 }, (_, i) => i).filter(m => m < start.getMinutes());
        }
        return [];
      };
    }
    return this._disabledEndTimeMinutesMap[key];
  }

  applyTimeRangeFilter(column: TableColumn): void {
    const key = column.filterKey || column.key;
    const range = this.timeRangeValueMap[key];
    this.timeRangeVisibleMap[key] = false;
    this.dateRangeChange.emit({
      key,
      start: range && range[0] ? this.formatTime(range[0]) : null,
      end: range && range[1] ? this.formatTime(range[1]) : null
    });
  }

  resetTimeRangeFilter(column: TableColumn): void {
    const key = column.filterKey || column.key;
    this.timeRangeValueMap[key] = [null, null];
    this.timeRangeVisibleMap[key] = false;
    this.dateRangeChange.emit({ key, start: null, end: null });
  }

  // Per-column single date state
  dateVisibleMap: Record<string, boolean> = {};
  dateValueMap: Record<string, Date | null> = {};

  isDateActive(key: string): boolean {
    return !!this.dateValueMap[key];
  }

  onSingleDateChange(key: string, result: Date | null): void {
    this.dateValueMap[key] = result;
  }

  applyDateFilter(column: TableColumn): void {
    const key = column.filterKey || column.key;
    const date = this.dateValueMap[key];
    this.dateVisibleMap[key] = false;
    this.dateChange.emit({
      key,
      value: date ? this.formatDate(date, false, true) : null
    });
  }

  resetDateFilter(column: TableColumn): void {
    const key = column.filterKey || column.key;
    this.dateValueMap[key] = null;
    this.dateVisibleMap[key] = false;
    this.dateChange.emit({ key, value: null });
  }

  // Per-column custom select filter state
  selectVisibleMap: Record<string, boolean> = {};
  selectValueMap: Record<string, any> = {};
  selectFilterOptionsMap: Record<string, Array<{ text: string; value: any; byDefault?: boolean }>> = {};

  isSelectActive(key: string): boolean {
    const val = this.selectValueMap[key];
    return Array.isArray(val) ? val.length > 0 : !!val;
  }

  onSelectValueChange(column: TableColumn, result: any): void {
    const key = column.filterKey || column.key;
    this.selectValueMap[key] = result;
    this.updateSelectFilterOptions(column);
  }

  onSelectFilterOpenChanged(key: string, isOpen: boolean, select: { nzOpen: boolean }): void {
    // nz-select tự đóng sau khi chọn đơn; popup lọc vẫn chờ người dùng bấm Áp dụng.
    if (!isOpen && this.selectVisibleMap[key]) {
      queueMicrotask(() => {
        if (this.selectVisibleMap[key]) select.nzOpen = true;
      });
    }
  }

  applySelectFilter(column: TableColumn): void {
    const key = column.filterKey || column.key;
    this.selectVisibleMap[key] = false;
    this.selectFilterChange.emit({
      key,
      value: this.selectValueMap[key]
    });
  }

  resetSelectFilter(column: TableColumn): void {
    const key = column.filterKey || column.key;
    this.selectValueMap[key] = column.filterOption?.filterMultiple ? [] : null;
    this.updateSelectFilterOptions(column);
    this.selectVisibleMap[key] = false;
    this.selectFilterChange.emit({
      key,
      value: this.selectValueMap[key]
    });
  }

  isSelectOptionSelected(key: string, value: any): boolean {
    const val = this.selectValueMap[key];
    return Array.isArray(val) ? val.includes(value) : val === value;
  }

  private updateSelectFilterOptions(column: TableColumn): void {
    const key = column.filterKey || column.key;
    const options = column.filterOption?.filterData || [];
    const selectedValues = this.selectValueMap[key];

    if (!column.filterOption?.filterMultiple || !Array.isArray(selectedValues) || !selectedValues.length) {
      this.selectFilterOptionsMap[key] = [...options];
      return;
    }

    const selectedValueSet = new Set(selectedValues);
    this.selectFilterOptionsMap[key] = [
      ...options.filter(option => selectedValueSet.has(option.value)),
      ...options.filter(option => !selectedValueSet.has(option.value))
    ];
  }

  // Per-column number range state
  numberRangeVisibleMap: Record<string, boolean> = {};
  numberRangeValueMap: Record<string, [number | null, number | null]> = {};

  isNumberRangeActive(key: string): boolean {
    const val = this.numberRangeValueMap[key];
    return !!(val && (val[0] !== null || val[1] !== null));
  }

  onNumberRangeChange(key: string, index: 0 | 1, result: number | null): void {
    if (!this.numberRangeValueMap[key]) {
      this.numberRangeValueMap[key] = [null, null];
    }
    this.numberRangeValueMap[key][index] = result;
  }

  applyNumberRangeFilter(column: TableColumn): void {
    const key = column.filterKey || column.key;
    const range = this.numberRangeValueMap[key] || [null, null];
    this.numberRangeVisibleMap[key] = false;
    this.numberRangeChange.emit({
      key,
      from: range[0] ?? null,
      to: range[1] ?? null
    });
  }

  resetNumberRangeFilter(column: TableColumn): void {
    const key = column.filterKey || column.key;
    this.numberRangeValueMap[key] = [null, null];
    this.numberRangeVisibleMap[key] = false;
    this.numberRangeChange.emit({ key, from: null, to: null });
  }

  private formatDate(date: Date, endOfDay: boolean, dateOnly = false): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const mo = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    if (dateOnly) {
      return `${y}-${mo}-${d}`;
    }
    const h = endOfDay ? '23' : pad(date.getHours());
    const mi = endOfDay ? '59' : pad(date.getMinutes());
    const s = endOfDay ? '59' : pad(date.getSeconds());
    return `${y}-${mo}-${d} ${h}:${mi}:${s}+07:00`;
  }

  onQueryParamsChange(params: NzTableQueryParams): void {
    this.queryParamsChange.emit(params);
  }

  private getCellValue(data: any, key: string): any {
    return key.split('.').reduce((obj, k) => obj?.[k], data);
  }

  getTransformedCellValue(data: any, column: TableColumn): any {
    const rawValue = this.getCellValue(data, column.key);
    if (column.numberDigits && rawValue !== null && rawValue !== undefined && rawValue !== '') {
      const numberValue = Number(rawValue);
      return Number.isFinite(numberValue) ? formatNumber(numberValue, 'en-US', column.numberDigits) : rawValue;
    }
    if (column.pipeName) {
      const args = column.pipeArgs || [];
      return this.pipeRegistry.transform(column.pipeName, rawValue, args);
    }

    return rawValue;
  }

  getColumnClass(column: TableColumn): string {
    const classes = [];
    if (column.align) {
      classes.push(`text-${column.align}`);
    }
    if (column.className) {
      classes.push(column.className);
    }
    return classes.join(' ');
  }

  openLink(url: string): void {
    if (url && typeof url === 'string') {
      window.open(url, '_blank');
    }
  }

  onExpandChange(item: any, id: any, checked: boolean): void {
    const multiple = this.expandConfig()?.expandMultiple ?? true;

    if (!multiple) {
      this.expandSet.clear();
    }

    if (checked) {
      this.expandSet.add(id);
    } else {
      this.expandSet.delete(id);
    }

    this.expandChange.emit({ item, expanded: checked });
  }

  isExpanded(id: any): boolean {
    return this.expandSet.has(id);
  }

  getSummaryColumnIndex(): number {
    return this.columns().findIndex(c => c.key === this.summaryColumnKey());
  }

  shouldRenderSummaryCell(index: number): boolean {
    const start = this.getSummaryColumnIndex();
    const span = this.summaryLabelSpan();

    if (start === -1 || span <= 1) return true;
    return !(index > start && index < start + span);
  }

  getSummaryLabelValue(data: any): any {
    const key = this.summaryLabelValueKey();
    if (!key) return null;
    return key.split('.').reduce((obj, k) => obj?.[k], data);
  }

  getSummaryCurrencyParts(data: any, column: TableColumn): { amount: string; unit: string } | null {
    const value = this.getCellValue(data, column.key);
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const amount = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(amount)) {
      return null;
    }

    return {
      amount: amount.toLocaleString('de-DE'),
      unit: ''
    };
  }
}
