// src/app/core/base/base-http.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { catchError, map, MonoTypeOperatorFunction, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { ApiResponse, ApiResponseList, ApiResponseListAll } from '../../models/api-response.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BaseService {
  protected readonly http = inject(HttpClient);
  protected readonly notification = inject(NzNotificationService);

  protected readonly apiUrl = environment.api.hostRcm;

  constructor(...args: unknown[]);

  constructor() { }

  protected joinUrl(...parts: string[]) {
    return parts
      .map((p, i) => (i === 0 ? p.replace(/\/+$/g, '') : p.replace(/^\/+|\/+$/g, '')))
      .join('/');
  }

  protected handleResponse<R extends { errorCode?: string; message?: string }>(
    notify: boolean
  ): MonoTypeOperatorFunction<R> {
    return (source) =>
      source.pipe(
        tap((res: any) => {
          if (!res || res.errorCode !== '200') {
            if (notify) {
              this.notification.error('<b>Lỗi</b>', res?.message ?? 'Unknown error');
            }
            return;
          }

          if (notify) {
            this.notification.success('<b>Thành công</b>', res.message);
          }
        }),

        catchError((err) => {
          const apiError = {
            datetime: new Date().toISOString(),
            errorCode: err?.error?.errorCode ?? '500',
            message:
              err?.error?.message ??
              err?.message ??
              'Đã có lỗi xảy ra',
            data: null,
            success: false
          };

          if (notify) {
            this.notification.error('<b>Lỗi</b>', apiError.message);
          }

          // ✅ không throw, luôn trả response để subscribe nhận được
          return of(apiError as unknown as R);
        })
      );
  }

  protected get<T>(endpoint: string, params?: any, notification = false) {
    const url = this.joinUrl(this.apiUrl, endpoint);
    return this.http.get<ApiResponse<T>>(url, { params }).pipe(this.handleResponse(notification));
  }

  protected post<T>(endpoint: string, body?: any, params?: any, notification = true) {
    const url = this.joinUrl(this.apiUrl, endpoint);
    return this.http.post<ApiResponse<T>>(url, body, { params }).pipe(this.handleResponse(notification));
  }

  protected put<T>(endpoint: string, body?: any, notification = false) {
    const url = this.joinUrl(this.apiUrl, endpoint);
    return this.http.put<ApiResponse<T>>(url, body).pipe(this.handleResponse(notification));
  }

  protected putFormData<T>(endpoint: string, formData: FormData, notification = false) {
    const url = this.joinUrl(this.apiUrl, endpoint);
    return this.http.put<ApiResponse<T>>(url, formData).pipe(this.handleResponse(notification));
  }

  protected postFormData<T>(endpoint: string, formData: FormData, params?: any, notification = true) {
    const url = this.joinUrl(this.apiUrl, endpoint);
    return this.http.post<ApiResponse<T>>(url, formData, { params }).pipe(this.handleResponse(notification));
  }

  protected deleteItem<T>(endpoint: string, notification = false) {
    const url = this.joinUrl(this.apiUrl, endpoint);
    return this.http.delete<ApiResponse<T>>(url).pipe(this.handleResponse(notification));
  }

  protected postList<T, S = unknown>(endpoint: string, body?: any, params?: any, notification = false) {
    const url = this.joinUrl(this.apiUrl, endpoint);
    return this.http.post<ApiResponseList<T, S>>(url, body, { params }).pipe(this.handleResponse(notification));
  }

  protected postListAll<T>(endpoint: string, body?: any, params?: any, notification = false) {
    const url = this.joinUrl(this.apiUrl, endpoint);
    return this.http.post<ApiResponseListAll<T>>(url, body, { params }).pipe(this.handleResponse(notification));
  }

  protected postHtml(
    endpoint: string,
    body?: any,
    params?: any,
    notification = false
  ) {
    const url = this.joinUrl(this.apiUrl, endpoint);

    return this.http.post(url, body, {
      params,
      responseType: 'text'
    }).pipe(
      catchError((err) => {
        const errorMessage = err?.error?.message ?? err?.message ?? 'Đã có lỗi xảy ra';

        if (notification) {
          this.notification.error('<b>Lỗi</b>', errorMessage);
        }

        return throwError(() => err);
      })
    );
  }

  protected getFile(
    endpoint: string,
    params?: any,
    options?: {
      notification?: boolean;
      defaultFileName?: string;
      accept?: string;
      headers?: Record<string, string>;
    }
  ) {
    const url = this.joinUrl(this.apiUrl, endpoint);
    const notify = options?.notification ?? false;

    const headers = new HttpHeaders({
      ...(options?.accept ? { Accept: options.accept } : {}),
      ...(options?.headers ?? {})
    });

    return this.http
      .get(url, {
        params,
        headers,
        observe: 'response',
        responseType: 'blob'
      })
      .pipe(
        map((res: HttpResponse<Blob>) => {
          const blob = res.body ?? new Blob();
          const contentType = res.headers.get('content-type') ?? undefined;

          let filename = res.headers.get('Filename');
          if (!filename) {
            const disposition =
              res.headers.get('content-disposition') ??
              res.headers.get('Content-Disposition') ??
              '';
            const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match) {
              filename = match[1].replace(/['"]/g, '');
            }
          }

          if (!filename) {
            filename =
              options?.defaultFileName ||
              `template-${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
          }

          return { blob, filename, contentType };
        }),
        catchError((err: HttpErrorResponse) => {
          if (err.error instanceof Blob && err.error.type === 'application/json') {
            return this.parseBlobError(err).pipe(
              switchMap((errorResponse: ApiResponse<any>) => {
                const message = errorResponse?.message ?? 'Tải file thất bại';
                if (notify) {
                  this.notification.error('<b>Lỗi</b>', message);
                }
                return throwError(() => ({
                  ...err,
                  error: errorResponse,
                  message: message
                }));
              })
            );
          } else {
            const message = err?.error?.message ?? err?.message ?? 'Tải file thất bại';
            if (notify) {
              this.notification.error('<b>Lỗi</b>', message);
            }
            return throwError(() => err);
          }
        })
      );
  }

  protected postFile(
    endpoint: string,
    body?: any,
    params?: any,
    options?: {
      notification?: boolean;
      defaultFileName?: string;
      accept?: string;
      headers?: Record<string, string>;
    }
  ) {
    const url = this.joinUrl(this.apiUrl, endpoint);
    const notify = options?.notification ?? false;

    const headers = new HttpHeaders({
      ...(options?.accept ? { Accept: options.accept } : {}),
      ...(options?.headers ?? {})
    });

    return this.http
      .post(url, body, {
        params,
        headers,
        observe: 'response',
        responseType: 'blob'
      })
      .pipe(
        map((res: HttpResponse<Blob>) => {
          const blob = res.body ?? new Blob();
          const contentType = res.headers.get('content-type') ?? undefined;

          let filename = res.headers.get('Filename');
          console.log('Filename from header:', filename);

          if (!filename) {
            const disposition =
              res.headers.get('content-disposition') ??
              res.headers.get('Content-Disposition') ??
              '';
          }

          if (!filename) {
            filename =
              options?.defaultFileName ||
              `export-${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
          }

          return { blob, filename, contentType };
        }),
        catchError((err: HttpErrorResponse) => {
          if (err.error instanceof Blob && err.error.type === 'application/json') {
            return this.parseBlobError(err).pipe(
              switchMap((errorResponse: ApiResponse<any>) => {
                const message = errorResponse?.message ?? 'Xuất file thất bại';
                if (notify) {
                  this.notification.error('<b>Lỗi</b>', message);
                }
                return throwError(() => ({
                  ...err,
                  error: errorResponse,
                  message: message
                }));
              })
            );
          } else {
            const message = err?.error?.message ?? err?.message ?? 'Xuất file thất bại';
            if (notify) {
              this.notification.error('<b>Lỗi</b>', message);
            }
            return throwError(() => err);
          }
        })
      );
  }

  private parseBlobError(err: HttpErrorResponse): Observable<any> {
    return new Observable((observer) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        try {
          const errorResponse = JSON.parse(reader.result as string);
          observer.next(errorResponse);
          observer.complete();
        } catch (e) {
          observer.next({
            message: 'Xuất file thất bại',
            success: false,
            errorCode: err.status?.toString() ?? '500'
          });
          observer.complete();
        }
      };

      reader.onerror = () => {
        observer.next({
          message: 'Không thể đọc thông tin lỗi',
          success: false,
          errorCode: err.status?.toString() ?? '500'
        });
        observer.complete();
      };

      reader.readAsText(err.error);
    });
  }

}
