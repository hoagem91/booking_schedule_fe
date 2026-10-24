import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ManagementAccessService, managementError } from '../services/management-access.service';
import { managementNavigation } from '../models/management.models';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet],
  templateUrl: './management-layout.html', styleUrl: './management-layout.css',
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
  readonly menu = computed(() => managementNavigation.filter(item => this.access.can(item.permission)));
  readonly initials = computed(() => (this.access.user()?.fullName || this.access.user()?.username || '?').trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase());
  readonly pageTitle = computed(() => {
    this.navigation();
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;
    return route.data['heading'] as string || 'Không gian làm việc';
  });

  constructor() {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.closeNav());
  }
  openNav(): void { this.mobileNav()?.nativeElement.showModal(); }
  closeNav(): void { this.mobileNav()?.nativeElement.close(); }
  logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true); this.logoutError.set('');
    this.auth.logout().pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe({ next: () => this.access.reset(), error: error => this.logoutError.set(managementError(error)) });
  }
}
