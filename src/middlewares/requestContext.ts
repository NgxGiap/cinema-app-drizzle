import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function requestContext(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  req.requestId = randomUUID();
  next();
}
