import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RolePermissions, Role } from '../utils/auth/roles';
import type { JwtUser } from '../utils/auth/types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;

  if (!auth?.startsWith('Bearer ')) {
    return res.fail('Authorization header required', 401);
  }

  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as JwtUser;

    // Ensure user has permissions based on their role
    payload.permissions =
      payload.permissions ?? RolePermissions[payload.role as Role] ?? [];

    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.fail('Token has expired', 401);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.fail('Invalid token', 401);
    }
    return res.fail('Authentication failed', 401);
  }
}

// Optional auth - doesn't fail if no token provided
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;

  if (!auth?.startsWith('Bearer ')) {
    return next(); // No token provided, continue without user
  }

  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as JwtUser;
    payload.permissions =
      payload.permissions ?? RolePermissions[payload.role as Role] ?? [];
    req.user = payload;
  } catch {
    // Invalid token, but we don't fail - just continue without user
    req.user = undefined;
  }

  next();
}
