import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

@Component({
  standalone: true,
  selector: 'app-share-search-input',
  templateUrl: './share-search-input.html',
  styleUrl: './share-search-input.css',
  imports: [FormsModule, NzIconModule, NzInputModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ShareSearchInput),
    multi: true
  }]
})
export class ShareSearchInput implements ControlValueAccessor {
  @Input() placeholder = 'Nhập từ khóa...';
  @Output() search = new EventEmitter<string>();

  protected value = '';
  protected disabled = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  protected handleValueChange(value: string): void {
    this.value = value;
    this.onChange(value);
  }

  protected submitSearch(): void {
    this.onTouched();
    this.search.emit(this.value.trim());
  }

  protected handleBlur(): void {
    this.onTouched();
  }

  writeValue(value: string | null): void { this.value = value ?? ''; }
  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }
}
