import { Router } from 'express';
import * as c from '../controllers/booking.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { Permission } from '../utils/auth/roles';
import {
  validateBookingHold,
  validateIdParam,
  handleValidationErrors,
} from '../middlewares/validation';

const r = Router();

/** Public (hoặc yêu cầu đăng nhập tuỳ bạn) */
r.post(
  '/hold',
  optionalAuth,
  validateBookingHold,
  handleValidationErrors,
  c.hold,
);

r.get('/:id', optionalAuth, validateIdParam, handleValidationErrors, c.getById);

/** Admin/Dev helpers */
r.post(
  '/:id/cancel',
  requireAuth,
  authorize(Permission.MANAGE_BOOKINGS),
  validateIdParam,
  handleValidationErrors,
  c.cancel,
);

r.post(
  '/:id/mark-paid',
  requireAuth,
  authorize(Permission.MANAGE_BOOKINGS),
  validateIdParam,
  handleValidationErrors,
  c.markPaid,
);

export default r;
