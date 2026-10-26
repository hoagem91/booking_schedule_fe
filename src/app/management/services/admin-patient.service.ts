import { Injectable } from '@angular/core';
import { BaseService } from '../../services/base/base.service';
import { Observable } from 'rxjs';
import { ApiConstants } from '../../constants/api-constants';
import { ApiResponse, ApiResponseList } from '../../models/api-response.model';
import { PatientProfile } from '../../models/patient.model';
import { ParamSearch } from '../../models/search.model';
import { AdminPatient, AdminPatientCreateRequest, AdminPatientSearchRequest, AdminPatientUpdateRequest, PatientAuditResponse } from '../models/admin-patient.model';

@Injectable({
  providedIn: 'root',
})
export class AdminPatientService extends BaseService{
  // Legacy lookup remains for existing appointment forms; canonical APIs below use patientId.
  public getAllPatients():Observable<ApiResponse<PatientProfile[]>> {
    const endpoint = ApiConstants.PATIENT_ADMIN_GET;
    return this.get<PatientProfile[]>(endpoint, undefined, false);
  }
  search(params: ParamSearch, body: AdminPatientSearchRequest) {
    return this.postList<AdminPatient>(ApiConstants.PATIENT_ADMIN_SEARCH, body, params, false);
  }
  detail(patientId: number) { return this.get<AdminPatient>(`${ApiConstants.PATIENT_ADMIN_COMMON}/${patientId}`); }
  create(body: AdminPatientCreateRequest) { return this.post<AdminPatient>(ApiConstants.PATIENT_ADMIN_COMMON, body, undefined, false); }
  update(patientId: number, body: AdminPatientUpdateRequest) {
    return this.put<AdminPatient>(`${ApiConstants.PATIENT_ADMIN_COMMON}/${patientId}`, body, false);
  }
  audit(patientId: number, params: ParamSearch) {
    return this.get<NonNullable<ApiResponseList<PatientAuditResponse>['result']>>(
      `${ApiConstants.PATIENT_ADMIN_COMMON}/${patientId}/audit-logs`, { ...params, sort: 'id,desc' });
  }
}
