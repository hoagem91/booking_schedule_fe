import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, apiResponseSucceeded } from '../../models/api-response.model';
import { DashboardAnalytics, DashboardAppointmentPage, DashboardRange, DashboardRevenue, DashboardSummary } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.api.baseUrl}/api/admin/dashboard`;
  private unwrap<T>(source: Observable<ApiResponse<T>>): Observable<T> {
    return source.pipe(map(response => {
      if (!apiResponseSucceeded(response) || response.result == null) {
        throw new Error(response.message || 'Không thể tải dữ liệu dashboard.');
      }
      return response.result;
    }));
  }
  summary() { return this.unwrap(this.http.get<ApiResponse<DashboardSummary>>(`${this.url}/summary`)); }
  analytics(body: DashboardRange) {
    return this.unwrap(this.http.post<ApiResponse<DashboardAnalytics>>(`${this.url}/analytics`, body));
  }
  revenue(body: DashboardRange) {
    return this.unwrap(this.http.post<ApiResponse<DashboardRevenue>>(`${this.url}/revenue`, body));
  }
  appointments(page: number, upcomingOnly: boolean) {
    return this.unwrap(this.http.get<ApiResponse<DashboardAppointmentPage>>(`${this.url}/today-appointments`, {
      params: { page, size: 10, upcomingOnly }
    }));
  }
}
