import { Request, Response, NextFunction } from 'express';
import { Permission, Role } from '../utils/auth/roles';

export const authorize =
  (...perms: Permission[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.fail('Unauthorized', 401);
    const ok = (user.permissions || []).some((p) => perms.includes(p));
    return ok ? next() : res.fail('Forbidden', 403);
  };

export const allowRoles =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.fail('Unauthorized', 401);
    return roles.includes(user.role) ? next() : res.fail('Forbidden', 403);
  };
