import { Injectable } from '@angular/core';
import { defer, delayWhen, map, of, timeout, timer } from 'rxjs';
import { BaseService } from './base/base.service';
import { ApiResponse } from '../models/api-response.model';

export type AssistantTurn = { role: 'user' | 'assistant'; content: string };
export type AssistantAction = 'SPECIALTIES' | 'SERVICES' | 'BOOKING_HELP';

@Injectable({ providedIn: 'root' })
export class AssistantService extends BaseService {
  send(message: string, history: AssistantTurn[], action?: AssistantAction) {
    const payload = action ? { action } : {
      message,
      history: history.filter(t => t.content.trim() && t.content.length <= 2000).slice(-8)
    };
    return defer(() => {
      // Start the real request immediately; only fast successful replies wait for the UI.
      // Keeping the timer in the subscription makes closing/resetting chat cancel it too.
      const revealAt = Date.now() + 900 + Math.floor(Math.random() * 501);
      return this.http.post<ApiResponse<string>>(
        this.joinUrl(this.apiUrl, 'api/assistant', action ? 'quick-reply' : 'chat'), payload
      ).pipe(timeout(15000), map(response => {
        if (response.code !== 1000 || typeof response.result !== 'string') {
          throw new Error('Phản hồi chưa hợp lệ. Vui lòng thử lại.');
        }
        return response.result;
      }), delayWhen(() => {
        const remaining = revealAt - Date.now();
        return remaining > 0 ? timer(remaining) : of(0);
      }));
    });
  }
}
