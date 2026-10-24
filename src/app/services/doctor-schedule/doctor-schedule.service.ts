import { Injectable } from '@angular/core';
import { BaseService } from '../base/base.service';
import { ParamSearch } from '../../models/search.model';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../models/api-response.model';
import { ApiConstants } from '../../constants/api-constants';

@Injectable({
  providedIn: 'root'
})
export class DoctorScheduleService extends BaseService {
  public search(params: ParamSearch, body:any):Observable<ApiResponse<any>> {
    const endpoint = ApiConstants.DOCTOR_SCHEDULE_ADMIN_SEARCH;
    return this.post<any>(endpoint);
  }
  public create(body:any):Observable<ApiResponse<any>> {
    const endpoint = ApiConstants.DOCTOR_SCHEDULE_ADMIN_DETAIL;
    return this.post<ApiResponse<any>>(endpoint);

  }
}
