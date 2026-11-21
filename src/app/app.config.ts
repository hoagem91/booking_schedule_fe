import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';

import { registerLocaleData } from '@angular/common';
import vi from '@angular/common/locales/vi';

import {
  provideRouter,
  withNavigationErrorHandler,
  withInMemoryScrolling
} from '@angular/router';

import {
  provideHttpClient,
  withFetch,
  withInterceptors
} from '@angular/common/http';

import {
  provideClientHydration,
  withEventReplay
} from '@angular/platform-browser';

import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import {
  provideNzI18n,
  vi_VN,
  NZ_DATE_LOCALE
} from 'ng-zorro-antd/i18n';

import { vi as dateFnsVi } from 'date-fns/locale';

import { FormsModule } from '@angular/forms';

import { NgxPermissionsModule } from 'ngx-permissions';

import { provideNzIcons } from 'ng-zorro-antd/icon';
import { icons } from './app-icons';

import {
  NzModalModule,
  NzModalService
} from 'ng-zorro-antd/modal';

import {
  NzDrawerModule,
  NzDrawerService
} from 'ng-zorro-antd/drawer';

import { NzResizableService } from 'ng-zorro-antd/resizable';

import { routes } from './app.routes';

import { AuthInterceptor } from './interceptors/auth.interceptor';
import { recoverPaymentChunk } from './utils/payment-chunk-recovery';

registerLocaleData(vi);

export const appConfig: ApplicationConfig = {
  providers: [
    // Angular core
    provideBrowserGlobalErrorListeners(),

    provideZoneChangeDetection({
      eventCoalescing: true
    }),

    // Router
    provideRouter(
      routes,
      withNavigationErrorHandler(event => {
        if (typeof window === 'undefined' || !window.navigator.onLine) return;
        try {
          recoverPaymentChunk(event.error, event.url, window.sessionStorage, url => window.location.replace(url));
        } catch { /* Preserve the router error if browser storage or navigation is unavailable. */ }
      }),
      withInMemoryScrolling({
        anchorScrolling: 'enabled'
      })
    ),

    // SSR Hydration
    provideClientHydration(
      withEventReplay()
    ),

    // HTTP Client
    provideHttpClient(
      withFetch(),
      withInterceptors([
        AuthInterceptor
      ])
    ),

    // NG-ZORRO Icons
    provideNzIcons(icons),

    // Vietnamese locale
    provideNzI18n(vi_VN),

    {
      provide: NZ_DATE_LOCALE,
      useValue: dateFnsVi
    },

    // Forms
    importProvidersFrom(FormsModule),

    // Permissions
    importProvidersFrom(
      NgxPermissionsModule.forRoot()
    ),

    // Animations
    provideAnimationsAsync(),

    // Modal
    NzModalService,
    importProvidersFrom(NzModalModule),

    // Drawer
    NzDrawerService,
    importProvidersFrom(NzDrawerModule),

    // Resizable
    NzResizableService
  ]
};
