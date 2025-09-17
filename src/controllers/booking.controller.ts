import { NextFunction, Request, Response } from 'express';
import * as svc from '../services/booking.service';

// POST /bookings/hold
export async function holdSeats(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const payload: svc.HoldSeatsInput = {
      showtimeId: String(req.body.showtimeId),
      seatIds: Array.isArray(req.body.seatIds)
        ? req.body.seatIds.map(String)
        : [],
      ...(req.user?.id ? { userId: String(req.user.id) } : {}),
    };
    const result = await svc.holdSeats(payload);
    return res.ok(result, 'Seats held for 5 minutes');
  } catch (err) {
    next(err);
  }
}

// GET /bookings/:id
export async function getBooking(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await svc.getById(String(req.params.id));
    return res.ok(data, 'Booking detail');
  } catch (err) {
    next(err);
  }
}

// POST /bookings/:id/cancel
export async function cancelBooking(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await svc.cancel(String(req.params.id));
    return res.ok(data, 'Booking canceled');
  } catch (err) {
    next(err);
  }
}

// POST /bookings/:id/mark-paid
export async function markPaid(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await svc.finalizeBookingSeats(req.params.id);
    return res.ok({ ok: true }, 'Booking marked as PAID & tickets issued');
  } catch (err) {
    next(err);
  }
}
