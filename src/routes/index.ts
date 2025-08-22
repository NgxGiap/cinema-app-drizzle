import { Router } from 'express';
import userRoutes from './user.routes';
import movieRoutes from './movie.routes';
import authRoutes from './auth.routes';

const router = Router();
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/movies', movieRoutes);
export default router;
