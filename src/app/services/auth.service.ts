import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, map, Observable, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { BookingApiResponse, LoginRequest, LoginResponse, RegisterRequest } from '../models/auth.model';
import { ApiConstants } from '../constants/api-constants';
import { apiResponseSucceeded } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly storageKey = 'booking-schedule-auth';
  private session: LoginResponse | null = null;
  private loginArea: 'patient' | 'management' = 'patient';
  readonly sessionGeneration = signal(0);
  private readonly apiUrl = environment.api.baseUrl;
  private readonly publicOptions = { headers: new HttpHeaders({ auth: 'false' }) };

  constructor() {
    if (this.browser) {
      try {
        const saved = JSON.parse(sessionStorage.getItem(this.storageKey) ?? 'null');
        if (this.validBundle(saved)) {
          this.session = saved;
          if (sessionStorage.getItem(`${this.storageKey}-area`) === 'management') this.loginArea = 'management';
        }
        else sessionStorage.removeItem(this.storageKey);
      } catch { /* Session storage is optional. */ }
    }
  }

  login(request: LoginRequest, area: 'patient' | 'management' = 'patient'): Observable<LoginResponse> {
    return this.http.post<BookingApiResponse<LoginResponse>>(
      `${this.apiUrl}${ApiConstants.API_AUTH_LOGIN}`, request, this.publicOptions,
    ).pipe(
      map(response => this.unwrap(response)),
      tap(bundle => { this.setLoginArea(area); this.saveAuthBundle(bundle); }),
      catchError(error => throwError(() => new Error(this.loginError(error)))),
    );
  }

  register(request: RegisterRequest): Observable<LoginResponse> {
    return this.http.post<BookingApiResponse<LoginResponse>>(
      `${this.apiUrl}${ApiConstants.API_AUTH_REGISTER}`, request, this.publicOptions,
    ).pipe(
      map(response => {
        if (!apiResponseSucceeded(response)) throw new Error(this.registerErrorMessage(response?.code, response?.message));
        return this.unwrap(response);
      }),
      tap(bundle => { this.setLoginArea('patient'); this.saveAuthBundle(bundle); }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          if (error.status === 0) return throwError(() => new Error('Không thể kết nối máy chủ. Vui lòng thử lại.'));
          if (error.status >= 500) return throwError(() => new Error('Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'));
          return throwError(() => new Error(this.registerErrorMessage(error.error?.code, error.error?.message)));
        }
        return throwError(() => error instanceof Error ? error : new Error('Không thể đăng ký. Vui lòng thử lại.'));
      }),
    );
  }

  private registerErrorMessage(code?: number, message?: string): string {
    if (code === 1002) return 'Tên đăng nhập hoặc email đã được sử dụng.';
    return message || 'Không thể đăng ký. Vui lòng kiểm tra thông tin và thử lại.';
  }

  refreshToken(): Observable<LoginResponse> {
    const token = this.getToken();
    if (!token) return throwError(() => new Error('Phiên đăng nhập không tồn tại.'));
    return this.http.post<BookingApiResponse<LoginResponse>>(
      `${this.apiUrl}${ApiConstants.API_AUTH_REFRESH_TOKEN}`, { token }, this.publicOptions,
    ).pipe(map(response => this.unwrap(response)));
  }

  private validBundle(bundle: LoginResponse | null): bundle is LoginResponse {
    return !!bundle && bundle.authenticated === true && typeof bundle.token === 'string'
      && !!bundle.token.trim() && Number.isFinite(Date.parse(bundle.expiryTime));
  }

  private unwrap(response: BookingApiResponse<LoginResponse>): LoginResponse {
    if (!apiResponseSucceeded(response)) {
      throw new Error(this.messageForCode(response?.code, response?.message));
    }
    const bundle = response.result ?? null;
    if (!this.validBundle(bundle) || Date.parse(bundle.expiryTime) <= Date.now()) {
      throw new Error('Dữ liệu phiên đăng nhập không hợp lệ. Vui lòng thử lại.');
    }
    return bundle;
  }

  private messageForCode(code?: number, fallback?: string): string {
    if (code === 1005 || code === 1006) return 'Tên đăng nhập hoặc mật khẩu không đúng.';
    if (code === 1012) return 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.';
    return fallback || 'Không thể đăng nhập. Vui lòng thử lại.';
  }

  private loginError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.';
      if (error.status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
      return this.messageForCode(error.error?.code, error.error?.message);
    }
    return error instanceof Error ? error.message : 'Không thể đăng nhập. Vui lòng thử lại.';
  }

  saveAuthBundle(bundle: LoginResponse): void {
    if (this.session?.userId !== bundle.userId) this.sessionGeneration.update(value => value + 1);
    this.session = bundle;
    if (this.browser) {
      try { sessionStorage.setItem(this.storageKey, JSON.stringify(bundle)); } catch { /* Use in-memory session. */ }
    }
  }
  getToken(): string | null { return this.session?.token ?? null; }
  getUserId(): number | null { return this.session?.userId ?? null; }
  setLoginArea(area: 'patient' | 'management'): void {
    this.loginArea = area;
    if (this.browser) {
      try { sessionStorage.setItem(`${this.storageKey}-area`, area); } catch { /* Storage is optional. */ }
    }
  }
  getRefreshToken(): string | null { return this.getToken(); }
  get Token(): string | null { return this.getToken(); }
  isAuthenticated(): boolean {
    return this.validBundle(this.session) && Date.parse(this.session.expiryTime) > Date.now();
  }
  clearAll(): void {
    this.session = null;
    this.sessionGeneration.update(value => value + 1);
    if (this.browser) {
      try {
        sessionStorage.removeItem(this.storageKey);
        sessionStorage.removeItem(`${this.storageKey}-area`);
      } catch { /* Already cleared in memory. */ }
    }
    this.loginArea = 'patient';
  }
  forceLogout(): void {
    const loginUrl = this.router.url.startsWith('/management') || this.loginArea === 'management' ? '/management/login' : '/login';
    this.clearAll();
    void this.router.navigateByUrl(loginUrl);
  }
  logout(): Observable<void> {
    const token = this.getToken();
    if (!token) { this.forceLogout(); return new Observable(subscriber => subscriber.complete()); }
    return this.http.post<BookingApiResponse<null>>(
      `${this.apiUrl}${ApiConstants.API_AUTH_LOGOUT}`, { token }, this.publicOptions,
    ).pipe(map(response => {
      if (!apiResponseSucceeded(response)) throw new Error(response.message || 'Không thể đăng xuất.');
      this.forceLogout();
    }));
  }
}
