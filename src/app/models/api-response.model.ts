export const API_SUCCESS_CODE = 1000;

export interface ApiResponse<T> {
  code: number;
  message?: string;
  result?: T | null;
  datetime?: string;
  success?: boolean;
}

export function apiResponseSucceeded(response: { code?: number; success?: boolean } | null | undefined): boolean {
  return response?.code === API_SUCCESS_CODE && response.success !== false;
}

interface ApiResponseListContent<T, S = unknown> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      sorted: boolean;
      empty: boolean;
      unsorted: boolean;
    };
    findAll: boolean;
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  size: number;
  number: number;
  sort: {
    sorted: boolean;
    empty: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  first: boolean;
  empty: boolean;
  summary?: S;
  summaryData?: S;
}

export interface ApiResponseList<T, S = unknown> extends ApiResponse<ApiResponseListContent<T, S>> {}

export interface ApiResponseListAll<T> extends ApiResponse<T[]> {}
