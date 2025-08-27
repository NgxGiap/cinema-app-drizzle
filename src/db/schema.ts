import { sql, relations } from 'drizzle-orm';
import {
  mysqlTable,
  varchar,
  datetime,
  text,
  int,
  decimal,
  boolean,
  mysqlEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .default(sql`(uuid())`),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  createdAt: datetime('created_at').notNull().default(new Date()),
});

export const movies = mysqlTable('movies', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .default(sql`(uuid())`),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  duration: int('duration').notNull(), // phút
  releaseDate: datetime('release_date').notNull(),
  createdAt: datetime('created_at').notNull().default(new Date()),
});

export const cinemas = mysqlTable('cinemas', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .default(sql`(uuid())`),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: datetime('created_at').notNull().default(new Date()),
});

export const seats = mysqlTable('seats', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .default(sql`(uuid())`),
  cinemaId: varchar('cinema_id', { length: 36 }).notNull(),
  seatNumber: varchar('seat_number', { length: 10 }).notNull(), // A1, B5, etc.
  row: varchar('row', { length: 5 }).notNull(), // A, B, C, etc.
  column: int('column').notNull(), // 1, 2, 3, etc.
  type: mysqlEnum('type', ['regular', 'vip', 'couple', 'disabled'])
    .notNull()
    .default('regular'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: datetime('created_at').notNull().default(new Date()),
});

export const showtimes = mysqlTable('showtimes', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .default(sql`(uuid())`),
  movieId: varchar('movie_id', { length: 36 }).notNull(),
  cinemaId: varchar('cinema_id', { length: 36 }).notNull(),
  showDate: datetime('show_date').notNull(),
  showTime: varchar('show_time', { length: 8 }).notNull(), // HH:MM:SS
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  totalSeats: int('total_seats').notNull().default(0),
  bookedSeats: int('booked_seats').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: datetime('created_at').notNull().default(new Date()),
});

export const bookings = mysqlTable('bookings', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .default(sql`(uuid())`),
  userId: varchar('user_id', { length: 36 }).notNull(),
  showtimeId: varchar('showtime_id', { length: 36 }).notNull(),
  bookingNumber: varchar('booking_number', { length: 20 }).notNull().unique(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  totalSeats: int('total_seats').notNull(),
  status: mysqlEnum('status', ['pending', 'confirmed', 'cancelled', 'expired'])
    .notNull()
    .default('pending'),
  paymentStatus: mysqlEnum('payment_status', [
    'pending',
    'paid',
    'failed',
    'refunded',
  ])
    .notNull()
    .default('pending'),
  paymentMethod: varchar('payment_method', { length: 50 }),
  customerName: varchar('customer_name', { length: 100 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 20 }),
  notes: text('notes'),
  expiresAt: datetime('expires_at'), // For temporary holds
  confirmedAt: datetime('confirmed_at'),
  cancelledAt: datetime('cancelled_at'),
  createdAt: datetime('created_at').notNull().default(new Date()),
  updatedAt: datetime('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export const bookingSeats = mysqlTable(
  'booking_seats',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`(uuid())`),
    bookingId: varchar('booking_id', { length: 36 }).notNull(),
    showtimeId: varchar('showtime_id', { length: 36 }).notNull(), // ⬅️ thêm
    seatId: varchar('seat_id', { length: 36 }).notNull(),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    status: mysqlEnum('status', ['reserved', 'booked', 'cancelled'])
      .notNull()
      .default('reserved'),
    createdAt: datetime('created_at').notNull().default(new Date()),
  },
  (t) => ({
    uqSeatPerShowtime: uniqueIndex('uq_seat_per_showtime').on(
      t.showtimeId,
      t.seatId,
    ), // ⬅️ unique
    idxBooking: index('idx_bookingSeat_booking').on(t.bookingId),
    idxSeat: index('idx_bookingSeat_seat').on(t.seatId),
  }),
);

export const payments = mysqlTable('payments', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .default(sql`(uuid())`),
  bookingId: varchar('booking_id', { length: 36 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  method: varchar('method', { length: 50 }).notNull(), // cash, card, online, etc.
  status: mysqlEnum('status', [
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded',
  ])
    .notNull()
    .default('pending'),
  transactionId: varchar('transaction_id', { length: 100 }),
  gatewayResponse: text('gateway_response'), // JSON response from payment gateway
  processedAt: datetime('processed_at'),
  failedReason: text('failed_reason'),
  createdAt: datetime('created_at').notNull().default(new Date()),
  updatedAt: datetime('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Relations
export const cinemasRelations = relations(cinemas, ({ many }) => ({
  seats: many(seats),
  showtimes: many(showtimes),
}));

export const seatsRelations = relations(seats, ({ one, many }) => ({
  cinema: one(cinemas, {
    fields: [seats.cinemaId],
    references: [cinemas.id],
  }),
  bookingSeats: many(bookingSeats),
}));

export const showtimesRelations = relations(showtimes, ({ one, many }) => ({
  movie: one(movies, {
    fields: [showtimes.movieId],
    references: [movies.id],
  }),
  cinema: one(cinemas, {
    fields: [showtimes.cinemaId],
    references: [cinemas.id],
  }),
  bookings: many(bookings),
}));

export const moviesRelations = relations(movies, ({ many }) => ({
  showtimes: many(showtimes),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  showtime: one(showtimes, {
    fields: [bookings.showtimeId],
    references: [showtimes.id],
  }),
  bookingSeats: many(bookingSeats),
  payments: many(payments),
}));

export const bookingSeatsRelations = relations(bookingSeats, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingSeats.bookingId],
    references: [bookings.id],
  }),
  seat: one(seats, {
    fields: [bookingSeats.seatId],
    references: [seats.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Movie = typeof movies.$inferSelect;
export type NewMovie = typeof movies.$inferInsert;

export type Cinema = typeof cinemas.$inferSelect;
export type NewCinema = typeof cinemas.$inferInsert;

export type Seat = typeof seats.$inferSelect;
export type NewSeat = typeof seats.$inferInsert;

export type Showtime = typeof showtimes.$inferSelect;
export type NewShowtime = typeof showtimes.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

export type BookingSeat = typeof bookingSeats.$inferSelect;
export type NewBookingSeat = typeof bookingSeats.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
