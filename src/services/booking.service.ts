// src/services/booking.service.ts
import { randomUUID } from 'crypto';
import { and, count, desc, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  bookings,
  bookingSeats,
  bookingSeatHolds,
  seats,
  show_times,
  movies,
  cinemas,
  rooms,
  BOOKING_STATUS,
  PAYMENT_STATUS,
} from '../db/schema';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../utils/errors/base';

const HOLD_MINUTES = 5 as const;

export type HoldSeatsInput = {
  userId?: string;
  showtimeId: string;
  seatIds: string[];
};

export type HoldItem = {
  seatId: string;
  seatNumber: string;
  row: string;
  column: number;
};

export type HoldSeatsResult = {
  bookingId: string;
  bookingNumber: string;
  status: (typeof bookings.$inferSelect)['status'];
  expiresAt: Date;
  items: HoldItem[];
};

export type BookingSeatEntry = {
  seatId: string;
  seatNumber: string;
  row: string;
  column: number;
  unitPrice: string | null;
  source: 'booked' | 'hold';
};

export type BookingListItem = {
  id: string;
  bookingNumber: string;
  status: (typeof bookings.$inferSelect)['status'];
  paymentStatus: (typeof bookings.$inferSelect)['paymentStatus'];
  currency: string;
  subtotalAmount: string;
  totalAmount: string;
  expiresAt: Date | null;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  showtime: {
    id: string;
    startsAt: Date;
    price: string; // reference price từ showtime
    movie: { id: string; title: string; posterUrl: string | null };
    cinema: { id: string; name: string; city: string | null };
    room: { id: string; name: string };
  };
  seats: BookingSeatEntry[];
};

export type BookingFilters = {
  userId?: string;
  status?: (typeof bookings.$inferSelect)['status'];
  paymentStatus?: (typeof bookings.$inferSelect)['paymentStatus'];
  showtimeId?: string;
};

// ====== Helpers ======
async function nextBookingNumber(): Promise<string> {
  return 'BK' + Date.now();
}

// ====== CLEANUP holds hết hạn ======
export async function cleanupExpiredHolds(): Promise<void> {
  await db
    .delete(bookingSeatHolds)
    .where(lt(bookingSeatHolds.expiresAt, new Date()));
}

export async function holdSeats(
  input: HoldSeatsInput,
): Promise<HoldSeatsResult> {
  if (!input.showtimeId) throw new BadRequestError('showtimeId is required');
  if (!Array.isArray(input.seatIds) || input.seatIds.length === 0) {
    throw new BadRequestError('seatIds is required');
  }

  return db.transaction(async (tx) => {
    // 1) dọn rác trước khi hold để tránh vướng unique
    await tx
      .delete(bookingSeatHolds)
      .where(lt(bookingSeatHolds.expiresAt, new Date()));

    // 2) showtime hợp lệ & active
    const [st] = await tx
      .select({
        id: show_times.id,
        roomId: show_times.roomId,
        isActive: show_times.isActive,
      })
      .from(show_times)
      .where(eq(show_times.id, input.showtimeId))
      .limit(1);

    if (!st || !st.isActive)
      throw new BadRequestError('Showtime not found or inactive');

    // 3) seats thuộc room & active
    const validSeats = await tx
      .select({
        id: seats.id,
        seatNumber: seats.seatNumber,
        row: seats.row,
        column: seats.column,
      })
      .from(seats)
      .where(
        and(
          inArray(seats.id, input.seatIds),
          eq(seats.roomId, st.roomId),
          eq(seats.isActive, true),
        ),
      );

    if (validSeats.length !== input.seatIds.length) {
      throw new BadRequestError(
        'Some seats are invalid for this room or inactive',
      );
    }

    // 4) ghế đã BOOKED (bảng chính)
    const booked = await tx
      .select({ seatId: bookingSeats.seatId })
      .from(bookingSeats)
      .where(
        and(
          eq(bookingSeats.showtimeId, input.showtimeId),
          inArray(bookingSeats.seatId, input.seatIds),
        ),
      );

    if (booked.length > 0) throw new ConflictError('Some seats already booked');

    // 5) ghế đang HOLD (bảng tạm, còn sống)
    const live = await tx
      .select({ seatId: bookingSeatHolds.seatId })
      .from(bookingSeatHolds)
      .where(
        and(
          eq(bookingSeatHolds.showtimeId, input.showtimeId),
          inArray(bookingSeatHolds.seatId, input.seatIds),
          gt(bookingSeatHolds.expiresAt, new Date()),
        ),
      );

    if (live.length > 0) throw new ConflictError('Some seats currently held');

    // 6) tạo booking header (chưa tính tiền)
    const bookingId = randomUUID();
    const bookingNumber = await nextBookingNumber();
    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);

    await tx.insert(bookings).values({
      id: bookingId,
      bookingNumber,
      userId: input.userId ?? null,
      showtimeId: input.showtimeId,
      status: BOOKING_STATUS.PENDING,
      paymentStatus: PAYMENT_STATUS.PENDING,
      expiresAt,
      currency: 'VND',
      subtotalAmount: '0.00',
      discountAmount: '0.00',
      taxAmount: '0.00',
      feeAmount: '0.00',
      totalAmount: '0.00',
    });

    // 7) ghi HOLD vào bảng tạm
    await tx.insert(bookingSeatHolds).values(
      validSeats.map((s) => ({
        id: randomUUID(),
        bookingId,
        showtimeId: input.showtimeId,
        seatId: s.id,
        expiresAt,
      })),
    );

    // 8) trả info hiển thị
    const items: HoldItem[] = validSeats.map((s) => ({
      seatId: s.id,
      seatNumber: s.seatNumber,
      row: s.row,
      column: Number(s.column),
    }));

    return {
      bookingId,
      bookingNumber,
      status: BOOKING_STATUS.PENDING,
      expiresAt,
      items,
    };
  });
}

// ====== CANCEL booking: xoá HOLD tạm + set trạng thái ======
export async function cancel(
  bookingId: string,
): Promise<{ id: string; status: (typeof bookings.$inferSelect)['status'] }> {
  return db.transaction(async (tx) => {
    const [b] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!b) throw new NotFoundError('Booking not found');

    await tx
      .delete(bookingSeatHolds)
      .where(eq(bookingSeatHolds.bookingId, bookingId));
    await tx
      .update(bookings)
      .set({ status: BOOKING_STATUS.CANCELLED, cancelledAt: new Date() })
      .where(eq(bookings.id, bookingId));

    return { id: bookingId, status: BOOKING_STATUS.CANCELLED };
  });
}

// ====== FINALIZE sau PAID: chuyển HOLD → bảng chính, xoá HOLD, tăng bookedSeats, CONFIRM booking ======
export async function finalizeBookingSeats(
  bookingId: string,
  unitPricePerSeat?: Record<string, string>, // nếu có pricing, truyền { seatId: "xxxxx.yy" }
): Promise<void> {
  await db.transaction(async (tx) => {
    const [b] = await tx
      .select({
        id: bookings.id,
        showtimeId: bookings.showtimeId,
        status: bookings.status,
        paymentStatus: bookings.paymentStatus,
      })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!b) throw new NotFoundError('Booking not found');

    // holds còn sống
    const holds = await tx
      .select({ seatId: bookingSeatHolds.seatId })
      .from(bookingSeatHolds)
      .where(
        and(
          eq(bookingSeatHolds.bookingId, bookingId),
          gt(bookingSeatHolds.expiresAt, new Date()),
        ),
      );

    if (holds.length === 0) {
      // idempotent: nếu đã insert booking_seats trước đó thì bỏ qua
      const already = await tx
        .select({ n: sql<number>`COUNT(*)` })
        .from(bookingSeats)
        .where(eq(bookingSeats.bookingId, bookingId));
      if (Number(already[0]?.n ?? 0) > 0) return;
      throw new ConflictError('No valid holds to finalize');
    }

    // fallback: đơn giá theo showtime nếu chưa có pricing
    const [st] = await tx
      .select({ price: show_times.price })
      .from(show_times)
      .where(eq(show_times.id, b.showtimeId))
      .limit(1);
    const defaultUnit = String(st?.price ?? '0.00');

    // chèn booking_seats (idempotent với composite key)
    await tx
      .insert(bookingSeats)
      .values(
        holds.map((h) => ({
          bookingId,
          showtimeId: b.showtimeId,
          seatId: h.seatId,
          unitPrice: unitPricePerSeat?.[h.seatId] ?? defaultUnit,
        })),
      )
      .onDuplicateKeyUpdate({
        set: { unitPrice: sql`VALUES(unit_price)` },
      });

    // xoá hold tạm
    await tx
      .delete(bookingSeatHolds)
      .where(eq(bookingSeatHolds.bookingId, bookingId));

    // tăng show_times.booked_seats
    await tx
      .update(show_times)
      .set({ bookedSeats: sql`${show_times.bookedSeats} + ${holds.length}` })
      .where(eq(show_times.id, b.showtimeId));

    // xác nhận booking
    await tx
      .update(bookings)
      .set({
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.PAID,
        confirmedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));
  });
}

// ====== LIST bookings (trả object có ý nghĩa cho UI) ======
export async function list(
  page = 1,
  pageSize = 20,
  filters?: BookingFilters,
): Promise<{ items: BookingListItem[]; total: number }> {
  const offset = (page - 1) * pageSize;

  const where = and(
    filters?.userId ? eq(bookings.userId, filters.userId) : undefined,
    filters?.status ? eq(bookings.status, filters.status) : undefined,
    filters?.paymentStatus
      ? eq(bookings.paymentStatus, filters.paymentStatus)
      : undefined,
    filters?.showtimeId
      ? eq(bookings.showtimeId, filters.showtimeId)
      : undefined,
  );

  // FLAT SELECT + INNER JOIN để loại khả năng null
  const base = await db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      status: bookings.status,
      paymentStatus: bookings.paymentStatus,
      currency: bookings.currency,
      subtotalAmount: bookings.subtotalAmount,
      totalAmount: bookings.totalAmount,
      expiresAt: bookings.expiresAt,
      confirmedAt: bookings.confirmedAt,
      cancelledAt: bookings.cancelledAt,
      createdAt: bookings.createdAt,

      st_id: show_times.id,
      st_startsAt: show_times.startsAt,
      st_price: show_times.price,

      mv_id: movies.id,
      mv_title: movies.title,
      mv_posterUrl: movies.posterUrl,

      cn_id: cinemas.id,
      cn_name: cinemas.name,
      cn_city: cinemas.city,

      rm_id: rooms.id,
      rm_name: rooms.name,
    })
    .from(bookings)
    .innerJoin(show_times, eq(show_times.id, bookings.showtimeId))
    .innerJoin(movies, eq(movies.id, show_times.movieId))
    .innerJoin(cinemas, eq(cinemas.id, show_times.cinemaId))
    .innerJoin(rooms, eq(rooms.id, show_times.roomId))
    .where(where)
    .orderBy(desc(bookings.createdAt))
    .limit(pageSize)
    .offset(offset);

  const ids: string[] = base.map((b) => b.id);

  // BOOKED seats: dùng innerJoin để loại null
  const booked = ids.length
    ? await db
        .select({
          bookingId: bookingSeats.bookingId,
          seatId: seats.id,
          seatNumber: seats.seatNumber,
          row: seats.row,
          column: seats.column,
          unitPrice: bookingSeats.unitPrice,
        })
        .from(bookingSeats)
        .innerJoin(seats, eq(seats.id, bookingSeats.seatId))
        .where(inArray(bookingSeats.bookingId, ids))
    : [];

  // HOLD seats còn sống: innerJoin seats để loại null
  const now = new Date();
  const holds = ids.length
    ? await db
        .select({
          bookingId: bookingSeatHolds.bookingId,
          seatId: seats.id,
          seatNumber: seats.seatNumber,
          row: seats.row,
          column: seats.column,
          expiresAt: bookingSeatHolds.expiresAt,
        })
        .from(bookingSeatHolds)
        .innerJoin(seats, eq(seats.id, bookingSeatHolds.seatId))
        .where(
          and(
            inArray(bookingSeatHolds.bookingId, ids),
            gt(bookingSeatHolds.expiresAt, now),
          ),
        )
    : [];

  const seatBookedMap = new Map<string, BookingSeatEntry[]>();
  for (const r of booked) {
    const arr = seatBookedMap.get(r.bookingId) ?? [];
    arr.push({
      seatId: r.seatId,
      seatNumber: r.seatNumber,
      row: r.row,
      column: Number(r.column),
      unitPrice: String(r.unitPrice),
      source: 'booked',
    });
    seatBookedMap.set(r.bookingId, arr);
  }

  const seatHoldMap = new Map<string, BookingSeatEntry[]>();
  for (const r of holds) {
    const arr = seatHoldMap.get(r.bookingId) ?? [];
    arr.push({
      seatId: r.seatId,
      seatNumber: r.seatNumber,
      row: r.row,
      column: Number(r.column),
      unitPrice: null,
      source: 'hold',
    });
    seatHoldMap.set(r.bookingId, arr);
  }

  const items: BookingListItem[] = base.map((b) => {
    const bookedSeatsArr = seatBookedMap.get(b.id) ?? [];
    const holdSeatsArr = seatHoldMap.get(b.id) ?? [];
    const mergedSeats = bookedSeatsArr.length ? bookedSeatsArr : holdSeatsArr;

    return {
      id: b.id,
      bookingNumber: b.bookingNumber,
      status: b.status,
      paymentStatus: b.paymentStatus,
      currency: b.currency,
      subtotalAmount: String(b.subtotalAmount),
      totalAmount: String(b.totalAmount),
      expiresAt: b.expiresAt,
      confirmedAt: b.confirmedAt,
      cancelledAt: b.cancelledAt,
      createdAt: b.createdAt,
      showtime: {
        id: b.st_id,
        startsAt: b.st_startsAt,
        price: String(b.st_price),
        movie: { id: b.mv_id, title: b.mv_title, posterUrl: b.mv_posterUrl },
        cinema: { id: b.cn_id, name: b.cn_name, city: b.cn_city },
        room: { id: b.rm_id, name: b.rm_name },
      },
      seats: mergedSeats,
    };
  });

  const [{ total }] = await db
    .select({ total: count() })
    .from(bookings)
    .where(where);
  return { items, total: Number(total) };
}

// ====== GET by id (trả nested + seats như list) ======
export async function getById(id: string): Promise<BookingListItem> {
  // Query trực tiếp 1 bản ghi với FLAT SELECT + INNER JOIN
  const base = await db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      status: bookings.status,
      paymentStatus: bookings.paymentStatus,
      currency: bookings.currency,
      subtotalAmount: bookings.subtotalAmount,
      totalAmount: bookings.totalAmount,
      expiresAt: bookings.expiresAt,
      confirmedAt: bookings.confirmedAt,
      cancelledAt: bookings.cancelledAt,
      createdAt: bookings.createdAt,

      st_id: show_times.id,
      st_startsAt: show_times.startsAt,
      st_price: show_times.price,

      mv_id: movies.id,
      mv_title: movies.title,
      mv_posterUrl: movies.posterUrl,

      cn_id: cinemas.id,
      cn_name: cinemas.name,
      cn_city: cinemas.city,

      rm_id: rooms.id,
      rm_name: rooms.name,
    })
    .from(bookings)
    .innerJoin(show_times, eq(show_times.id, bookings.showtimeId))
    .innerJoin(movies, eq(movies.id, show_times.movieId))
    .innerJoin(cinemas, eq(cinemas.id, show_times.cinemaId))
    .innerJoin(rooms, eq(rooms.id, show_times.roomId))
    .where(eq(bookings.id, id))
    .limit(1);

  if (!base[0]) throw new NotFoundError('Booking not found');
  const b = base[0];

  // Ghế BOOKED
  const booked = await db
    .select({
      seatId: seats.id,
      seatNumber: seats.seatNumber,
      row: seats.row,
      column: seats.column,
      unitPrice: bookingSeats.unitPrice,
    })
    .from(bookingSeats)
    .innerJoin(seats, eq(seats.id, bookingSeats.seatId))
    .where(eq(bookingSeats.bookingId, id));

  // Ghế HOLD còn sống
  const now = new Date();
  const holds = await db
    .select({
      seatId: seats.id,
      seatNumber: seats.seatNumber,
      row: seats.row,
      column: seats.column,
      expiresAt: bookingSeatHolds.expiresAt,
    })
    .from(bookingSeatHolds)
    .innerJoin(seats, eq(seats.id, bookingSeatHolds.seatId))
    .where(
      and(
        eq(bookingSeatHolds.bookingId, id),
        gt(bookingSeatHolds.expiresAt, now),
      ),
    );

  const bookedArr: BookingSeatEntry[] = booked.map((r) => ({
    seatId: r.seatId,
    seatNumber: r.seatNumber,
    row: r.row,
    column: Number(r.column),
    unitPrice: String(r.unitPrice),
    source: 'booked',
  }));

  const holdArr: BookingSeatEntry[] = holds.map((r) => ({
    seatId: r.seatId,
    seatNumber: r.seatNumber,
    row: r.row,
    column: Number(r.column),
    unitPrice: null,
    source: 'hold',
  }));

  const seatsMerged = bookedArr.length ? bookedArr : holdArr;

  return {
    id: b.id,
    bookingNumber: b.bookingNumber,
    status: b.status,
    paymentStatus: b.paymentStatus,
    currency: b.currency,
    subtotalAmount: String(b.subtotalAmount),
    totalAmount: String(b.totalAmount),
    expiresAt: b.expiresAt,
    confirmedAt: b.confirmedAt,
    cancelledAt: b.cancelledAt,
    createdAt: b.createdAt,
    showtime: {
      id: b.st_id,
      startsAt: b.st_startsAt,
      price: String(b.st_price),
      movie: { id: b.mv_id, title: b.mv_title, posterUrl: b.mv_posterUrl },
      cinema: { id: b.cn_id, name: b.cn_name, city: b.cn_city },
      room: { id: b.rm_id, name: b.rm_name },
    },
    seats: seatsMerged,
  };
}
