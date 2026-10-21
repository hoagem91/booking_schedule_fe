import { Component, Input, signal } from '@angular/core';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
  standalone: true,
  selector: 'app-display-error',
  templateUrl: './display-error.component.html',
  styleUrl: './display-error.component.css',
  imports: [
    NzResultModule,
    NzButtonModule
  ]
})
export class DisplayErrorComponent {
  errorCode = signal<string | null>(null);
  errorMessage = signal<string>('');
  allowReloadPage = true;

  @Input({ required: true })
  set code(value: string | null) {
    this.errorCode.set(value);
  }

  @Input({ required: true })
  set message(value: string) {
    this.errorMessage.set(value || 'Đã xảy ra lỗi!');
  }

  reloadPage() {
    location.reload();
  }
}
