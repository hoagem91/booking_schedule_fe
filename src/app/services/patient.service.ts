import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, finalize, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiConstants } from '../constants/api-constants';
import { BookingApiResponse } from '../models/auth.model';
import { apiResponseSucceeded } from '../models/api-response.model';
import { PatientProfile, PatientUpdateRequest } from '../models/patient.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly cached = signal<{ generation: number; profile: PatientProfile } | null>(null);
  private pending: { generation: number; request: Observable<PatientProfile> } | null = null;
  readonly currentProfile = computed(() => {
    const cached = this.cached();
    return cached?.generation === this.auth.sessionGeneration() ? cached.profile : null;
  });
  private readonly url = `${environment.api.baseUrl}${ApiConstants.API_PATIENT_ME}`;

  getMe(): Observable<PatientProfile> {
    const generation = this.auth.sessionGeneration();
    return this.read(this.http.get<BookingApiResponse<PatientProfile>>(this.url)).pipe(tap(profile => this.remember(profile, generation)));
  }

  ensureMe(): Observable<PatientProfile> {
    const current = this.currentProfile();
    if (current) return of(current);
    const generation = this.auth.sessionGeneration();
    if (this.pending?.generation === generation) return this.pending.request;
    const request = this.getMe().pipe(
      finalize(() => { if (this.pending?.request === request) this.pending = null; }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.pending = { generation, request };
    return request;
  }

  updateMe(request: PatientUpdateRequest): Observable<PatientProfile> {
    const generation = this.auth.sessionGeneration();
    return this.read(this.http.put<BookingApiResponse<PatientProfile>>(this.url, request)).pipe(tap(profile => this.remember(profile, generation)));
  }

  private remember(profile: PatientProfile, generation: number): void {
    if (generation === this.auth.sessionGeneration()) this.cached.set({ generation, profile });
  }

  private read(response: Observable<BookingApiResponse<PatientProfile>>): Observable<PatientProfile> {
    return response.pipe(
      map(value => {
        if (!apiResponseSucceeded(value)) throw new Error(this.message(value.code));
        if (!value.result || typeof value.result.id !== 'number' || !value.result.patientCode) {
          throw new Error('Dữ liệu hồ sơ chưa hợp lệ. Vui lòng thử lại.');
        }
        return value.result;
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          const message = error.status === 0 ? 'Không thể kết nối máy chủ. Vui lòng thử lại.'
            : error.status >= 500 ? 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
            : this.message(error.error?.code);
          return throwError(() => new Error(message));
        }
        return throwError(() => error instanceof Error ? error : new Error(this.message()));
      }),
    );
  }

  private message(code?: number): string {
    if (code === 2003) return 'Tài khoản của bạn chưa có hồ sơ bệnh nhân. Vui lòng liên hệ tổng đài hỗ trợ.';
    if (code === 1007 || code === 2002) return 'Bạn chưa có quyền truy cập hồ sơ bệnh nhân.';
    if (code === 1006) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    return 'Không thể xử lý hồ sơ. Vui lòng kiểm tra thông tin và thử lại.';
  }
}
