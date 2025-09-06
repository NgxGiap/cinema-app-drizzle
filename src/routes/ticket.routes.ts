import { Router } from 'express';
import * as c from '../controllers/ticket.controller';
import { requireAuth } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { Permission } from '../utils/auth/roles';
import {
  validateIdParam,
  validateTicketScan,
  validateBookingIdParam,
  handleValidationErrors,
} from '../middlewares/validation';

const r = Router();

/** Quầy soát vé (staff) */
r.post(
  '/scan',
  requireAuth,
  authorize(Permission.MANAGE_BOOKINGS), // hoặc Permission.MANAGE_TICKETS nếu bạn có
  validateTicketScan,
  handleValidationErrors,
  c.scan,
);

/** Admin/Support */
r.get(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_BOOKINGS),
  validateIdParam,
  handleValidationErrors,
  c.getTicket,
);
r.get(
  '/by-booking/:bookingId',
  requireAuth,
  authorize(Permission.MANAGE_BOOKINGS),
  validateBookingIdParam,
  handleValidationErrors,
  c.listByBooking,
);
r.post(
  '/:id/reissue',
  requireAuth,
  authorize(Permission.MANAGE_BOOKINGS),
  validateIdParam,
  handleValidationErrors,
  c.reissue,
);
r.post(
  '/:id/void',
  requireAuth,
  authorize(Permission.MANAGE_BOOKINGS),
  validateIdParam,
  handleValidationErrors,
  c.voidTicket,
);

export default r;
