import 'express-serve-static-core';
import type { JwtUser } from '../utils/auth/types';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtUser;
    requestId?: string;
  }
  interface Response {
    ok: <T>(data: T, message?: string, code?: number) => this;
    fail: <E = null>(message: string, code?: number, details?: E) => this;
  }
}
