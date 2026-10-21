import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NzRadioModule } from 'ng-zorro-antd/radio';

export interface ShareRadioOption {
  label: string;
  value: string | number;
}

@Component({
  standalone: true,
  selector: 'app-share-radio-group',
  templateUrl: './share-radio-group.html',
  styleUrl: './share-radio-group.css',
  imports: [FormsModule, NzRadioModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ShareRadioGroup), multi: true }]
})
export class ShareRadioGroup implements ControlValueAccessor {
  @Input() options: ShareRadioOption[] = [];
  protected value: string | number | null = null;
  protected disabled = false;
  private onChange: (value: string | number | null) => void = () => {};
  private onTouched: () => void = () => {};

  protected handleValueChange(value: string | number): void {
    this.value = value;
    this.onChange(value);
    this.onTouched();
  }
  writeValue(value: string | number | null): void { this.value = value; }
  registerOnChange(fn: (value: string | number | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }
}
