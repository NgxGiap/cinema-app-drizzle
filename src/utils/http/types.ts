export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type Header = {
  success: boolean;
  code: number;
  message: string;
  timestamp: string;
  requestId?: string;
  pagination?: Pagination;
};

export type ApiResponse<T> = { header: Header; data: T | null };
