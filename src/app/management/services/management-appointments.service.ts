import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { BookingApiResponse } from '../../models/auth.model';
import { AppointmentHistoryItem, AppointmentHistoryPage, AppointmentStatus } from '../../models/appointment.model';
import { environment } from '../../../environments/environment';
import { ParamSearch } from '../../models/search.model';
import { ApiResponse } from '../../models/api-response.model';
import { ApiConstants } from '../../constants/api-constants';
import { BaseService } from '../../services/base/base.service';


@Injectable({ providedIn: 'root' })
export class ManagementAppointmentsService extends BaseService{
  search(params:ParamSearch,body: any): Observable<ApiResponse<AppointmentHistoryPage>> {
    const endpoint = ApiConstants.API_APPOINTMENT_ADMIN_SEARCH;
    return this.post<AppointmentHistoryPage>(endpoint,body,params,false);
  }

  getAppointmentDetail(id: number): Observable<ApiResponse<AppointmentHistoryItem>> {
    const endpoint = `${ApiConstants.API_APPOINTMENT_ADMIN_DETAIL}/${id}`;
    return this.get<AppointmentHistoryItem>(endpoint);
  }

  create(body: any): Observable<ApiResponse<AppointmentHistoryItem>> {
    const endpoint= ApiConstants.API_APPOINTMENT_ADMIN_DETAIL;
    return this.post<any>(endpoint,body);
  }



  // get(id: number): Observable<AppointmentHistoryItem> {
  //   return this.http.get<BookingApiResponse<AppointmentHistoryItem>>(`${this.url}/${id}`).pipe(map(response => {
  //     if (response?.code !== 1000 || !response.result || response.result.id !== id) throw new Error('Không thể đọc thông tin lịch hẹn. Vui lòng thử lại.');
  //     return response.result;
  //   }));
  // }
}

export function clinicToday(): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type: string) => parts.find(value => value.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
