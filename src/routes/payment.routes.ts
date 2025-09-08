import { Router } from 'express';
import * as c from '../controllers/payment.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { Permission } from '../utils/auth/roles';
import {
  validatePaymentIntent,
  validatePaymentWebhook,
  validateIdParam,
  handleValidationErrors,
} from '../middlewares/validation';

const r = Router();

/** Public (hoặc requireAuth tuỳ bạn) */
r.post(
  '/intent',
  optionalAuth,
  validatePaymentIntent,
  handleValidationErrors,
  c.createIntent,
);
r.post('/webhook', validatePaymentWebhook, handleValidationErrors, c.webhook);

/** Admin/Support */
r.get(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_PAYMENTS),
  validateIdParam,
  handleValidationErrors,
  c.getPayment,
);

export default r;
