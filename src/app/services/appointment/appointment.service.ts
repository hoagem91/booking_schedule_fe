import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiConstants } from '../../constants/api-constants';
import { ApiResponse } from '../../models/api-response.model';
import { AppointmentHistoryItem, AppointmentHistoryPage } from '../../models/appointment.model';
import { AppointmentReview, AppointmentReviewRequest, BookingSchedule, BookingService, BookingSpecialty,
  BookingTimeSlot, CreateAppointmentRequest } from '../../models/booking.model';
import { ParamSearch } from '../../models/search.model';
import { BaseService } from '../base/base.service';

@Injectable({ providedIn: 'root' })
export class AppointmentService extends BaseService {
  getSpecialties(): Observable<ApiResponse<BookingSpecialty[]>> {
    return this.get<BookingSpecialty[]>(ApiConstants.API_PUBLIC_SPECIALTIES);
  }

  getServices(specialtyId: number): Observable<ApiResponse<BookingService[]>> {
    return this.get<BookingService[]>(ApiConstants.API_PUBLIC_SERVICES, { specialtyId });
  }

  getSchedules(specialtyId: number, date: string): Observable<ApiResponse<BookingSchedule[]>> {
    return this.post<BookingSchedule[]>(ApiConstants.API_PUBLIC_SCHEDULES, {
      specialtyId, fromDate: date, toDate: date
    }, undefined, false);
  }

  getTimeSlots(scheduleId: number): Observable<ApiResponse<BookingTimeSlot[]>> {
    return this.get<BookingTimeSlot[]>(ApiConstants.API_PUBLIC_TIME_SLOTS, { scheduleId });
  }

  createAppointment(body: CreateAppointmentRequest): Observable<ApiResponse<AppointmentHistoryItem>> {
    return this.post<AppointmentHistoryItem>(ApiConstants.API_PATIENT_APPOINTMENTS, body, undefined, false);
  }

  getMyAppointment(id: number): Observable<ApiResponse<AppointmentHistoryItem>> {
    return this.get<AppointmentHistoryItem>(`${ApiConstants.API_PATIENT_APPOINTMENTS}/${id}`);
  }

  cancelMyAppointment(id: number, note: string): Observable<ApiResponse<AppointmentHistoryItem>> {
    // BaseService has no PATCH wrapper; reuse its HTTP client, URL builder and response handler.
    const url = this.joinUrl(this.apiUrl, ApiConstants.API_PATIENT_APPOINTMENTS, String(id), 'cancel');
    return this.http.patch<ApiResponse<AppointmentHistoryItem>>(url, { note }).pipe(this.handleResponse(false));
  }

  reviewMyAppointment(id: number, body: AppointmentReviewRequest): Observable<ApiResponse<AppointmentReview>> {
    return this.post<AppointmentReview>(`${ApiConstants.API_PATIENT_APPOINTMENTS}/${id}/review`, body, undefined, false);
  }

  getMyHistory(params: ParamSearch): Observable<ApiResponse<AppointmentHistoryPage>> {
    const endpoint = ApiConstants.API_APPOINTMENT_MY_HISTORY;
    return this.get<AppointmentHistoryPage>(endpoint, params);
  }
}
