import { Request, Response, NextFunction } from 'express';
import { Permission, Role, RolePermissions } from '../utils/auth/roles';

export const authorize =
  (...permissions: Permission[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.fail('Unauthorized', 401);

    // Get user permissions from their role
    const userPermissions =
      user.permissions || RolePermissions[user.role as Role] || [];

    // Check if user has any of the required permissions
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

// Check if user owns the resource (for user-specific operations)
export const requireOwnership = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = req.user;
  if (!user) return res.fail('Unauthorized', 401);

  const resourceUserId = req.params.userId || req.params.id;

  // Admins can access any resource
  if (user.role === Role.ADMIN) {
    return next();
  }

  // Users can only access their own resources
  if (user.id !== resourceUserId) {
    return res.fail('You can only access your own resources', 403);
  }

  next();
};

// Combine permissions check with ownership check
export const authorizeWithOwnership = (...permissions: Permission[]) => {
  return [authorize(...permissions), requireOwnership];
};
