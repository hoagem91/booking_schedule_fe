import { Injectable } from '@angular/core';
import { BaseService } from '../../services/base/base.service';
import { ApiConstants } from '../../constants/api-constants';
import { ApiResponse } from '../../models/api-response.model';
import {
  ServiceCreateRequest,
  ServiceUpdateRequest,
  ServiceResponse,
  ServiceDeleteResponse,
  ServiceSearchRequest,
  ServiceStatus,
  ServiceSpecialtyOption
} from '../models/service.model';

@Injectable({ providedIn: 'root' })
export class ManagementServicesService extends BaseService {
  private readonly endpoint = ApiConstants.SERVICE_ADMIN_COMMON;

  search(params: { page: number; size: number; sort?: string }, body: ServiceSearchRequest) {
    return this.postList<ServiceResponse>(ApiConstants.SERVICE_ADMIN_SEARCH, body, params, false);
  }

  detail(id: number) {
    return this.get<ServiceResponse>(`${this.endpoint}/${id}`);
  }

  create(body: ServiceCreateRequest) {
    return this.post<ServiceResponse>(this.endpoint, body, undefined, false);
  }

  update(id: number, body: ServiceUpdateRequest) {
    return this.put<ServiceResponse>(`${this.endpoint}/${id}`, body, false);
  }

  status(id: number, status: ServiceStatus) {
    return this.http.patch<ApiResponse<ServiceResponse>>(
      this.joinUrl(this.apiUrl, `${this.endpoint}/${id}/status`), { status }).pipe(this.handleResponse(false));
  }

  delete(id: number) {
    return this.deleteItem<ServiceDeleteResponse>(`${this.endpoint}/${id}`, false);
  }

  specialties(activeOnly = false) {
    return this.get<ServiceSpecialtyOption[]>(ApiConstants.SPECIALTY_ADMIN_COMMON, activeOnly ? { status: 'ACTIVE' } : undefined);
  }
}
