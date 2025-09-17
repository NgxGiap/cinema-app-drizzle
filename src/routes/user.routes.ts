import { Router } from 'express';
import * as c from '../controllers/user.controller';
import { requireAuth } from '../middlewares/auth';
import { authorize, authorizeAny } from '../middlewares/authorize';
import { Permission } from '../utils/auth/roles';
import {
  handleValidationErrors,
  validatePagination,
  validateIdParam,
  validateUserListQuery,
  validateUserCreate,
  validateUserUpdate,
} from '../middlewares/validation';

const r = Router();

r.get(
  '/',
  requireAuth,
  authorize(Permission.VIEW_USERS),
  validatePagination,
  validateUserListQuery,
  handleValidationErrors,
  c.listUsers,
);

r.get(
  '/:id',
  requireAuth,
  authorize(Permission.VIEW_USERS),
  validateIdParam,
  handleValidationErrors,
  c.getUserById,
);

r.post(
  '/',
  requireAuth,
  authorize(Permission.MANAGE_USERS),
  validateUserCreate,
  handleValidationErrors,
  c.createUser,
);

r.put(
  '/:id',
  requireAuth,
  authorizeAny(
    Permission.MANAGE_USERS,
    (req) => req.user?.id === req.params.id,
  ),
  validateIdParam,
  validateUserUpdate,
  handleValidationErrors,
  c.updateUser,
);

r.delete(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_USERS),
  validateIdParam,
  handleValidationErrors,
  c.deleteUser,
);

export default r;
