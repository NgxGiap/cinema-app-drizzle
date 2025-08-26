import { Router } from 'express';
import * as c from '../controllers/showtime.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { Permission } from '../utils/auth/roles';
import {
  validateShowtimeCreation,
  validateShowtimeUpdate,
  validatePagination,
} from '../middlewares/validation';

const r = Router();

// Public routes for viewing showtimes
r.get('/', optionalAuth, validatePagination, c.listShowtimes);

r.get('/upcoming', optionalAuth, validatePagination, c.getUpcomingShowtimes);

r.get(
  '/movie/:movieId',
  optionalAuth,
  validatePagination,
  c.getShowtimesByMovie,
);

r.get(
  '/cinema/:cinemaId',
  optionalAuth,
  validatePagination,
  c.getShowtimesByCinema,
);

r.get('/:id', optionalAuth, c.getShowtime);

// Protected routes for showtime management - Admin/Manager only
r.post(
  '/',
  requireAuth,
  authorize(Permission.MANAGE_MOVIES, Permission.MANAGE_CINEMAS),
  validateShowtimeCreation,
  c.createShowtime,
);

r.put(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_MOVIES, Permission.MANAGE_CINEMAS),
  validateShowtimeUpdate,
  c.updateShowtime,
);

r.patch(
  '/:id/toggle-status',
  requireAuth,
  authorize(Permission.MANAGE_MOVIES, Permission.MANAGE_CINEMAS),
  c.toggleShowtimeStatus,
);

r.delete(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_MOVIES, Permission.MANAGE_CINEMAS),
  c.deleteShowtime,
);

export default r;
