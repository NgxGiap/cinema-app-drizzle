import { randomUUID } from 'crypto';
import { and, eq, count, sql, inArray, gte, lte } from 'drizzle-orm';
import { db } from '../db';
import {
  bookings,
  bookingSeats,
  payments,
  showtimes,
  seats,
  movies,
  cinemas,
  users,
} from '../db/schema';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../utils/errors/base';

export type CreateBookingInput = {
  userId: string;
  showtimeId: string;
  seatIds: string[];
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
};

export type BookingFilters = {
  userId?: string;
  showtimeId?: string;
  movieId?: string;
  cinemaId?: string;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'expired';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  fromDate?: string;
  toDate?: string;
  bookingNumber?: string;
};

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

const BOOKING_EXPIRY_MINUTES = 15; // Bookings expire after 15 minutes if not confirmed

// Generate unique booking number
function generateBookingNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK${dateStr}${timeStr}${random}`;
}

export async function createBooking(input: CreateBookingInput) {
  if (!input.seatIds || input.seatIds.length === 0) {
    throw new ValidationError('At least one seat must be selected');
  }

  // Dedup ghế trong 1 booking
  input.seatIds = Array.from(new Set(input.seatIds));

  if (input.seatIds.length > 8) {
    throw new ValidationError('Maximum 8 seats allowed per booking');
  }

  // Check if showtime exists and is active
  const [showtime] = await db
    .select({
      id: showtimes.id,
      movieId: showtimes.movieId,
      cinemaId: showtimes.cinemaId,
      showDate: showtimes.showDate,
      showTime: showtimes.showTime,
      price: showtimes.price,
      totalSeats: showtimes.totalSeats,
      bookedSeats: showtimes.bookedSeats,
      isActive: showtimes.isActive,
      movie: {
        id: movies.id,
        title: movies.title,
        duration: movies.duration,
      },
      cinema: {
        id: cinemas.id,
        name: cinemas.name,
        city: cinemas.city,
      },
    })
    .from(showtimes)
    .leftJoin(movies, eq(showtimes.movieId, movies.id))
    .leftJoin(cinemas, eq(showtimes.cinemaId, cinemas.id))
    .where(eq(showtimes.id, input.showtimeId))
    .limit(1);

  if (!showtime) {
    throw new NotFoundError('Showtime not found');
  }

  if (!showtime.isActive) {
    throw new ValidationError('Showtime is not active');
  }

  // Check not in the past
  const now = new Date();
  const showtimeDateTime = new Date(
    `${showtime.showDate.toISOString().split('T')[0]} ${showtime.showTime}`,
  );
  if (showtimeDateTime < now) {
    throw new ValidationError('Cannot book seats for past showtimes');
  }

  // Check user exists
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Get seat details (đúng rạp + active)
  const seatDetails = await db
    .select({
      id: seats.id,
      cinemaId: seats.cinemaId,
      seatNumber: seats.seatNumber,
      row: seats.row,
      column: seats.column,
      type: seats.type,
      price: seats.price,
      isActive: seats.isActive,
    })
    .from(seats)
    .where(
      and(
        inArray(seats.id, input.seatIds),
        eq(seats.cinemaId, showtime.cinemaId),
        eq(seats.isActive, true),
      ),
    );

  if (seatDetails.length !== input.seatIds.length) {
    throw new ValidationError('Some seats are invalid or inactive');
  }

  // Pre-check seats are free (bên ngoài tx – để feedback sớm)
  const bookedSeats = await db
    .select({ seatId: bookingSeats.seatId })
    .from(bookingSeats)
    .leftJoin(bookings, eq(bookingSeats.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.showtimeId, input.showtimeId),
        inArray(bookingSeats.seatId, input.seatIds),
        inArray(bookings.status, ['pending', 'confirmed']),
        inArray(bookingSeats.status, ['reserved', 'booked']),
      ),
    );

  if (bookedSeats.length > 0) {
    throw new ConflictError('Some seats are already booked or reserved');
  }

  // Calculate total amount
  const totalAmount = seatDetails.reduce((sum, seat) => {
    return sum + parseFloat(seat.price.toString());
  }, 0);

  // Create booking in transaction
  const bookingId = randomUUID();
  const bookingNumber = generateBookingNumber();
  const expiresAt = new Date(Date.now() + BOOKING_EXPIRY_MINUTES * 60 * 1000);

  await db.transaction(async (tx) => {
    // 🔒 Lock 1 hàng showtime để serialize và tránh race
    await tx.execute(
      sql`SELECT id FROM ${showtimes} WHERE ${showtimes.id} = ${input.showtimeId} FOR UPDATE`,
    );

    // 🔁 Re-check seats NGAY TRONG transaction (chống đua)
    const conflictingSeatsTx = await tx
      .select({ seatId: bookingSeats.seatId })
      .from(bookingSeats)
      .leftJoin(bookings, eq(bookingSeats.bookingId, bookings.id))
      .where(
        and(
          eq(bookings.showtimeId, input.showtimeId),
          inArray(bookingSeats.seatId, input.seatIds),
          inArray(bookings.status, ['pending', 'confirmed']),
          inArray(bookingSeats.status, ['reserved', 'booked']),
        ),
      );

    if (conflictingSeatsTx.length > 0) {
      throw new ConflictError('Some seats are already booked or reserved');
    }

    // Create booking
    await tx.insert(bookings).values({
      id: bookingId,
      userId: input.userId,
      showtimeId: input.showtimeId,
      bookingNumber,
      totalAmount: totalAmount.toString(),
      totalSeats: input.seatIds.length,
      status: 'pending',
      paymentStatus: 'pending',
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone ?? null, // tránh undefined
      notes: input.notes ?? null, // tránh undefined
      expiresAt,
    });

    // Create booking seats
    const bookingSeatData = seatDetails.map((seat) => ({
      id: randomUUID(),
      bookingId,
      showtimeId: input.showtimeId, // nếu bảng booking_seats có cột này
      seatId: seat.id,
      price: seat.price.toString(),
      status: 'reserved' as const,
    }));

    await tx.insert(bookingSeats).values(bookingSeatData);

    // Update showtime booked seats count
    await tx
      .update(showtimes)
      .set({
        bookedSeats: sql`${showtimes.bookedSeats} + ${input.seatIds.length}`,
      })
      .where(eq(showtimes.id, input.showtimeId));
  });

  return await getBookingById(bookingId);
}

export async function getBookingById(id: string) {
  const [booking] = await db
    .select({
      id: bookings.id,
      userId: bookings.userId,
      showtimeId: bookings.showtimeId,
      bookingNumber: bookings.bookingNumber,
      totalAmount: bookings.totalAmount,
      totalSeats: bookings.totalSeats,
      status: bookings.status,
      paymentStatus: bookings.paymentStatus,
      paymentMethod: bookings.paymentMethod,
      customerName: bookings.customerName,
      customerEmail: bookings.customerEmail,
      customerPhone: bookings.customerPhone,
      notes: bookings.notes,
      expiresAt: bookings.expiresAt,
      confirmedAt: bookings.confirmedAt,
      cancelledAt: bookings.cancelledAt,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      // User info
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
      // Showtime info
      showtime: {
        id: showtimes.id,
        showDate: showtimes.showDate,
        showTime: showtimes.showTime,
        price: showtimes.price,
      },
      // Movie info
      movie: {
        id: movies.id,
        title: movies.title,
        duration: movies.duration,
      },
      // Cinema info
      cinema: {
        id: cinemas.id,
        name: cinemas.name,
        city: cinemas.city,
        address: cinemas.address,
      },
    })
    .from(bookings)
    .leftJoin(users, eq(bookings.userId, users.id))
    .leftJoin(showtimes, eq(bookings.showtimeId, showtimes.id))
    .leftJoin(movies, eq(showtimes.movieId, movies.id))
    .leftJoin(cinemas, eq(showtimes.cinemaId, cinemas.id))
    .where(eq(bookings.id, id))
    .limit(1);

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  // Get booking seats
  const seatRows = await db
    .select({
      id: bookingSeats.id,
      seatId: bookingSeats.seatId,
      price: bookingSeats.price,
      status: bookingSeats.status,
      seat: {
        seatNumber: seats.seatNumber,
        row: seats.row,
        column: seats.column,
        type: seats.type,
      },
    })
    .from(bookingSeats)
    .leftJoin(seats, eq(bookingSeats.seatId, seats.id))
    .where(eq(bookingSeats.bookingId, id))
    .orderBy(seats.row, seats.column);

  // Get payments
  const paymentHistory = await db
    .select()
    .from(payments)
    .where(eq(payments.bookingId, id))
    .orderBy(sql`${payments.createdAt} DESC`);

  return {
    ...booking,
    seats: seatRows,
    payments: paymentHistory,
  };
}

export async function listBookings(
  page = 1,
  pageSize = 20,
  filters?: BookingFilters,
) {
  const conditions = [];

  if (filters?.userId) {
    conditions.push(eq(bookings.userId, filters.userId));
  }
  if (filters?.showtimeId) {
    conditions.push(eq(bookings.showtimeId, filters.showtimeId));
  }
  if (filters?.status) {
    conditions.push(eq(bookings.status, filters.status));
  }
  if (filters?.paymentStatus) {
    conditions.push(eq(bookings.paymentStatus, filters.paymentStatus));
  }
  if (filters?.bookingNumber) {
    conditions.push(eq(bookings.bookingNumber, filters.bookingNumber));
  }
  if (filters?.movieId) {
    conditions.push(eq(movies.id, filters.movieId));
  }
  if (filters?.cinemaId) {
    conditions.push(eq(cinemas.id, filters.cinemaId));
  }
  if (filters?.fromDate) {
    conditions.push(gte(bookings.createdAt, new Date(filters.fromDate)));
  }
  if (filters?.toDate) {
    const toDate = new Date(filters.toDate);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(bookings.createdAt, toDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: bookings.id,
        bookingNumber: bookings.bookingNumber,
        totalAmount: bookings.totalAmount,
        totalSeats: bookings.totalSeats,
        status: bookings.status,
        paymentStatus: bookings.paymentStatus,
        customerName: bookings.customerName,
        customerEmail: bookings.customerEmail,
        expiresAt: bookings.expiresAt,
        confirmedAt: bookings.confirmedAt,
        createdAt: bookings.createdAt,
        movie: {
          title: movies.title,
        },
        cinema: {
          name: cinemas.name,
          city: cinemas.city,
        },
        showtime: {
          showDate: showtimes.showDate,
          showTime: showtimes.showTime,
        },
      })
      .from(bookings)
      .leftJoin(showtimes, eq(bookings.showtimeId, showtimes.id))
      .leftJoin(movies, eq(showtimes.movieId, movies.id))
      .leftJoin(cinemas, eq(showtimes.cinemaId, cinemas.id))
      .where(whereClause)
      .orderBy(sql`${bookings.createdAt} DESC`)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: count() })
      .from(bookings)
      .leftJoin(showtimes, eq(bookings.showtimeId, showtimes.id))
      .leftJoin(movies, eq(showtimes.movieId, movies.id))
      .leftJoin(cinemas, eq(showtimes.cinemaId, cinemas.id))
      .where(whereClause),
  ]);

  return { items: rows, total: Number(total) };
}

export async function confirmBooking(
  bookingId: string,
  paymentMethod?: string,
) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  if (booking.status !== 'pending') {
    throw new ValidationError('Only pending bookings can be confirmed');
  }

  // Check if booking has expired
  if (booking.expiresAt && booking.expiresAt < new Date()) {
    await cancelBooking(bookingId, 'Booking expired');
    throw new ValidationError('Booking has expired');
  }

  await db.transaction(async (tx) => {
    // Update booking status
    await tx
      .update(bookings)
      .set({
        status: 'confirmed',
        paymentStatus: paymentMethod ? 'paid' : 'pending',
        paymentMethod: paymentMethod ?? null,
        confirmedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    // Update booking seats status
    await tx
      .update(bookingSeats)
      .set({ status: 'booked' })
      .where(eq(bookingSeats.bookingId, bookingId));

    // Create payment record if payment method provided
    if (paymentMethod) {
      await tx.insert(payments).values({
        id: randomUUID(),
        bookingId,
        amount: booking.totalAmount,
        method: paymentMethod,
        status: 'completed',
        processedAt: new Date(),
      });
    }
  });

  return await getBookingById(bookingId);
}

export async function cancelBooking(bookingId: string, reason?: string) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  if (booking.status === 'cancelled') {
    throw new ValidationError('Booking is already cancelled');
  }

  if (booking.status === 'confirmed') {
    // Check if showtime is still in future (allow cancellation up to 2 hours before show)
    const [showtime] = await db
      .select({ showDate: showtimes.showDate, showTime: showtimes.showTime })
      .from(showtimes)
      .where(eq(showtimes.id, booking.showtimeId))
      .limit(1);

    if (showtime) {
      const showtimeDateTime = new Date(
        `${showtime.showDate.toISOString().split('T')[0]} ${showtime.showTime}`,
      );
      const twoHoursBefore = new Date(
        showtimeDateTime.getTime() - 2 * 60 * 60 * 1000,
      );

      if (new Date() > twoHoursBefore) {
        throw new ValidationError(
          'Cannot cancel booking less than 2 hours before showtime',
        );
      }
    }
  }

  await db.transaction(async (tx) => {
    // Update booking status
    await tx
      .update(bookings)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        notes: reason
          ? `${booking.notes || ''}\nCancelled: ${reason}`.trim()
          : booking.notes,
      })
      .where(eq(bookings.id, bookingId));

    // Update booking seats status
    await tx
      .update(bookingSeats)
      .set({ status: 'cancelled' })
      .where(eq(bookingSeats.bookingId, bookingId));

    // Reduce booked seats count in showtime
    await tx
      .update(showtimes)
      .set({
        bookedSeats: sql`${showtimes.bookedSeats} - ${booking.totalSeats}`,
      })
      .where(eq(showtimes.id, booking.showtimeId));

    // If booking was paid, create refund payment record
    if (booking.paymentStatus === 'paid') {
      await tx.insert(payments).values({
        id: randomUUID(),
        bookingId,
        amount: `-${booking.totalAmount}`, // Negative amount for refund
        method: booking.paymentMethod || 'refund',
        status: 'pending',
      });

      // Update booking payment status
      await tx
        .update(bookings)
        .set({ paymentStatus: 'refunded' })
        .where(eq(bookings.id, bookingId));
    }
  });

  return await getBookingById(bookingId);
}

export async function expireBookings() {
  const now = new Date();

  // Find expired pending bookings
  const expiredBookings = await db
    .select({
      id: bookings.id,
      totalSeats: bookings.totalSeats,
      showtimeId: bookings.showtimeId,
    })
    .from(bookings)
    .where(and(eq(bookings.status, 'pending'), lte(bookings.expiresAt, now)));

  if (expiredBookings.length === 0) {
    return { expired: 0 };
  }

  await db.transaction(async (tx) => {
    for (const booking of expiredBookings) {
      // Update booking status to expired
      await tx
        .update(bookings)
        .set({
          status: 'expired',
          cancelledAt: now,
        })
        .where(eq(bookings.id, booking.id));

      // Update booking seats status
      await tx
        .update(bookingSeats)
        .set({ status: 'cancelled' })
        .where(eq(bookingSeats.bookingId, booking.id));

      // Reduce booked seats count in showtime
      await tx
        .update(showtimes)
        .set({
          bookedSeats: sql`${showtimes.bookedSeats} - ${booking.totalSeats}`,
        })
        .where(eq(showtimes.id, booking.showtimeId));
    }
  });

  return { expired: expiredBookings.length };
}

export async function getBookingSeatAvailability(showtimeId: string) {
  // Get all seats for the showtime's cinema
  const [showtimeInfo] = await db
    .select({
      cinemaId: showtimes.cinemaId,
      totalSeats: showtimes.totalSeats,
      bookedSeats: showtimes.bookedSeats,
    })
    .from(showtimes)
    .where(eq(showtimes.id, showtimeId))
    .limit(1);

  if (!showtimeInfo) {
    throw new NotFoundError('Showtime not found');
  }

  // Get all seats for this cinema
  const allSeats = await db
    .select({
      id: seats.id,
      seatNumber: seats.seatNumber,
      row: seats.row,
      column: seats.column,
      type: seats.type,
      price: seats.price,
      isActive: seats.isActive,
    })
    .from(seats)
    .where(
      and(eq(seats.cinemaId, showtimeInfo.cinemaId), eq(seats.isActive, true)),
    )
    .orderBy(seats.row, seats.column);

  // Get booked/reserved seats for this showtime
  const bookedSeatIds = await db
    .select({ seatId: bookingSeats.seatId })
    .from(bookingSeats)
    .leftJoin(bookings, eq(bookingSeats.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.showtimeId, showtimeId),
        inArray(bookings.status, ['pending', 'confirmed']),
        inArray(bookingSeats.status, ['reserved', 'booked']),
      ),
    );

  const bookedIds = new Set(bookedSeatIds.map((b) => b.seatId));

  // Mark seats as available or booked
  const seatsWithStatus = allSeats.map((seat) => ({
    ...seat,
    isAvailable: !bookedIds.has(seat.id),
    bookingStatus: bookedIds.has(seat.id) ? 'booked' : 'available',
  }));

  return {
    showtimeId,
    totalSeats: showtimeInfo.totalSeats,
    bookedSeats: showtimeInfo.bookedSeats,
    availableSeats: showtimeInfo.totalSeats - showtimeInfo.bookedSeats,
    seats: seatsWithStatus,
  };
}

export async function getUserBookings(userId: string, page = 1, pageSize = 10) {
  return await listBookings(page, pageSize, { userId });
}

export async function getBookingByNumber(bookingNumber: string) {
  const [booking] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.bookingNumber, bookingNumber))
    .limit(1);

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  return await getBookingById(booking.id);
}

export async function updateBookingPaymentStatus(
  bookingId: string,
  paymentStatus: PaymentStatus,
  transactionId?: string,
) {
  // Pre-check tồn tại (feedback nhanh)
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  await db.transaction(async (tx) => {
    // 🔒 Lock bản ghi booking
    await tx.execute(
      sql`SELECT id FROM ${bookings} WHERE ${bookings.id} = ${bookingId} FOR UPDATE`,
    );

    // (tuỳ chọn) idempotency theo transactionId – tránh ghi double
    if (transactionId) {
      const dup = await tx
        .select({ id: payments.id })
        .from(payments)
        .where(eq(payments.transactionId, transactionId));
      if (dup.length > 0) {
        return; // đã xử lý giao dịch này rồi
      }
    }

    // Lấy lại booking dưới lock để dùng amount/method mới nhất
    const [bk] = await tx
      .select({
        id: bookings.id,
        totalAmount: bookings.totalAmount,
        paymentMethod: bookings.paymentMethod,
        status: bookings.status,
      })
      .from(bookings)
      .where(eq(bookings.id, bookingId));

    if (!bk) throw new NotFoundError('Booking not found');

    // Update payment status (và updatedAt)
    await tx
      .update(bookings)
      .set({
        paymentStatus,
        // nếu muốn cập nhật method khi có gateway trả về:
        // paymentMethod: booking.paymentMethod ?? null,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    // Ghi payment record
    await tx.insert(payments).values({
      id: randomUUID(),
      bookingId,
      amount: bk.totalAmount,
      method: bk.paymentMethod ?? 'online',
      status:
        paymentStatus === 'paid'
          ? 'completed'
          : paymentStatus === 'failed'
            ? 'failed'
            : 'pending',
      transactionId: transactionId ?? null, // tránh undefined
      processedAt: paymentStatus === 'paid' ? new Date() : null,
    });
  });

  return await getBookingById(bookingId);
}

// Admin functions
export async function getBookingStats(fromDate?: string, toDate?: string) {
  const conditions = [];

  if (fromDate) {
    conditions.push(gte(bookings.createdAt, new Date(fromDate)));
  }
  if (toDate) {
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    conditions.push(lte(bookings.createdAt, to));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [stats] = await db
    .select({
      totalBookings: count(),
      totalRevenue: sql<number>`SUM(CASE WHEN ${bookings.paymentStatus} = 'paid' THEN ${bookings.totalAmount} ELSE 0 END)`,
      pendingBookings: sql<number>`SUM(CASE WHEN ${bookings.status} = 'pending' THEN 1 ELSE 0 END)`,
      confirmedBookings: sql<number>`SUM(CASE WHEN ${bookings.status} = 'confirmed' THEN 1 ELSE 0 END)`,
      cancelledBookings: sql<number>`SUM(CASE WHEN ${bookings.status} = 'cancelled' THEN 1 ELSE 0 END)`,
      expiredBookings: sql<number>`SUM(CASE WHEN ${bookings.status} = 'expired' THEN 1 ELSE 0 END)`,
    })
    .from(bookings)
    .where(whereClause);

  return {
    totalBookings: Number(stats.totalBookings) || 0,
    totalRevenue: Number(stats.totalRevenue) || 0,
    pendingBookings: Number(stats.pendingBookings) || 0,
    confirmedBookings: Number(stats.confirmedBookings) || 0,
    cancelledBookings: Number(stats.cancelledBookings) || 0,
    expiredBookings: Number(stats.expiredBookings) || 0,
  };
}
