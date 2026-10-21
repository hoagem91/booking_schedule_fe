import { HttpRequest, HttpEvent, HttpHandlerFn, HttpErrorResponse, HttpContextToken } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap, finalize, shareReplay, tap } from 'rxjs/operators';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ApiConstants } from '../constants/api.constants';
import { LoginResponse } from '../models/auth.model';

const REFRESH_RETRY_CONTEXT = new HttpContextToken<boolean>(() => false);
let refreshInFlight$: Observable<LoginResponse> | null = null;

export const AuthInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const isLoginRequest = req.url.includes(ApiConstants.API_AUTH_LOGIN);
  const isRefreshRequest = req.url.includes(ApiConstants.API_AUTH_REFRESH_TOKEN);
  const hasRetried = req.context.get(REFRESH_RETRY_CONTEXT);

  const refreshTokenSingleFlight = () => {
    if (!refreshInFlight$) {
      const refreshToken = authService.getRefreshToken();
      if (!refreshToken) {
        return throwError(() => new Error('Missing refresh token'));
      }

      refreshInFlight$ = authService
        .refreshToken()
        .pipe(
          tap((response) => {
            authService.saveAuthBundle({
              token: response.token,
              expiredAt: response.expiredAt,
              refreshToken: response.refreshToken,
              refreshTokenExpiredAt: response.refreshTokenExpiredAt,
            });
          }),
          finalize(() => {
            refreshInFlight$ = null;
          }),
          shareReplay({ bufferSize: 1, refCount: false })
        );
    }

    return refreshInFlight$;
  };

  if (req.headers.get('auth') === 'false') {
    return next(req.clone({ headers: req.headers.delete('auth') }));
  }

  const clonedReq = token ? req.clone({ setHeaders: { Authorization: token } }) : req;

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      if (isLoginRequest) {
        return throwError(() => error);
      }

      if (isRefreshRequest || hasRetried) {
        authService.forceLogout();
        return throwError(() => error);
      }

      return refreshTokenSingleFlight().pipe(
        switchMap((response: LoginResponse) => {
          const retryReq = req.clone({
            setHeaders: { Authorization: `${response.token}` },
            context: req.context.set(REFRESH_RETRY_CONTEXT, true),
          });
          return next(retryReq);
        }),
        catchError((refreshError: HttpErrorResponse) => {
          authService.forceLogout();
          return throwError(() => refreshError);
        })
      );
    })
  );
};
