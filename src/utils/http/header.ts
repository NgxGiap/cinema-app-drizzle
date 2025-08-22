import { Request } from 'express';
import { Header } from './types';

export function buildHeader(
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
  return h;
}
