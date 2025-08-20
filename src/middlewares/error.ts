import { Request, Response, NextFunction } from 'express';
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const code = err?.status || 500;
  const msg = err?.message || 'Internal Server Error';
  return res.fail(
    msg,
    code,
    process.env.NODE_ENV === 'development' ? err : undefined,
  );
}
