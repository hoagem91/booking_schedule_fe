import { Component, inject, signal, viewChild } from '@angular/core';
import { GuardsCheckStart, NavigationCancel, NavigationEnd, NavigationError, NavigationSkipped, Router, RouterOutlet } from '@angular/router';
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
  private readonly outlet = viewChild(RouterOutlet);
  constructor() {
    inject(Router).events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof GuardsCheckStart) {
        const outlet = this.outlet();
        const shellActive = outlet?.isActivated && outlet.activatedRoute.snapshot.data['managementShell'] === true;
        const target = event.urlAfterRedirects;
        const managementTarget = /^\/management(?:\/|$)/.test(target)
          && !/^\/management\/(login|access-error)(?:[/?#]|$)/.test(target);
        this.verifyingManagement.set(managementTarget && !shellActive);
      }
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError || event instanceof NavigationSkipped) this.verifyingManagement.set(false);
    });
  }
}
