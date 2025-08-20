import { Request, Response, NextFunction } from 'express';

type HttpErrorLike = { status?: number; message?: string };

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const e: HttpErrorLike =
    typeof err === 'object' && err !== null ? (err as HttpErrorLike) : {};
  const code = e.status ?? 500;
  const msg = e.message ?? 'Internal Server Error';
  return res.fail(
    msg,
    code,
    process.env.NODE_ENV === 'development' ? err : undefined,
  );
}
