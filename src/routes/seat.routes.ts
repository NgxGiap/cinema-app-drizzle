import { Router } from 'express';
import * as c from '../controllers/seat.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { Permission } from '../utils/auth/roles';
import {
  validateSeatCreation,
  validatePagination,
} from '../middlewares/validation';

const r = Router();

// Public routes for viewing seats
r.get('/', optionalAuth, validatePagination, c.listSeats);

r.get(
  '/cinema/:cinemaId',
  optionalAuth,
  validatePagination,
  c.getSeatsByCinema,
);

r.get('/cinema/:cinemaId/map', optionalAuth, c.getSeatMap);

r.get('/:id', optionalAuth, c.getSeat);

// Protected routes for seat management - Admin/Manager only
r.post(
  '/',
  requireAuth,
  authorize(Permission.MANAGE_SEATS),
  validateSeatCreation,
  c.createSeat,
);

r.post(
  '/bulk',
  requireAuth,
  authorize(Permission.MANAGE_SEATS),
  c.createMultipleSeats,
);

r.put('/:id', requireAuth, authorize(Permission.MANAGE_SEATS), c.updateSeat);

r.delete('/:id', requireAuth, authorize(Permission.MANAGE_SEATS), c.deleteSeat);

r.delete(
  '/bulk',
  requireAuth,
  authorize(Permission.MANAGE_SEATS),
  c.deleteMultipleSeats,
);

export default r;
