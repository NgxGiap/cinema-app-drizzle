import { Pagination } from './types';

export function makePagination(
  page: number,
  pageSize: number,
  total: number,
): Pagination {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
