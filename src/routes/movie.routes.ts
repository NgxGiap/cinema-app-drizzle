import { Router } from 'express';
import * as c from '../controllers/movie.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { Permission } from '../utils/auth/roles';
import {
  validateMovieCreation,
  validatePagination,
} from '../middlewares/validation';

const r = Router();

// Public routes - anyone can view movies
r.get(
  '/',
  optionalAuth, // Optional auth for potential future personalization
  validatePagination,
  c.listMovies,
);

r.get('/:id', optionalAuth, c.getMovie);

// Protected routes - Admin/Manager only
r.post(
  '/',
  requireAuth,
  authorize(Permission.MANAGE_MOVIES),
  validateMovieCreation,
  c.createMovie,
);

r.put('/:id', requireAuth, authorize(Permission.MANAGE_MOVIES), c.updateMovie);

r.delete(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_MOVIES),
  c.deleteMovie,
);

export default r;
