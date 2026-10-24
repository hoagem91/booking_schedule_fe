import { Injectable } from '@angular/core';
import { BaseService } from '../../services/base/base.service';
import { ParamSearch } from '../../models/search.model';
import { ApiResponse, ApiResponseList } from '../../models/api-response.model';
import { Observable } from 'rxjs';
import { DoctorScheduleCreateRequest, DoctorScheduleUpdateRequest, DoctorScheduleResponse, ScheduleDoctorOption, ScheduleRoomOption } from '../models/doctor-schedule.models';
import { ApiConstants } from '../../constants/api-constants';

@Injectable({
  providedIn: 'root',
})
export class DoctorScheduleAdminService extends BaseService{
  public update(id: number, body: DoctorScheduleUpdateRequest): Observable<ApiResponse<DoctorScheduleResponse>> {
    return this.put<DoctorScheduleResponse>(`${ApiConstants.DOCTOR_SCHEDULE_ADMIN_DETAIL}/${id}`, body, false);
  }
  public create(body: DoctorScheduleCreateRequest): Observable<ApiResponse<DoctorScheduleResponse>> {
    return this.post<DoctorScheduleResponse>(ApiConstants.DOCTOR_SCHEDULE_ADMIN_DETAIL, body, undefined, false);
  }
  public getActiveDoctors(): Observable<ApiResponse<ScheduleDoctorOption[]>> {
    return this.get<ScheduleDoctorOption[]>(ApiConstants.API_ADMIN_DOCTORS, { status: 'ACTIVE' }, false);
  }
  public getAvailableRooms(): Observable<ApiResponse<ScheduleRoomOption[]>> {
    return this.get<ScheduleRoomOption[]>(ApiConstants.API_PUBLIC_ROOMS, undefined, false);
  }
  public search(params: ParamSearch, body:any): Observable<ApiResponseList<DoctorScheduleResponse>> {
    const endpoint = ApiConstants.DOCTOR_SCHEDULE_ADMIN_SEARCH;
    return this.postList(endpoint,body, params);
  }
  public getDoctorScheduleDetail(id: number): Observable<ApiResponse<DoctorScheduleResponse>> {
    const endpoint = `${ApiConstants.DOCTOR_SCHEDULE_ADMIN_DETAIL}/${id}`;
    return this.get(endpoint);
  }
  public delete(id: number): Observable<ApiResponse<any>> {
    const endpoint = `${ApiConstants.DOCTOR_SCHEDULE_ADMIN_DETAIL}/${id}`;
    return this.deleteItem(endpoint);
  }
}
