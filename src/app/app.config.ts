import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import vi from '@angular/common/locales/vi';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNzI18n, vi_VN } from 'ng-zorro-antd/i18n';
import { routes } from './app.routes';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { NgxPermissionsModule } from 'ngx-permissions';

registerLocaleData(vi);

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    provideClientHydration(withEventReplay()), provideHttpClient(withFetch(), withInterceptors([AuthInterceptor])),
    provideNzI18n(vi_VN), provideAnimationsAsync(),importProvidersFrom(NgxPermissionsModule.forRoot())]
};
