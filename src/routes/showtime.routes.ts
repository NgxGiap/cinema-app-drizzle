import { Router } from 'express';
import * as c from '../controllers/showtime.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { Permission } from '../utils/auth/roles';
import {
  validatePagination,
  validateShowtimeListQuery,
  validateShowtimeCreation,
  validateShowtimeUpdate,
  validateIdParam,
  handleValidationErrors,
} from '../middlewares/validation';

const r = Router();

/** Public */
r.get(
  '/',
  optionalAuth,
  validatePagination,
  validateShowtimeListQuery,
  handleValidationErrors,
  c.listShow_times,
);
r.get(
  '/upcoming',
  optionalAuth,
  handleValidationErrors,
  c.getUpcomingShow_times,
);

/** Admin */
r.post(
  '/',
  requireAuth,
  authorize(Permission.MANAGE_MOVIES, Permission.MANAGE_CINEMAS),
  validateShowtimeCreation,
  handleValidationErrors,
  c.createShowtime,
);

r.get(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_MOVIES, Permission.MANAGE_CINEMAS),
  validateIdParam,
  handleValidationErrors,
  c.getShowtime,
);

r.put(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_MOVIES, Permission.MANAGE_CINEMAS),
  validateIdParam,
  validateShowtimeUpdate,
  handleValidationErrors,
  c.updateShowtime,
);

r.patch(
  '/:id/toggle-status',
  requireAuth,
  authorize(Permission.MANAGE_MOVIES, Permission.MANAGE_CINEMAS),
  validateIdParam,
  handleValidationErrors,
  c.toggleShow_timeStatus,
);

r.delete(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_MOVIES, Permission.MANAGE_CINEMAS),
  validateIdParam,
  handleValidationErrors,
  c.deleteShowtime,
);

export default r;
