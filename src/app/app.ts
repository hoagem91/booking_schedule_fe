import { Component, inject, signal } from '@angular/core';
import { GuardsCheckEnd, GuardsCheckStart, NavigationCancel, NavigationEnd, NavigationError, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('booking_schedule-fe');
  protected readonly verifyingManagement = signal(false);
  constructor() {
    inject(Router).events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof GuardsCheckStart && event.url.startsWith('/management')) this.verifyingManagement.set(true);
      if (event instanceof GuardsCheckEnd || event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) this.verifyingManagement.set(false);
    });
  }
}
