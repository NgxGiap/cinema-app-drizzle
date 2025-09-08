import { Router } from 'express';
import * as c from '../controllers/room.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { Permission } from '../utils/auth/roles';
import {
  validatePagination,
  validateRoomListQuery,
  validateRoomCreate,
  validateRoomUpdate,
  validateIdParam,
  validateSeatLayout,
  handleValidationErrors,
} from '../middlewares/validation';

const r = Router();

/** Public */
r.get(
  '/',
  optionalAuth,
  validatePagination,
  validateRoomListQuery,
  handleValidationErrors,
  c.listRooms,
);
r.get('/:id', optionalAuth, validateIdParam, handleValidationErrors, c.getRoom);

/** Admin / Staff */
r.post(
  '/',
  requireAuth,
  authorize(Permission.MANAGE_ROOMS),
  validateRoomCreate,
  handleValidationErrors,
  c.createRoom,
);

r.put(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_ROOMS),
  validateIdParam,
  validateRoomUpdate,
  handleValidationErrors,
  c.updateRoom,
);

r.patch(
  '/:id/toggle-status',
  requireAuth,
  authorize(Permission.MANAGE_ROOMS),
  validateIdParam,
  handleValidationErrors,
  c.toggleRoomStatus,
);

r.delete(
  '/:id',
  requireAuth,
  authorize(Permission.MANAGE_ROOMS),
  validateIdParam,
  handleValidationErrors,
  c.deleteRoom,
);

/** Layout */
r.post(
  '/:id/layout/preview',
  requireAuth,
  authorize(Permission.MANAGE_SEATS),
  validateIdParam,
  validateSeatLayout,
  handleValidationErrors,
  c.previewRoomLayout,
);

r.post(
  '/:id/layout/apply',
  requireAuth,
  authorize(Permission.MANAGE_SEATS),
  validateIdParam,
  validateSeatLayout,
  handleValidationErrors,
  c.applyRoomLayout,
);

export default r;
