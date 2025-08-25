import { Router } from 'express';
import * as c from '../controllers/cinema.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { Permission } from '../utils/auth/roles';
import {
  validateCinemaCreation,
  validatePagination,
} from '../middlewares/validation';

const r = Router();

// Public routes
r.get('/', optionalAuth, validatePagination, c.listCinemas);

r.get('/cities', optionalAuth, c.getCitiesList);

r.get('/:id', optionalAuth, c.getCinema);

// Protected routes - Admin/Manager only
r.post(
  '/',
  requireAuth,
  authorize(Permission.MANAGE_CINEMAS),
  validateCinemaCreation,
  c.createCinema,
);

r.put(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_CINEMAS),
  c.updateCinema,
);

r.patch(
  '/:id/toggle-status',
  requireAuth,
  authorize(Permission.MANAGE_CINEMAS),
  c.toggleCinemaStatus,
);

r.delete(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_CINEMAS),
  c.deleteCinema,
);

export default r;
