import { BaseModelResponse } from '../../models/base.model';

export interface SpecialtyResponseItem extends BaseModelResponse{
  code: string;
  name: string;
  description: string;
  status: string;
}
export interface SpecialtyCreateRequest {
  code?: string;
  name: string;
  description?: string;
}
export interface SpecialtyUpdateRequest {
  code?: string;
  name?: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}
