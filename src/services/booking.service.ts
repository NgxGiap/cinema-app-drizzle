import { randomBytes, randomUUID } from 'crypto';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  bookings,
  bookingSeats,
  seats,
  showtimes,
  tickets,
} from '../db/schema';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../utils/errors/base';

/** ENUMs (đồng bộ với schema) */
export type BookingStatus =
  | 'PENDING'
  | 'AWAITING_PAYMENT'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED';

export type HoldSeatItem = {
  seatId: string;
  price: string;
};

export type HoldSeatsInput = {
  userId?: string;
  showtimeId: string;
  seats: ReadonlyArray<HoldSeatItem>;
  currency?: string;
  expiresInMin?: number;
};

export type BookingSeatDetail = {
  seatId: string;
  seatNumber: string;
  row: string;
  column: number;
  price: string;
};

export type BookingDetail = {
  id: string;
  bookingNumber: string;
  showtimeId: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  currency: string;
  subtotalAmount: string;
  discountAmount: string;
  taxAmount: string;
  feeAmount: string;
  totalAmount: string;
  expiresAt: Date | null;
  confirmedAt: Date | null;
  createdAt: Date;
  items: BookingSeatDetail[];
};

/* ---------- helpers ---------- */

function parseDecimal(str: string): number {
  const n = Number(str);
  if (!Number.isFinite(n) || n < 0) throw new ValidationError('Invalid price');
  return n;
}

function toDecimalString(n: number): string {
  return n.toFixed(2);
}

async function getShowtimeOrThrow(id: string) {
  const [st] = await db
    .select()
    .from(showtimes)
    .where(eq(showtimes.id, id))
    .limit(1);
  if (!st) throw new NotFoundError('Showtime not found');
  return st;
}

async function ensureSeatsBelongToRoom(
  seatIds: ReadonlyArray<string>,
  roomId: string,
): Promise<{ ok: true }> {
  if (seatIds.length === 0) throw new ValidationError('No seats provided');
  const rows = await db
    .select({ id: seats.id })
    .from(seats)
    .where(
      and(
        inArray(seats.id, [...seatIds]),
        eq(seats.roomId, roomId),
        eq(seats.isActive, true),
      ),
    );
  if (rows.length !== seatIds.length) {
    throw new ValidationError(
      'Some seats are invalid for this room or inactive',
    );
  }
  return { ok: true };
}

function calcAmounts(items: ReadonlyArray<HoldSeatItem>) {
  const subtotal = items.reduce((s, x) => s + parseDecimal(x.price), 0);
  const discount = 0;
  const tax = 0;
  const fee = 0;
  const total = subtotal - discount + tax + fee;
  return {
    subtotal: toDecimalString(subtotal),
    discount: toDecimalString(discount),
    tax: toDecimalString(tax),
    fee: toDecimalString(fee),
    total: toDecimalString(total),
  };
}

/* ---------- services ---------- */

/** Tạo booking ở trạng thái PENDING + giữ ghế (insert booking_seats)
 *  Nếu ghế đã bị giữ/bán ở showtime đó, ném ConflictError.
 */
export async function holdSeats(
  input: HoldSeatsInput,
): Promise<{ bookingId: string; bookingNumber: string; expiresAt: Date }> {
  if (!input.seats.length) throw new ValidationError('seats must not be empty');
  const expiresInMin =
    input.expiresInMin && input.expiresInMin > 0 ? input.expiresInMin : 15;
  const currency = input.currency ?? 'VND';

  // 1) Lấy showtime & kiểm tra ghế thuộc đúng room
  const st = await getShowtimeOrThrow(input.showtimeId);
  const seatIds = input.seats.map((x) => x.seatId);
  await ensureSeatsBelongToRoom(seatIds, st.roomId);

  // 2) Tính tiền
  const money = calcAmounts(input.seats);

  const bookingId = randomUUID();
  const bookingNumber =
    'BK' + Math.floor(Math.random() * 900000 + 100000).toString();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInMin * 60 * 1000);

  // 3) Transaction: tạo booking + insert booking_seats + tăng bookedSeats
  try {
    await db.transaction(async (tx) => {
      await tx.insert(bookings).values({
        id: bookingId,
        bookingNumber,
        userId: input.userId ?? null,
        showtimeId: input.showtimeId,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        currency,
        subtotalAmount: money.subtotal,
        discountAmount: money.discount,
        taxAmount: money.tax,
        feeAmount: money.fee,
        totalAmount: money.total,
        expiresAt,
      });

      await tx.insert(bookingSeats).values(
        input.seats.map((it) => ({
          bookingId,
          showtimeId: input.showtimeId,
          seatId: it.seatId,
          unitPrice: it.price,
        })),
      );

      await tx
        .update(showtimes)
        .set({
          bookedSeats: sql`${showtimes.bookedSeats} + ${input.seats.length}`,
        })
        .where(eq(showtimes.id, input.showtimeId));
    });
  } catch {
    // Nếu lỗi do duplicate key ở booking_seats → ghế đã bị giữ
    throw new ConflictError('Some seats are already held or booked');
  }

  return { bookingId, bookingNumber, expiresAt };
}

export async function getDetail(id: string): Promise<BookingDetail> {
  const [bk] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);
  if (!bk) throw new NotFoundError('Booking not found');

  const items = await db
    .select({
      seatId: bookingSeats.seatId,
      seatNumber: seats.seatNumber,
      row: seats.row,
      column: seats.column,
      price: bookingSeats.unitPrice,
    })
    .from(bookingSeats)
    .innerJoin(seats, eq(seats.id, bookingSeats.seatId))
    .where(eq(bookingSeats.bookingId, id));

  return {
    id: bk.id,
    bookingNumber: bk.bookingNumber,
    showtimeId: bk.showtimeId,
    status: bk.status as BookingStatus,
    paymentStatus: bk.paymentStatus as PaymentStatus,
    currency: bk.currency,
    subtotalAmount: String(bk.subtotalAmount),
    discountAmount: String(bk.discountAmount),
    taxAmount: String(bk.taxAmount),
    feeAmount: String(bk.feeAmount),
    totalAmount: String(bk.totalAmount),
    expiresAt: bk.expiresAt,
    confirmedAt: bk.confirmedAt ?? null,
    createdAt: bk.createdAt,
    items: items.map<BookingSeatDetail>((r) => ({
      seatId: r.seatId,
      seatNumber: r.seatNumber,
      row: r.row,
      column: r.column,
      price: String(r.price),
    })),
  };
}

/** Huỷ booking (chỉ khi chưa CONFIRMED/PAID)
 *  - Giải phóng ghế: giảm showtimes.bookedSeats, xoá dòng booking_seats
 */
export async function cancel(bookingId: string): Promise<void> {
  const [bk] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!bk) throw new NotFoundError('Booking not found');
  if (bk.status === 'CONFIRMED')
    throw new ConflictError('Confirmed booking cannot be cancelled');

  await db.transaction(async (tx) => {
    const [{ cnt }] = await tx
      .select({ cnt: count() })
      .from(bookingSeats)
      .where(eq(bookingSeats.bookingId, bookingId));

    await tx
      .update(bookings)
      .set({ status: 'CANCELLED' })
      .where(eq(bookings.id, bookingId));

    if (cnt > 0) {
      await tx
        .update(showtimes)
        .set({ bookedSeats: sql`${showtimes.bookedSeats} - ${Number(cnt)}` })
        .where(eq(showtimes.id, bk.showtimeId));
      await tx
        .delete(bookingSeats)
        .where(eq(bookingSeats.bookingId, bookingId));
    }
  });
}

/** Đánh dấu PAID + phát hành vé (1 ghế 1 vé) */
export async function markPaidAndIssueTickets(
  bookingId: string,
): Promise<void> {
  const [bk] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!bk) throw new NotFoundError('Booking not found');

  // Nếu đã PAID rồi thì bỏ qua
  if (bk.paymentStatus === 'PAID' && bk.status === 'CONFIRMED') return;

  const lines = await db
    .select({
      showtimeId: bookingSeats.showtimeId,
      seatId: bookingSeats.seatId,
    })
    .from(bookingSeats)
    .where(eq(bookingSeats.bookingId, bookingId));

  await db.transaction(async (tx) => {
    await tx
      .update(bookings)
      .set({
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    if (lines.length) {
      await tx.insert(tickets).values(
        lines.map((x) => ({
          id: randomUUID(),
          bookingId,
          showtimeId: x.showtimeId,
          seatId: x.seatId,
          status: 'ISSUED' as const,
          qrToken: randomBytes(24).toString('hex'),
          issuedAt: new Date(),
          version: 1,
        })),
      );
    }
  });
}

/** Cron: hết hạn booking PENDING/AWAITING_PAYMENT */
export async function expirePending(now = new Date()): Promise<number> {
  // Lấy danh sách booking quá hạn
  const expired = await db
    .select({
      id: bookings.id,
      showtimeId: bookings.showtimeId,
      expiresAt: bookings.expiresAt,
    })
    .from(bookings)
    .where(
      and(
        inArray(bookings.status, ['PENDING', 'AWAITING_PAYMENT']),
        sql`${bookings.expiresAt} IS NOT NULL AND ${bookings.expiresAt} < ${now}`,
      ),
    );

  if (!expired.length) return 0;

  let released = 0;
  for (const b of expired) {
    await db.transaction(async (tx) => {
      const [{ cnt }] = await tx
        .select({ cnt: count() })
        .from(bookingSeats)
        .where(eq(bookingSeats.bookingId, b.id));

      await tx
        .update(bookings)
        .set({ status: 'EXPIRED' })
        .where(eq(bookings.id, b.id));

      if (cnt > 0) {
        await tx
          .update(showtimes)
          .set({ bookedSeats: sql`${showtimes.bookedSeats} - ${Number(cnt)}` })
          .where(eq(showtimes.id, b.showtimeId));
        await tx.delete(bookingSeats).where(eq(bookingSeats.bookingId, b.id));
        released += Number(cnt);
      }
    });
  }
  return released;
}
