import { Router } from 'express';
import * as c from '../controllers/user.controller';
import { requireAuth } from '../middlewares/auth';
import { authorize, requireOwnership } from '../middlewares/authorize';
import { Permission } from '../utils/auth/roles';
import {
  validateUserCreation,
  validatePagination,
} from '../middlewares/validation';

const r = Router();

// List users - Admin only
r.get(
  '/',
  requireAuth,
  authorize(Permission.MANAGE_USERS),
  validatePagination,
  c.listUsers,
);

// Get user by ID - Admin or own profile
r.get(
  '/:id',
  requireAuth,
  authorize(Permission.VIEW_USERS, Permission.MANAGE_USERS),
  requireOwnership,
  c.getUser,
);

// Create user - Admin only
r.post(
  '/',
  requireAuth,
  authorize(Permission.MANAGE_USERS),
  validateUserCreation,
  c.createUser,
);

// Update user - Admin or own profile
r.put(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_USERS),
  requireOwnership,
  c.updateUser,
);

// Delete user - Admin only
r.delete('/:id', requireAuth, authorize(Permission.MANAGE_USERS), c.deleteUser);

export default r;
