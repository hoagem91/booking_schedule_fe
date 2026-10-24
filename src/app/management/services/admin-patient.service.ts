import { Injectable } from '@angular/core';
import { BaseService } from '../../services/base/base.service';
import { Observable } from 'rxjs';
import { ApiConstants } from '../../constants/api-constants';
import { ApiResponse } from '../../models/api-response.model';
import { PatientProfile } from '../../models/patient.model';

@Injectable({
  providedIn: 'root',
})
export class AdminPatientService extends BaseService{
  public getAllPatients():Observable<ApiResponse<PatientProfile[]>> {
    const endpoint = ApiConstants.PATIENT_ADMIN_GET;
    return this.get<PatientProfile[]>(endpoint, undefined, false);
  }
}
