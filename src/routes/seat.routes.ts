import { Router } from 'express';
import * as SeatController from '../controllers/seat.controller';
import {
  validateSeatListQuery,
  validateSeatMapParams,
  validateSeatIdParam,
  validateSeatCreate,
  validateSeatCreateMany,
  validateSeatUpdate,
  handleValidationErrors,
} from '../middlewares/validation';
import { requireAuth, optionalAuth } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { Permission } from '../utils/auth/roles';

const router = Router();

/**
 * Public routes
 * - Danh sách ghế theo room (query)
 * - Seat map (room + showtime)
 */
router.get(
  '/',
  optionalAuth,
  validateSeatListQuery,
  handleValidationErrors,
  SeatController.listSeats,
);

router.get(
  '/rooms/:roomId/show_times/:showtimeId/seat-map',
  optionalAuth,
  validateSeatMapParams,
  handleValidationErrors,
  SeatController.seatMap,
);

/**
 * Admin routes
 */
router.post(
  '/',
  requireAuth,
  authorize(Permission.MANAGE_SEATS),
  validateSeatCreate,
  handleValidationErrors,
  SeatController.createSeat,
);

router.post(
  '/bulk',
  requireAuth,
  authorize(Permission.MANAGE_SEATS),
  validateSeatCreateMany,
  handleValidationErrors,
  SeatController.createManySeats,
);

router.get(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_SEATS),
  validateSeatIdParam,
  handleValidationErrors,
  SeatController.getSeat,
);

router.put(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_SEATS),
  validateSeatIdParam,
  validateSeatUpdate,
  handleValidationErrors,
  SeatController.updateSeat,
);

router.delete(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_SEATS),
  validateSeatIdParam,
  handleValidationErrors,
  SeatController.deleteSeat,
);

export default router;
