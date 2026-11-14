import { Component, DestroyRef, ElementRef, ViewChild, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { Subscription } from 'rxjs';
import { AssistantAction, AssistantService, AssistantTurn } from '../../services/assistant.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-assistant-chat', standalone: true, imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './assistant-chat.html', styleUrl: './assistant-chat.css'
})
export class AssistantChat {
  private readonly api = inject(AssistantService);
  private readonly auth = inject(AuthService);
  private request?: Subscription;
  private generation = 0;
  private failed?: { message: string; history: AssistantTurn[]; action?: AssistantAction };
  @ViewChild('messages') private messages?: ElementRef<HTMLElement>;
  @ViewChild('composer') private composer?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('launcher') private launcher?: ElementRef<HTMLButtonElement>;
  readonly open = signal(false);
  readonly turns = signal<AssistantTurn[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly actions: { label: string; action: AssistantAction }[] = [
    { label: 'Xem chuyên khoa', action: 'SPECIALTIES' },
    { label: 'Bảng giá dịch vụ', action: 'SERVICES' },
    { label: 'Hướng dẫn đặt lịch', action: 'BOOKING_HELP' }
  ];
  draft = '';

  constructor() {
    effect(() => { this.auth.sessionGeneration(); this.reset(); });
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  toggle(): void {
    if (this.open()) {
      this.open.set(false);
      this.generation++;
      this.request?.unsubscribe();
      if (this.busy()) this.error.set('Đã dừng chờ phản hồi. Bạn có thể thử lại.');
      this.busy.set(false);
      this.launcher?.nativeElement.focus();
    } else {
      this.open.set(true);
      setTimeout(() => { this.composer?.nativeElement.focus(); this.scroll(true); });
    }
  }

  reset(): void {
    this.generation++;
    this.request?.unsubscribe();
    this.turns.set([]);
    this.busy.set(false);
    this.error.set('');
    this.draft = '';
    this.failed = undefined;
  }

  send(action?: AssistantAction): void {
    if (this.busy() || this.error()) return;
    const message = action ? this.actions.find(item => item.action === action)!.label : this.draft.trim();
    if (!message || message.length > 2000) return;
    const history = [...this.turns()];
    this.turns.update(turns => [...turns, { role: 'user', content: message }]);
    this.draft = '';
    this.failed = { message, history, action };
    this.perform();
    this.scroll(true);
  }

  retry(): void { if (!this.busy() && this.failed) this.perform(); }

  private perform(): void {
    const pending = this.failed!;
    const generation = ++this.generation;
    this.error.set('');
    this.busy.set(true);
    this.request = this.api.send(pending.message, pending.history, pending.action).subscribe({
      next: content => {
        if (generation !== this.generation) return;
        this.turns.update(turns => [...turns, { role: 'assistant', content }]);
        this.failed = undefined;
        this.busy.set(false);
        this.scroll();
      },
      error: error => {
        if (generation !== this.generation) return;
        this.busy.set(false);
        this.error.set(error.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          : error.status === 403 ? 'Bạn chưa được phép sử dụng trợ lý.'
          : error.status === 400 ? 'Nội dung gửi chưa hợp lệ. Hãy bắt đầu cuộc trò chuyện mới.'
          : 'Chưa nhận được phản hồi. Vui lòng thử lại.');
        this.scroll();
      }
    });
  }

  private scroll(force = false): void {
    const element = this.messages?.nativeElement;
    if (!element || (!force && element.scrollHeight - element.scrollTop - element.clientHeight > 140)) return;
    setTimeout(() => { element.scrollTop = element.scrollHeight; });
  }
}
