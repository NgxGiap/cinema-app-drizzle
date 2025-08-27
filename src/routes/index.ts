import { Router } from 'express';
import userRoutes from './user.routes';
import movieRoutes from './movie.routes';
import authRoutes from './auth.routes';
import cinemaRoutes from './cinema.routes';
import seatRoutes from './seat.routes';
import showtimeRoutes from './showtime.routes';
import bookingRoutes from './booking.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/movies', movieRoutes);
router.use('/cinemas', cinemaRoutes);
router.use('/seats', seatRoutes);
router.use('/showtimes', showtimeRoutes);
router.use('/bookings', bookingRoutes);

export default router;
