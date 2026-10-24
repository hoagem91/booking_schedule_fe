import { Injectable } from '@angular/core';
import { BaseService } from '../../services/base/base.service';
import { ParamSearch } from '../../models/search.model';
import { ApiResponse, ApiResponseList } from '../../models/api-response.model';
import { Observable } from 'rxjs';
import { ApiConstants } from '../../constants/api-constants';
import { SpecialtyCreateRequest, SpecialtyUpdateRequest, SpecialtyResponseItem } from '../models/specialty.model';

@Injectable({
  providedIn: 'root'
})
export class ManagementSpecialtiesService extends BaseService{
  public search(params: ParamSearch, body:any):Observable<ApiResponseList<SpecialtyResponseItem>> {
    const endpoint = ApiConstants.SPECIALTY_ADMIN_SEARCH;
    return this.postList<SpecialtyResponseItem>(endpoint,body,params,false);
  }

  public create(body:SpecialtyCreateRequest):Observable<ApiResponse<SpecialtyResponseItem>> {
    const endpoint = ApiConstants.SPECIALTY_ADMIN_COMMON;
    return this.post<SpecialtyResponseItem>(endpoint,body,undefined,false);
  }
  public update(id: number, body: SpecialtyUpdateRequest): Observable<ApiResponse<SpecialtyResponseItem>> {
    return this.put<SpecialtyResponseItem>(`${ApiConstants.SPECIALTY_ADMIN_COMMON}/${id}`, body, false);
  }

  public getSpecialtyDetail(id:number):Observable<ApiResponse<SpecialtyResponseItem>> {
    const endpoint = `${ApiConstants.SPECIALTY_ADMIN_COMMON}/${id}`;
    return this.get(endpoint);
  }

  public delete(id:number):Observable<ApiResponse<SpecialtyResponseItem>> {
    const endpoint = `${ApiConstants.SPECIALTY_ADMIN_COMMON}/${id}`;
    return this.deleteItem(endpoint);
  }
}
