import { Router } from 'express';
import * as c from '../controllers/movie.controller';
import { optionalAuth, requireAuth } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { Permission } from '../utils/auth/roles';
import {
  validatePagination,
  validateMovieListQuery,
  validateMovieCreate,
  validateMovieUpdate,
  validateIdParam,
  handleValidationErrors,
} from '../middlewares/validation';

const r = Router();

/** Public */
r.get(
  '/',
  optionalAuth,
  validatePagination,
  validateMovieListQuery,
  handleValidationErrors,
  c.listMovies,
);
r.get('/slug/:slug', optionalAuth, handleValidationErrors, c.getMovieBySlug); // public by slug
r.get(
  '/:id',
  optionalAuth,
  validateIdParam,
  handleValidationErrors,
  c.getMovie,
);

/** Admin */
r.post(
  '/',
  requireAuth,
  authorize(Permission.MANAGE_MOVIES),
  validateMovieCreate,
  handleValidationErrors,
  c.createMovie,
);

r.put(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_MOVIES),
  validateIdParam,
  validateMovieUpdate,
  handleValidationErrors,
  c.updateMovie,
);

r.delete(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_MOVIES),
  validateIdParam,
  handleValidationErrors,
  c.deleteMovie,
);

export default r;
