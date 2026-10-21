export interface ApiResponse<T> {
  datetime: string;
  errorCode: string;
  message: string;
  data: T;
  success: boolean;
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

export interface ApiResponseList<T, S = unknown> {
  datetime: string;
  errorCode: string;
  message: string;
  data: ApiResponseListContent<T, S>;
  success: boolean;
}

export interface ApiResponseListAll<T> {
  datetime: string;
  errorCode: string;
  message: string;
  data: T[];
  success: boolean;
}
