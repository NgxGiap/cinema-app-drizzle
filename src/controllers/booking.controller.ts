import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/booking.service';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** POST /bookings/hold */
export async function hold(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isObject(req.body)) return res.fail('Invalid payload');
    const seats = Array.isArray(req.body.seats) ? req.body.seats : [];
    const normalized = seats.map((x) => {
      if (!isObject(x)) throw new Error('Invalid seat item');
      return { seatId: String(x.seatId), price: String(x.price) };
    });

    const payload: svc.HoldSeatsInput = {
      showtimeId: String(req.body.showtimeId),
      seats: normalized,
      currency:
        typeof req.body.currency === 'string' ? req.body.currency : 'VND',
    };
    if (
      typeof req.body.expiresInMin === 'number' &&
      req.body.expiresInMin > 0
    ) {
      payload.expiresInMin = req.body.expiresInMin;
    }
    if (req.user?.id != null) {
      payload.userId = String(req.user.id);
    }

    const result = await svc.holdSeats(payload);
    return res.ok(result, 'Booking created & seats held');
  } catch (err) {
    next(err);
  }
}

/** GET /bookings/:id */
export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getDetail(req.params.id);
    return res.ok(data);
  } catch (err) {
    next(err);
  }
}

/** POST /bookings/:id/cancel */
export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.cancel(req.params.id);
    return res.ok({ ok: true }, 'Booking cancelled');
  } catch (err) {
    next(err);
  }
}

/** POST /bookings/:id/mark-paid
 *  - đường này cho môi trường dev/admin; thực tế sẽ do Payments webhook gọi
 */
export async function markPaid(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await svc.markPaidAndIssueTickets(req.params.id);
    return res.ok({ ok: true }, 'Booking marked as PAID & tickets issued');
  } catch (err) {
    next(err);
  }
}

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
