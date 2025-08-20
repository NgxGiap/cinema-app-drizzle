import { Request, Response, NextFunction } from 'express';

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type Header = {
  success: boolean;
  code: number;
  message: string;
  timestamp: string;
  requestId?: string;
  path?: string;
  pagination?: Pagination;
};

type ApiResponse<T> = { header: Header; data: T | null };

function buildHeader(
  req: Request,
  success: boolean,
  code: number,
  message: string,
): Header {
  const h: Header = {
    success,
    code,
    message,
    timestamp: new Date().toISOString(),
  };
  if (req.requestId) h.requestId = req.requestId;
  if (req.originalUrl) h.path = req.originalUrl;
  return h;
}

export function responseWrapper(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.ok = function <T>(data: T, message = 'OK', code = 200) {
    const body: ApiResponse<T> = {
      header: buildHeader(req, true, code, message),
      data,
    };
    return this.status(code).json(body);
  };

  res.fail = function <E = null>(message: string, code = 400, details?: E) {
    const data =
      process.env.NODE_ENV === 'development' && typeof details !== 'undefined'
        ? details
        : null;
    const body: ApiResponse<E> = {
      header: buildHeader(req, false, code, message),
      data,
    };
    return this.status(code).json(body);
  };

  next();
}

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
