import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-share-select-input',
  standalone: true,
  imports: [NzSelectModule, FormsModule],
  templateUrl: './share-select-input.html',
  styleUrls: ['./share-select-input.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ShareSelectInputComponent),
      multi: true
    }
  ]
})
export class ShareSelectInputComponent implements ControlValueAccessor {
  @Input() options: any[] = [];
  @Input() valueKey: string = 'id';
  @Input() labelKey: string = 'name';
  @Input() placeholder: string = 'Chọn dữ liệu';
  @Input() maxHeight = 300;
  @Input() maxTagCount: number = 0;
  @Input() customClass: string = 'w-full sm:w-48';
  @Input() disabled: boolean = false;
  @Input() multiple = true;
  @Input() allowClear = true;
  @Input() showSearch = true;

  @Output() selectionChange = new EventEmitter<any>();

  value: any = [];

  protected get dropdownStyle(): Record<string, string> {
    return { 'max-height': `${this.maxHeight}px` };
  }

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(val: any): void {
    this.value = val ?? (this.multiple ? [] : null);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onModelChange(val: any): void {
    this.value = val;
    this.onChange(val);
    this.onTouched();
    this.selectionChange.emit(val);
  }
}
