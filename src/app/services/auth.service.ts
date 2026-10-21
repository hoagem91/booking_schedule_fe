import { environment } from "../../environments/environment";
import { ApiConstants } from "../constants/api.constants";
import { ApiResponse } from "../models/api-response.model";
import { ChangePasswordRequest, LoginRequest, LoginResponse, RefreshTokenRequest } from "../models/auth.model";
import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { catchError, map, Observable, tap, throwError } from "rxjs";
import { updateAuth, resetAuth, authStore } from "../store/auth.store";
import { NzNotificationService } from "ng-zorro-antd/notification";
import { resetUserProfile } from "../store/user-profile.store";
import { resetWarehouseEmployee } from "../store/warehouse-employee.store";
import { UserProfileService } from "./user-profile.serivce";
import { Router } from "@angular/router";
import { NzModalService } from "ng-zorro-antd/modal";
import { DrawerManagerService } from "./drawer/drawer.service";

@Injectable({
  providedIn: "root"
})
export class AuthService {
  private http = inject(HttpClient);
  private notification = inject(NzNotificationService);
  private router = inject(Router);
  private modal = inject(NzModalService);
  private drawerManager = inject(DrawerManagerService);
  private userProfileService = inject(UserProfileService);
  private readonly apiUrl = environment.api.hostSso;

  constructor() {}

  login(request: LoginRequest, companyCode: string, platform: string): Observable<ApiResponse<LoginResponse>> {
    const options = {
      headers: new HttpHeaders({
        auth: 'false',
        'company-code': companyCode,
        // 'platform': platform
      })
    };

    return this.http.post<ApiResponse<LoginResponse>>(
      `${this.apiUrl}${ApiConstants.API_AUTH_LOGIN}`,
      request,
      options
    ).pipe(
      tap((response) => {
        if (response && response.errorCode === '200') {
          this.saveAuthBundle({
            token: response.data.token,
            expiredAt: response.data.expiredAt,
            refreshToken: response.data.refreshToken,
            refreshTokenExpiredAt: response.data.refreshTokenExpiredAt
          });
          this.userProfileService.fetchUserProfile(false);
        } else {
          throw new Error(response.message);
        }
      }),
      catchError((error) => {
        this.notification.error('<b>Lỗi đăng nhập</b>', error.message || 'Không thể đăng nhập');
        return throwError(() => error);
      })
    );
  }

  refreshToken(): Observable<LoginResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('Refresh token không tồn tại'));
    }

    const request: RefreshTokenRequest = { refreshToken };
    return this.http.post<ApiResponse<LoginResponse>>(
      `${this.apiUrl}${ApiConstants.API_AUTH_REFRESH_TOKEN}`,
      request,
      { headers: new HttpHeaders({ auth: 'false' }) }
    ).pipe(
      map((response) => {
        if (response && response.errorCode === '200') {
          return response.data;
        }
        throw new Error(response?.message || 'Làm mới token thất bại');
      })
    );
  }

  getToken(): string | null {
    return authStore.getValue().token;
  }

  getRefreshToken(): string | null {
    return authStore.getValue().refreshToken;
  }

  saveAuthBundle(bundle: {
    token: string;
    expiredAt: string;
    refreshToken: string;
    refreshTokenExpiredAt: string;
  }): void {
    updateAuth(
      bundle.token,
      bundle.expiredAt,
      bundle.refreshToken,
      bundle.refreshTokenExpiredAt
    );
  }

  clearAll(): void {
    this.modal.closeAll();
    this.drawerManager.closeAll();
    resetAuth();
    resetUserProfile();
    resetWarehouseEmployee();
  }

  logout(): void {
    this.clearAll();
    this.router.navigate(['/login']).then(() => {
      this.notification.success('<b>Thành công</b>', 'Đăng xuất thành công');
    });
  }

  forceLogout(): void {
    this.clearAll();
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    const { token, expiredAt } = authStore.getValue();
    if (!token || !expiredAt) return false;
    return new Date(expiredAt).getTime() > Date.now();
  }

  get Token(): string | null {
    return authStore.getValue().token;
  }

  public forgotPassword(email: string, notification = true): Observable<ApiResponse<null>> {
    const url = `${this.apiUrl}${ApiConstants.API_AUTH_FORGOT_PASSWORD}`;
    return this.http.post<ApiResponse<null>>(url, { email })
      .pipe(
        tap((response) => {
          if(notification){
            if(response.success && response.errorCode === '200') {
              this.notification.success('<b>Thành công</b>', 'Đường dẫn đặt lại mật khẩu đã được gửi đến email của bạn, vui lòng kiểm tra email');
            } else {
              this.notification.error('<b>Lỗi</b>', response.message || 'Email không tồn tại');
            }
          }
        }),
        catchError((err) => {
          if(notification) {
            this.notification.error('<b>Lỗi</b>', err.error?.message || err.message);
          }
          return throwError(() => err);
        })
      );
  }

  public resetPassword(body: any, notification = true): Observable<ApiResponse<null>> {
    const url = `${this.apiUrl}${ApiConstants.API_AUTH_RESET_PASSWORD}`;
    return this.http.post<ApiResponse<null>>(url, body)
      .pipe(
        tap((response) => {
          if(notification) {
            if(response.success && response.errorCode === '200') {
              this.notification.success('<b>Thành công</b>', response.message);
            } else {
              this.notification.error('<b>Lỗi</b>', response.message)
            }
          }
        }),
        catchError((err) => {
          if(notification) {
            this.notification.error('<b>Lỗi</b>', err.error?.message || err.message);
          }
          return throwError(() => err);
        })
      );
  }

  public changePassword(
    body: ChangePasswordRequest,
    notification = true
  ): Observable<ApiResponse<null>> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('Phiên đăng nhập không tồn tại'));
    }

    const url = `${this.apiUrl}${ApiConstants.API_USER_CHANGE_PASSWORD}`;

    return this.http.put<ApiResponse<null>>(url, body).pipe(
      tap((response) => {
        if (!notification) {
          return;
        }

        if (response.success && response.errorCode === '200') {
          this.notification.success('<b>Thành công</b>', response.message || 'Đổi mật khẩu thành công');
        } else {
          this.notification.error('<b>Lỗi</b>', response.message || 'Không thể đổi mật khẩu');
        }
      }),
      catchError((err) => {
        if (notification) {
          this.notification.error(
            '<b>Lỗi</b>',
            err.error?.message || err.message || 'Không thể đổi mật khẩu'
          );
        }
        return throwError(() => err);
      })
    );
  }
}
