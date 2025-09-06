import { Router } from 'express';
import userRoutes from './user.routes';
import movieRoutes from './movie.routes';
import authRoutes from './auth.routes';
import cinemaRoutes from './cinema.routes';
import roomRoutes from './room.routes';
import seatRoutes from './seat.routes';
import showtimeRoutes from './showtime.routes';
import bookingRoutes from './booking.routes';
import paymentRoutes from './payment.routes';
import ticketRoutes from './ticket.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/movies', movieRoutes);
router.use('/cinemas', cinemaRoutes);
router.use('/seats', seatRoutes);
router.use('/showtimes', showtimeRoutes);
router.use('/bookings', bookingRoutes);
router.use('/rooms', roomRoutes);
router.use('/payments', paymentRoutes);
router.use('/tickets', ticketRoutes);

export default router;
