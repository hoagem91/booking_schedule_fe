import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ManagementAccessService, managementError } from '../services/management-access.service';
import { managementNavigation } from '../models/management.models';
import { NzIconDirective } from 'ng-zorro-antd/icon';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet, NzIconDirective],
  templateUrl: './management-layout.html', styleUrl: './management-layout.css'
})
export class ManagementLayout {
  readonly access = inject(ManagementAccessService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly navigation = toSignal(this.router.events.pipe(filter(event => event instanceof NavigationEnd)));
  readonly mobileNav = viewChild<ElementRef<HTMLDialogElement>>('mobileNav');
  readonly collapsed = signal(false);
  readonly loggingOut = signal(false);
  readonly logoutError = signal('');
  readonly navigating = signal(false);
  readonly menu = computed(() => managementNavigation.filter(item => item.path !== '/management/account' && this.access.can(item.permission)));
  readonly accountMenu = computed(() => managementNavigation.find(item => item.path === '/management/account' && this.access.can(item.permission)));
  readonly initials = computed(() => (this.access.user()?.fullName || this.access.user()?.username || '?').trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase());
  readonly pageTitle = computed(() => {
    this.navigation();
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;
    return route.data['heading'] as string || 'Không gian làm việc';
  });

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationStart) this.navigating.set(true);
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError || event instanceof NavigationSkipped) this.navigating.set(false);
      if (event instanceof NavigationEnd) this.closeNav();
    });
  }

  openNav(): void {
    this.mobileNav()?.nativeElement.showModal();
  }

  closeNav(): void {
    this.mobileNav()?.nativeElement.close();
  }

  logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.logoutError.set('');
    this.auth.logout().pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe({ next: () => this.access.reset(), error: error => this.logoutError.set(managementError(error)) });
  }
}
