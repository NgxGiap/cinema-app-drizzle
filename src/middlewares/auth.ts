import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RolePermissions } from '../utils/auth/roles';
import type { JwtUser } from '../utils/auth/types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.fail('Unauthorized', 401);

  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as JwtUser;
    payload.permissions = payload.permissions ?? RolePermissions[payload.role];
    req.user = payload;
    next();
  } catch (e) {
    return res.fail('Invalid token', 401, e);
  }
}
