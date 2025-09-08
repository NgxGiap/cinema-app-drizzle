import { Router } from 'express';
import * as c from '../controllers/cinema.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { Permission } from '../utils/auth/roles';
import {
  validatePagination,
  validateCinemaListQuery,
  validateCinemaCreate,
  validateCinemaUpdate,
  handleValidationErrors,
} from '../middlewares/validation';

const r = Router();

/** Public */
r.get(
  '/',
  optionalAuth,
  validatePagination,
  validateCinemaListQuery,
  handleValidationErrors,
  c.listCinemas,
);
r.get('/cities', optionalAuth, c.getCitiesList);
r.get('/:id', optionalAuth, handleValidationErrors, c.getCinema);

/** Admin */
r.post(
  '/',
  requireAuth,
  authorize(Permission.MANAGE_CINEMAS),
  validateCinemaCreate,
  handleValidationErrors,
  c.createCinema,
);

r.put(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_CINEMAS),
  validateCinemaUpdate,
  handleValidationErrors,
  c.updateCinema,
);

r.patch(
  '/:id/toggle-status',
  requireAuth,
  authorize(Permission.MANAGE_CINEMAS),
  handleValidationErrors,
  c.toggleCinemaStatus,
);

r.delete(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_CINEMAS),
  handleValidationErrors,
  c.deleteCinema,
);

export default r;
