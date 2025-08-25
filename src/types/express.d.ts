import 'express-serve-static-core';
import type { JwtUser } from '../utils/auth/types';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtUser | undefined;
    requestId?: string | undefined;
  }
  interface Response {
    ok: <T>(data: T, message?: string, code?: number) => this;
    fail: <E = null>(message: string, code?: number, details?: E) => this;
  }
}
