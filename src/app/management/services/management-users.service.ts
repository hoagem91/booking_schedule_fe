import { Injectable } from '@angular/core';
import { BaseService } from '../../services/base/base.service';
import { ApiConstants } from '../../constants/api-constants';
import { ApiResponse, ApiResponseList } from '../../models/api-response.model';
import { AdminRole, AdminUser, AdminUserCreateRequest, AdminUserSearchRequest, AdminUserUpdateRequest, UserAuditResponse, UserDeactivateResponse, UserRole, UserStatus } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class ManagementUsersService extends BaseService {
  private readonly endpoint = ApiConstants.USER_ADMIN_COMMON;
  search(params: { page: number; size: number; sort?: string }, body: AdminUserSearchRequest) {
    return this.postList<AdminUser>(ApiConstants.USER_ADMIN_SEARCH, body, params, false);
  }
  detail(id: number) { return this.get<AdminUser>(`${this.endpoint}/${id}`); }
  roles() { return this.get<AdminRole[]>(ApiConstants.ROLE_ADMIN_COMMON); }
  create(body: AdminUserCreateRequest) { return this.post<AdminUser>(this.endpoint, body, undefined, false); }
  update(id: number, body: AdminUserUpdateRequest) { return this.put<AdminUser>(`${this.endpoint}/${id}`, body, false); }
  status(id: number, status: UserStatus) {
    return this.http.patch<ApiResponse<AdminUser>>(this.joinUrl(this.apiUrl, `${this.endpoint}/${id}/status`), { status }).pipe(this.handleResponse(false));
  }
  changeRoles(id: number, roles: UserRole[]) {
    return this.http.patch<ApiResponse<AdminUser>>(this.joinUrl(this.apiUrl, `${this.endpoint}/${id}/roles`), { roles }).pipe(this.handleResponse(false));
  }
  resetPassword(id: number, newPassword: string) { return this.put<AdminUser>(`${this.endpoint}/${id}/password`, { newPassword }, false); }
  changeMyPassword(currentPassword: string, newPassword: string) { return this.put<AdminUser>('/users/me/password', { currentPassword, newPassword }, false); }
  deactivate(id: number) { return this.deleteItem<UserDeactivateResponse>(`${this.endpoint}/${id}`, false); }
  audit(id: number, params: { page: number; size: number }) {
    return this.get<NonNullable<ApiResponseList<UserAuditResponse>['result']>>(
      `${this.endpoint}/${id}/audit-logs`, { ...params, sort: 'id,desc' });
  }
}
