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
import { AppointmentAction } from '../appointment-workflow/appointment-actions.policy';
import { AdminAppointmentCreateRequest, AppointmentDoctorOption } from '../models/appointment-create.models';
import { BookingSchedule, BookingService, BookingTimeSlot } from '../../models/booking.model';
import { AppointmentSummaryRequest, AppointmentSummaryResult } from '../models/appointment-review.models';


@Injectable({ providedIn: 'root' })
export class ManagementAppointmentsService extends BaseService{
  getDoctors(): Observable<ApiResponse<AppointmentDoctorOption[]>> {
    return this.get<AppointmentDoctorOption[]>(ApiConstants.API_ADMIN_DOCTORS, { status: 'ACTIVE' }, false);
  }
  getServices(): Observable<ApiResponse<BookingService[]>> {
    return this.get<BookingService[]>(ApiConstants.API_PUBLIC_SERVICES, undefined, false);
  }
  getSchedules(doctorId: number, date: string): Observable<ApiResponse<BookingSchedule[]>> {
    return this.post<BookingSchedule[]>(ApiConstants.API_PUBLIC_SCHEDULES,
      { doctorId, fromDate: date, toDate: date }, undefined, false);
  }
  getSlots(scheduleId: number): Observable<ApiResponse<BookingTimeSlot[]>> {
    return this.get<BookingTimeSlot[]>(ApiConstants.API_PUBLIC_TIME_SLOTS, { scheduleId }, false);
  }
  search(params:ParamSearch,body: any): Observable<ApiResponse<AppointmentHistoryPage>> {
    const endpoint = ApiConstants.API_APPOINTMENT_ADMIN_SEARCH;
    return this.post<AppointmentHistoryPage>(endpoint,body,params,false);
  }

  getAppointmentDetail(id: number): Observable<ApiResponse<AppointmentHistoryItem>> {
    const endpoint = `${ApiConstants.API_APPOINTMENT_ADMIN_DETAIL}/${id}`;
    return this.get<AppointmentHistoryItem>(endpoint);
  }

  getSummary(body: AppointmentSummaryRequest): Observable<ApiResponse<AppointmentSummaryResult>> {
    return this.post<AppointmentSummaryResult>(ApiConstants.API_APPOINTMENT_ADMIN_SUMMARY, body, undefined, false);
  }

  create(body: AdminAppointmentCreateRequest): Observable<ApiResponse<AppointmentHistoryItem>> {
    const endpoint= ApiConstants.API_APPOINTMENT_ADMIN_DETAIL;
    return this.post<AppointmentHistoryItem>(endpoint,body,undefined,false);
  }

  transition(id: number, action: AppointmentAction, note?: string): Observable<ApiResponse<AppointmentHistoryItem>> {
    const url = this.joinUrl(this.apiUrl, ApiConstants.API_APPOINTMENT_ADMIN_DETAIL, String(id), action);
    return this.http.patch<ApiResponse<AppointmentHistoryItem>>(url, note ? { note } : {})
      .pipe(this.handleResponse(false));
  }
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
