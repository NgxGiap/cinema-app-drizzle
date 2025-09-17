import { Request, Response, NextFunction } from 'express';
import { Permission, Role, RolePermissions } from '../utils/auth/roles';

export const authorize =
  (...permissions: Permission[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.fail('Unauthorized', 401);

    const userPermissions =
      user.permissions || RolePermissions[user.role as Role] || [];

    const hasPermission = permissions.some((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      return res.fail('Insufficient permissions', 403);
    }

    next();
  };

export const allowRoles =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.fail('Unauthorized', 401);

    if (!roles.includes(user.role as Role)) {
      return res.fail('Access denied for your role', 403);
    }

    next();
  };

export const requireOwnership = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = req.user;
  if (!user) return res.fail('Unauthorized', 401);

  const resourceUserId = req.params.userId || req.params.id;

  if (user.role === Role.ADMIN) {
    return next();
  }

  if (user.id !== resourceUserId) {
    return res.fail('You can only access your own resources', 403);
  }

  next();
};

export const authorizeWithOwnership = (...permissions: Permission[]) => {
  return [authorize(...permissions), requireOwnership];
};

export const authorizeAny =
  (perm: Permission, isOwner: (req: Request) => boolean) =>
  (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.fail('Unauthorized', 401);
    const userPermissions =
      user.permissions || RolePermissions[user.role as Role] || [];
    if (userPermissions.includes(perm) || isOwner(req)) return next();
    return res.fail('Insufficient permissions', 403);
  };
