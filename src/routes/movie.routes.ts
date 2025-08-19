import { Router } from 'express';
import {
  getMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
} from '../controllers/movie.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.get('/', getMovies);
router.get('/:id', getMovieById);
router.post('/', authMiddleware, createMovie);
router.put('/:id', authMiddleware, updateMovie);
router.delete('/:id', authMiddleware, deleteMovie);

export default router;
