import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';

export interface MultiSelectFilterOption {
  text: string;
  value: string | number;
}

@Component({
  standalone: true,
  selector: 'app-multi-select-filter',
  templateUrl: './multi-select-filter.component.html',
  styleUrl: './multi-select-filter.component.css',
  imports: [FormsModule, NzSelectModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => MultiSelectFilterComponent),
    multi: true
  }]
})
export class MultiSelectFilterComponent implements ControlValueAccessor {
  @Input() options: MultiSelectFilterOption[] = [];
  @Input() placeholder = 'Tất cả';
  @Input() maxHeight = 300;
  @Input() maxTagCount = 0;
  @Input() single = false;
  @Output() valueChange = new EventEmitter<Array<string | number> | string | number | null>();

  protected value: Array<string | number> | string | number | null = [];
  protected disabled = false;

  protected get dropdownStyle(): Record<string, string> {
    return { 'max-height': `${this.maxHeight}px` };
  }

  private onChange: (value: Array<string | number> | string | number | null) => void = () => {};
  private onTouched: () => void = () => {};

  protected handleValueChange(value: Array<string | number> | string | number | null): void {
    this.value = value ?? (this.single ? null : []);
    this.onChange(this.value);
    this.onTouched();
    this.valueChange.emit(this.value);
  }

  writeValue(value: Array<string | number> | string | number | null): void {
    this.value = value ?? (this.single ? null : []);
  }

  registerOnChange(fn: (value: Array<string | number> | string | number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }
}
