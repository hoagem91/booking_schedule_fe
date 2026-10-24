import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize, map, Observable, of, shareReplay, tap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { BookingApiResponse } from '../../models/auth.model';
import { apiResponseSucceeded } from '../../models/api-response.model';
import { environment } from '../../../environments/environment';
import { hasManagementPermission, internalRoles, ManagementPermission, ManagementUser, roleLabels } from '../models/management.models';

@Injectable({ providedIn: 'root' })
export class ManagementAccessService {
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly current = signal<{ generation: number; user: ManagementUser } | null>(null);
  private revision = 0;
  private request: { generation: number; revision: number; stream: Observable<ManagementUser> } | null = null;
  readonly user = computed(() => {
    const value = this.current();
    return value?.generation === this.auth.sessionGeneration() ? value.user : null;
  });
  readonly roleText = computed(() => internalRoles(this.user()).map(role => roleLabels[role]).join(' · '));
  can(permission: ManagementPermission): boolean { return hasManagementPermission(this.user(), permission); }

  load(force = false): Observable<ManagementUser> {
    const generation = this.auth.sessionGeneration();
    const revision = this.revision;
    if (!force && this.user()) return of(this.user()!);
    if (this.request?.generation === generation) return this.request.stream;
    const stream = this.http.get<BookingApiResponse<ManagementUser>>(`${environment.api.baseUrl}/users/me`).pipe(
      map(response => {
        const user = response?.result;
        if (!this.auth.isAuthenticated() || generation !== this.auth.sessionGeneration() || revision !== this.revision) throw new Error('Phiên đăng nhập đã thay đổi.');
        if (!apiResponseSucceeded(response) || !user || !Number.isSafeInteger(user.id)
          || user.id !== this.auth.getUserId() || !Array.isArray(user.roles)
          || user.roles.some(role => !role || typeof role.name !== 'string')) {
          throw new Error('Không thể xác minh thông tin tài khoản. Vui lòng thử lại.');
        }
        return user;
      }),
      tap(user => this.current.set({ generation, user })),
      finalize(() => { if (this.request?.generation === generation && this.request.revision === revision) this.request = null; }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.request = { generation, revision, stream };
    return stream;
  }

  reset(): void { this.revision++; this.current.set(null); this.request = null; }
}

export function managementError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 403) return 'Bạn không có quyền truy cập dữ liệu này.';
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (error.status === 0) return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.';
    if (error.status === 404) return 'Không tìm thấy dữ liệu được yêu cầu.';
    return 'Không thể tải dữ liệu. Vui lòng thử lại sau.';
  }
  return error instanceof Error ? error.message : 'Không thể tải dữ liệu. Vui lòng thử lại.';
}
