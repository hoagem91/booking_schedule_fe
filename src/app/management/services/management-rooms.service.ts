import { Injectable } from '@angular/core';
import { BaseService } from '../../services/base/base.service';
import { ApiConstants } from '../../constants/api-constants';
import { ApiResponse } from '../../models/api-response.model';
import { RoomAvailabilityRequest, RoomDeleteResponse, RoomRequest, RoomResponse, RoomSearchRequest, RoomSpecialtyOption, RoomStatus, RoomUpdateRequest } from '../models/room.model';

@Injectable({ providedIn: 'root' })
export class ManagementRoomsService extends BaseService {
  private readonly endpoint = ApiConstants.ROOM_ADMIN_COMMON;
  search(params: { page: number; size: number; sort?: string }, body: RoomSearchRequest) {
    return this.postList<RoomResponse>(ApiConstants.ROOM_ADMIN_SEARCH, body, params, false);
  }
  availability(params: { page: number; size: number; sort?: string }, body: RoomAvailabilityRequest) {
    return this.postList<RoomResponse>(ApiConstants.ROOM_ADMIN_AVAILABILITY, body, params, false);
  }
  detail(id: number) { return this.get<RoomResponse>(`${this.endpoint}/${id}`); }
  create(body: RoomRequest) { return this.post<RoomResponse>(this.endpoint, body, undefined, false); }
  replace(id: number, body: RoomRequest) { return this.put<RoomResponse>(`${this.endpoint}/${id}`, body, false); }
  update(id: number, body: RoomUpdateRequest) {
    return this.http.patch<ApiResponse<RoomResponse>>(this.joinUrl(this.apiUrl, `${this.endpoint}/${id}`), body).pipe(this.handleResponse(false));
  }
  status(id: number, status: RoomStatus) {
    return this.http.patch<ApiResponse<RoomResponse>>(this.joinUrl(this.apiUrl, `${this.endpoint}/${id}/status`), { status }).pipe(this.handleResponse(false));
  }
  delete(id: number) { return this.deleteItem<RoomDeleteResponse>(`${this.endpoint}/${id}`, false); }
  specialties(activeOnly = false) {
    return this.get<RoomSpecialtyOption[]>(ApiConstants.SPECIALTY_ADMIN_COMMON, activeOnly ? { status: 'ACTIVE' } : undefined);
  }
}
