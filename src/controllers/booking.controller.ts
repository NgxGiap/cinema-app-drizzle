import { NextFunction, Request, Response } from 'express';
import * as svc from '../services/booking.service';

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

export const hold = holdSeats;
export const cancel = cancelBooking;
export const getById = getBooking;

/** GET /me/bookings (tuỳ chọn) */
// export async function myBookings(
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) {
//   try {
//     if (!req.user?.id) return res.fail('Unauthorized');
//     // đơn giản: phân trang nhẹ nhàng
//     const page = Math.max(1, Number(req.query.page) || 1);
//     const pageSize = Math.min(100, Number(req.query.pageSize) || 20);
//     // bạn có thể viết service riêng; tạm dùng getDetail theo danh sách id (tuỳ schema bạn có userId ở bookings)
//     // Ở đây để ngắn gọn mình trả 501:
//     return res.status(501).json({ message: 'Not implemented' });
//   } catch (err) {
//     next(err);
//   }
// }
