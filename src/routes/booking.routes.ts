import { Router } from 'express';
import * as c from '../controllers/booking.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { Permission } from '../utils/auth/roles';
import {
  validateBookingCreation,
  validatePaymentUpdate,
  validatePagination,
} from '../middlewares/validation';

const r = Router();

// Public routes
r.get('/seat-availability/:showtimeId', optionalAuth, c.getSeatAvailability);

// Protected routes - Authentication required
r.post('/', requireAuth, validateBookingCreation, c.createBooking);

r.get('/my-bookings', requireAuth, validatePagination, c.getUserBookings);

r.get('/booking-number/:bookingNumber', requireAuth, c.getBookingByNumber);

r.get('/:id', requireAuth, c.getBooking);

r.patch('/:id/confirm', requireAuth, c.confirmBooking);

r.patch('/:id/cancel', requireAuth, c.cancelBooking);

// Admin/Manager/Staff routes
r.get(
  '/',
  requireAuth,
  authorize(Permission.VIEW_BOOKINGS, Permission.MANAGE_BOOKINGS),
  validatePagination,
  c.listBookings,
);

r.patch(
  '/:id/payment',
  requireAuth,
  authorize(Permission.MANAGE_BOOKINGS),
  validatePaymentUpdate,
  c.updatePaymentStatus,
);

r.post(
  '/expire-bookings',
  requireAuth,
  authorize(Permission.MANAGE_BOOKINGS),
  c.expireBookings,
);

r.get(
  '/admin/stats',
  requireAuth,
  authorize(Permission.VIEW_REPORTS),
  c.getBookingStats,
);

// Webhook route (no auth required as it comes from payment gateway)
r.post('/webhook/payment', c.paymentWebhook);

export default r;
