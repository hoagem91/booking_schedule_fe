import { Injectable } from '@angular/core';
import { BaseService } from '../../services/base/base.service';
import { ApiConstants } from '../../constants/api-constants';
import { ApiResponse, ApiResponseList } from '../../models/api-response.model';
import { ParamSearch } from '../../models/search.model';
import { AdminDoctor, AdminDoctorCreateRequest, AdminDoctorSearchRequest, AdminDoctorUpdateRequest, DoctorAuditResponse, DoctorDeactivateResponse, DoctorSpecialtyOption } from '../models/admin-doctor.model';
import { UserStatus } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AdminDoctorService extends BaseService {
  private readonly endpoint = ApiConstants.API_ADMIN_DOCTORS;
  search(params: ParamSearch, body: AdminDoctorSearchRequest) { return this.postList<AdminDoctor>(`${this.endpoint}/search`, body, params, false); }
  detail(doctorId: number) { return this.get<AdminDoctor>(`${this.endpoint}/${doctorId}`); }
  create(body: AdminDoctorCreateRequest) { return this.post<AdminDoctor>(this.endpoint, body, undefined, false); }
  update(doctorId: number, body: AdminDoctorUpdateRequest) { return this.put<AdminDoctor>(`${this.endpoint}/${doctorId}`, body, false); }
  changeStatus(doctorId: number, status: UserStatus) {
    return this.http.patch<ApiResponse<AdminDoctor>>(
      this.joinUrl(this.apiUrl, `${this.endpoint}/${doctorId}/status`), { status }).pipe(this.handleResponse(false));
  }
  deactivate(doctorId: number) { return this.deleteItem<DoctorDeactivateResponse>(`${this.endpoint}/${doctorId}`, false); }
  audit(doctorId: number, params: ParamSearch) {
    return this.get<NonNullable<ApiResponseList<DoctorAuditResponse>['result']>>(`${this.endpoint}/${doctorId}/audit-logs`, { ...params, sort: 'id,desc' });
  }
  specialties(activeOnly = false) {
    return this.get<DoctorSpecialtyOption[]>(ApiConstants.SPECIALTY_ADMIN_COMMON, activeOnly ? { status: 'ACTIVE' } : undefined);
  }
}
