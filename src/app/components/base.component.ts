import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, DestroyRef, Directive, inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Subject } from 'rxjs';
import { InternalRole, ManagementPermission } from '../management/management.models';
import { ManagementAccessService } from '../management/services/management-access.service';

/** Shared UI helpers; authentication and loading profiles belong to services/route guards. */
@Directive()
export abstract class BaseComponent implements OnInit, OnDestroy, AfterViewInit {
  protected readonly fb = inject(FormBuilder);
  protected readonly document = inject(DOCUMENT);
  protected readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly managementAccess = inject(ManagementAccessService);
  protected readonly currentUser = this.managementAccess.user;

  // Retained for BaseFormComponent/BaseListComponent and their takeUntil pipelines.
  protected unsubscribe = new Subject<void>();
  readonly errorCode = signal('');
  readonly errorMessage = signal('');

  private disposed = false;
  private readonly pendingDownloads = new Map<string, number>();
  private readonly amountFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 20 });

  constructor() {
    // Also clean up when a subclass overrides ngOnDestroy without calling super.
    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  // Extension hooks used by the existing form/list base classes.
  ngOnInit(): void {}
  ngAfterViewInit(): void {}
  ngOnDestroy(): void { this.dispose(); }

  /** UI visibility only. The backend must still authorize every request. */
  protected hasRole(role: InternalRole): boolean {
    const user = this.currentUser();
    return user?.status === 'ACTIVE' && user.roles.some(item => item.name === role);
  }

  protected hasPermission(permission: ManagementPermission): boolean {
    return this.managementAccess.can(permission);
  }

  protected setError(message: string, code: string | number = ''): void {
    this.errorMessage.set(message);
    this.errorCode.set(String(code));
  }

  protected clearError(): void {
    this.errorMessage.set('');
    this.errorCode.set('');
  }

  /** Open an application route without coupling web components to Electron. */
  protected openNewTab(route: string): void {
    const browserWindow = this.isBrowser ? this.document.defaultView : null;
    if (!browserWindow || !route.trim()) return;
    try {
      const target = new URL(route, this.document.baseURI);
      if (!['http:', 'https:'].includes(target.protocol) || target.origin !== browserWindow.location.origin) return;
      browserWindow.open(target.href, '_blank', 'noopener,noreferrer');
    } catch {
      // Invalid routes cannot be opened.
    }
  }

  get widthForModal(): string {
    const width = this.isBrowser ? this.document.defaultView?.innerWidth : undefined;
    if (width === undefined) return '60%';
    if (width < 640) return '100%';
    if (width < 768) return '90%';
    if (width < 1024) return '80%';
    if (width < 1280) return '60%';
    if (width < 1536) return '50%';
    return '40%';
  }

  // Keep the existing nz-input-number contract: 10000 <-> "10,000".
  readonly formatterVND = (value: number | null | undefined): string => {
    return typeof value === 'number' && Number.isFinite(value) ? this.amountFormatter.format(value) : '';
  };

  readonly parserVND = (value: string | null | undefined): number => {
    const amount = Number(value?.replace(/,/g, '').trim() ?? '');
    return Number.isFinite(amount) ? amount : 0;
  };

  protected isImageFile(fileName: string): boolean {
    const path = fileName.split(/[?#]/, 1)[0];
    return /\.(?:jpe?g|png|gif|bmp|webp|svg|avif)$/i.test(path);
  }

  downloadFileFromBlob(blob: Blob, filename: string): void {
    const browserWindow = this.isBrowser ? this.document.defaultView : null;
    if (!browserWindow || this.disposed) return;
    const url = browserWindow.URL.createObjectURL(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;

    // Allow the browser to start the download before releasing its object URL.
    const timer = browserWindow.setTimeout(() => {
      browserWindow.URL.revokeObjectURL(url);
      this.pendingDownloads.delete(url);
    }, 1000);
    this.pendingDownloads.set(url, timer);
    try {
      this.document.body.appendChild(anchor);
      anchor.click();
    } finally {
      anchor.remove();
    }
  }

  private dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribe.next();
    this.unsubscribe.complete();
    const browserWindow = this.isBrowser ? this.document.defaultView : null;
    for (const [url, timer] of this.pendingDownloads) {
      browserWindow?.clearTimeout(timer);
      browserWindow?.URL.revokeObjectURL(url);
    }
    this.pendingDownloads.clear();
  }
}
