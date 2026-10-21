export interface BaseModelResponse {
  id: number;
  createdAt: string;
  createdBy: number;
  updatedAt: string;
  updatedBy: number;
}

export interface BaseModelResponseWithByInfo extends BaseModelResponse {
  createdByName: string | null;
  createdByAvatar: string | null;
  updatedByName: string | null;
  updatedByAvatar: string | null;
}
