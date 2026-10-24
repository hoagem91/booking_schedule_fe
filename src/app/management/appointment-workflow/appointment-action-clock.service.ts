import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppointmentActionClock {
  readonly now = signal(Date.now());
  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const timer = setInterval(() => this.now.set(Date.now()), 15000);
      inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
  }
}
