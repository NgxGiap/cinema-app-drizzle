import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from './types';
import { buildHeader } from './header';

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
