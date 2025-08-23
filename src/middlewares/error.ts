import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors/base';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.fail(err.message, err.statusCode);
  }

  if (err instanceof Error) {
    if (
      err.message.includes('duplicate key') ||
      err.message.includes('unique constraint')
    ) {
      return res.fail('Resource already exists', 409);
    }

    if (err.message.includes('foreign key constraint')) {
      return res.fail('Invalid reference to related resource', 400);
    }

    const isDev = process.env.NODE_ENV === 'development';
    return res.fail(
      isDev ? err.message : 'Internal Server Error',
      500,
      isDev ? err : undefined,
    );
  }

  return res.fail('Something went wrong', 500);
}
