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
  json,
  primaryKey,
} from 'drizzle-orm/mysql-core';

/* =========================
   ENUM CONSTANTS (UPPERCASE)
   ========================= */

export const MOVIE_STATE = {
  COMING_SOON: 'COMING_SOON',
  NOW_SHOWING: 'NOW_SHOWING',
  ENDED: 'ENDED',
} as const;

export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  PAID: 'PAID',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export const TICKET_STATUS = {
  ISSUED: 'ISSUED',
  CHECKED_IN: 'CHECKED_IN',
  VOIDED: 'VOIDED',
  REFUNDED: 'REFUNDED',
} as const;

export const SEAT_TYPE = {
  REGULAR: 'REGULAR',
  VIP: 'VIP',
  COUPLE: 'COUPLE',
  DISABLED: 'DISABLED',
} as const;

/* =============
   CORE TABLES
   ============= */

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .default(sql`(uuid())`),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

/** MOVIES — lean + JSON, giống CGV nhưng gọn, dễ mở rộng */
export const movies = mysqlTable(
  'movies',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`(uuid())`),

    slug: varchar('slug', { length: 220 }).notNull().unique(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),

    runtimeMinutes: int('runtime_minutes').notNull(), // vd 124
    releaseDate: datetime('release_date').notNull(), // có thể dùng DATE nếu bạn muốn

    state: mysqlEnum(
      'state',
      Object.values(MOVIE_STATE) as [string, ...string[]],
    )
      .notNull()
      .default(MOVIE_STATE.COMING_SOON),

    posterUrl: varchar('poster_url', { length: 500 }),
    trailerUrl: varchar('trailer_url', { length: 500 }),

    /** danh sách dạng JSON để v1 triển khai nhanh */
    genres: json('genres'), // string[]
    directors: json('directors'), // string[]
    cast: json('cast'), // { name, role? }[]

    ratingCode: varchar('rating_code', { length: 10 }), // vd "T13"
    originalLanguage: varchar('original_language', { length: 5 }), // vi, en, …

    createdAt: datetime('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
  },
  (t) => ({
    idxState: index('idx_movie_state').on(t.state),
    idxReleaseDate: index('idx_movie_release_date').on(t.releaseDate),
  }),
);

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
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

/** ROOMS — phòng chiếu, kèm seating_map JSON để generate seats */
export const rooms = mysqlTable(
  'rooms',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`(uuid())`),
    cinemaId: varchar('cinema_id', { length: 36 })
      .notNull()
      .references(() => cinemas.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    capacity: int('capacity').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    seatingMap: json('seating_map'), // blueprint JSON (tuỳ chọn)
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
  },
  (t) => ({
    idxCinema: index('idx_room_cinema').on(t.cinemaId),
    uqNamePerCinema: uniqueIndex('uq_room_name_per_cinema').on(
      t.cinemaId,
      t.name,
    ),
  }),
);

/** SEATS — gắn với room (không phải cinema) */
export const seats = mysqlTable(
  'seats',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`(uuid())`),
    roomId: varchar('room_id', { length: 36 })
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    seatNumber: varchar('seat_number', { length: 10 }).notNull(), // A1, B5, …
    row: varchar('row', { length: 5 }).notNull(),
    column: int('column').notNull(),
    type: mysqlEnum('type', Object.values(SEAT_TYPE) as [string, ...string[]])
      .notNull()
      .default(SEAT_TYPE.REGULAR),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
  },
  (t) => ({
    uqSeatPerRoom: uniqueIndex('uq_seat_room_number').on(
      t.roomId,
      t.seatNumber,
    ),
    idxRoom: index('idx_seat_room').on(t.roomId),
  }),
);

/** show_times — gộp thời gian: starts_at, có room_id */
export const show_times = mysqlTable(
  'show_times',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`(uuid())`),
    movieId: varchar('movie_id', { length: 36 })
      .notNull()
      .references(() => movies.id, { onDelete: 'restrict' }),
    cinemaId: varchar('cinema_id', { length: 36 })
      .notNull()
      .references(() => cinemas.id, { onDelete: 'restrict' }),
    roomId: varchar('room_id', { length: 36 })
      .notNull()
      .references(() => rooms.id, { onDelete: 'restrict' }),

    startsAt: datetime('starts_at').notNull(), // UTC
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    totalSeats: int('total_seats').notNull().default(0),
    bookedSeats: int('booked_seats').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),

    createdAt: datetime('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
  },
  (t) => ({
    uqShowtimePerRoom: uniqueIndex('uq_showtime_room_time').on(
      t.roomId,
      t.startsAt,
    ),
    idxMovieStartsAt: index('idx_showtime_movie_time').on(
      t.movieId,
      t.startsAt,
    ),
    idxCinemaStartsAt: index('idx_showtime_cinema_time').on(
      t.cinemaId,
      t.startsAt,
    ),
  }),
);

/** BOOKINGS — tinh gọn, không chứa PII payment/customer */
export const bookings = mysqlTable(
  'bookings',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`(uuid())`),
    bookingNumber: varchar('booking_number', { length: 40 }).notNull().unique(),
    userId: varchar('user_id', { length: 36 }),
    showtimeId: varchar('showtime_id', { length: 36 })
      .notNull()
      .references(() => show_times.id, { onDelete: 'restrict' }),

    status: mysqlEnum(
      'status',
      Object.values(BOOKING_STATUS) as [string, ...string[]],
    )
      .notNull()
      .default(BOOKING_STATUS.PENDING),

    paymentStatus: mysqlEnum(
      'payment_status',
      Object.values(PAYMENT_STATUS) as [string, ...string[]],
    )
      .notNull()
      .default(PAYMENT_STATUS.PENDING),

    expiresAt: datetime('expires_at'),
    confirmedAt: datetime('confirmed_at'),
    cancelledAt: datetime('cancelled_at'),
    refundedAt: datetime('refunded_at'),

    currency: varchar('currency', { length: 3 }).notNull().default('VND'),
    subtotalAmount: decimal('subtotal_amount', { precision: 10, scale: 2 })
      .notNull()
      .default('0.00'),
    discountAmount: decimal('discount_amount', { precision: 10, scale: 2 })
      .notNull()
      .default('0.00'),
    taxAmount: decimal('tax_amount', { precision: 10, scale: 2 })
      .notNull()
      .default('0.00'),
    feeAmount: decimal('fee_amount', { precision: 10, scale: 2 })
      .notNull()
      .default('0.00'),
    totalAmount: decimal('total_amount', { precision: 10, scale: 2 })
      .notNull()
      .default('0.00'),

    notes: text('notes'),

    createdAt: datetime('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
  },
  (t) => ({
    idxShowtime: index('idx_booking_showtime').on(t.showtimeId),
    idxStatus: index('idx_booking_status').on(t.status),
    idxPaymentStatus: index('idx_booking_payment_status').on(t.paymentStatus),
    idxExpiresAt: index('idx_booking_expires_at').on(t.expiresAt),
  }),
);

/** BOOKING_SEATS — composite PK (showtime_id, seat_id) + booking_id */
export const bookingSeats = mysqlTable(
  'booking_seats',
  {
    bookingId: varchar('booking_id', { length: 36 })
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    showtimeId: varchar('showtime_id', { length: 36 })
      .notNull()
      .references(() => show_times.id, { onDelete: 'cascade' }),
    seatId: varchar('seat_id', { length: 36 })
      .notNull()
      .references(() => seats.id, { onDelete: 'restrict' }),
    unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    pk: primaryKey({
      columns: [t.showtimeId, t.seatId],
      name: 'pk_booking_seat',
    }),
    idxBooking: index('idx_bookingSeat_booking').on(t.bookingId),
    idxSeat: index('idx_bookingSeat_seat').on(t.seatId),
  }),
);

/** BOOKING_SEAT_HOLDS — tạm giữ ghế trong thời gian ngắn */
export const bookingSeatHolds = mysqlTable(
  'booking_seat_holds',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`(uuid())`),

    bookingId: varchar('booking_id', { length: 36 })
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),

    showtimeId: varchar('showtime_id', { length: 36 })
      .notNull()
      .references(() => show_times.id, { onDelete: 'cascade' }),

    seatId: varchar('seat_id', { length: 36 })
      .notNull()
      .references(() => seats.id, { onDelete: 'restrict' }),

    expiresAt: datetime('expires_at').notNull(),

    createdAt: datetime('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    // mỗi suất chiếu, 1 ghế chỉ có 1 hold sống tại một thời điểm
    uqLive: uniqueIndex('uq_hold_live').on(t.showtimeId, t.seatId),
    idxExpires: index('idx_hold_expires').on(t.expiresAt),
    idxBooking: index('idx_hold_booking').on(t.bookingId),
  }),
);

/** PAYMENTS — chi tiết thanh toán 1:n với bookings */
export const payments = mysqlTable(
  'payments',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`(uuid())`),
    bookingId: varchar('booking_id', { length: 36 })
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('VND'),
    method: varchar('method', { length: 50 }),
    status: mysqlEnum(
      'status',
      Object.values(PAYMENT_STATUS) as [string, ...string[]],
    )
      .notNull()
      .default(PAYMENT_STATUS.PENDING),
    transactionId: varchar('transaction_id', { length: 100 }),
    gatewayResponse: text('gateway_response'),
    processedAt: datetime('processed_at'),
    failedReason: text('failed_reason'),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
  },
  (t) => ({
    idxBooking: index('idx_payment_booking').on(t.bookingId),
    uqTx: uniqueIndex('uq_payment_tx').on(t.transactionId),
  }),
);

/** TICKETS — 1 vé / 1 ghế */
export const tickets = mysqlTable(
  'tickets',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`(uuid())`),

    bookingId: varchar('booking_id', { length: 36 })
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    showtimeId: varchar('showtime_id', { length: 36 })
      .notNull()
      .references(() => show_times.id, { onDelete: 'cascade' }),
    seatId: varchar('seat_id', { length: 36 })
      .notNull()
      .references(() => seats.id, { onDelete: 'restrict' }),

    status: mysqlEnum(
      'status',
      Object.values(TICKET_STATUS) as [string, ...string[]],
    )
      .notNull()
      .default(TICKET_STATUS.ISSUED),

    qrToken: varchar('qr_token', { length: 64 }).notNull(), // UNIQUE token
    issuedAt: datetime('issued_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    checkedInAt: datetime('checked_in_at'),
    checkedInGate: varchar('checked_in_gate', { length: 50 }),
    reissuedFromId: varchar('reissued_from_id', { length: 36 }),
    version: int('version').notNull().default(1),

    createdAt: datetime('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
  },
  (t) => ({
    uqshow_timeseat: uniqueIndex('uq_ticket_showtime_seat').on(
      t.showtimeId,
      t.seatId,
    ),
    uqBookingSeatShowtime: uniqueIndex('uq_ticket_booking_seat_showtime').on(
      t.bookingId,
      t.showtimeId,
      t.seatId,
    ),
    uqQr: uniqueIndex('uq_ticket_qr').on(t.qrToken),
    idxBooking: index('idx_ticket_booking').on(t.bookingId),
  }),
);

/* =============
   RELATIONS
   ============= */

export const cinemasRelations = relations(cinemas, ({ many }) => ({
  rooms: many(rooms),
  show_times: many(show_times),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  cinema: one(cinemas, { fields: [rooms.cinemaId], references: [cinemas.id] }),
  seats: many(seats),
  show_times: many(show_times),
}));

export const seatsRelations = relations(seats, ({ one }) => ({
  room: one(rooms, { fields: [seats.roomId], references: [rooms.id] }),
}));

export const moviesRelations = relations(movies, ({ many }) => ({
  show_times: many(show_times),
}));

export const show_timesRelations = relations(show_times, ({ one, many }) => ({
  movie: one(movies, {
    fields: [show_times.movieId],
    references: [movies.id],
  }),
  cinema: one(cinemas, {
    fields: [show_times.cinemaId],
    references: [cinemas.id],
  }),
  room: one(rooms, { fields: [show_times.roomId], references: [rooms.id] }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
  showtime: one(show_times, {
    fields: [bookings.showtimeId],
    references: [show_times.id],
  }),
  seats: many(bookingSeats),
  payments: many(payments),
  tickets: many(tickets),
}));

export const bookingSeatsRelations = relations(bookingSeats, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingSeats.bookingId],
    references: [bookings.id],
  }),
  showtime: one(show_times, {
    fields: [bookingSeats.showtimeId],
    references: [show_times.id],
  }),
  seat: one(seats, { fields: [bookingSeats.seatId], references: [seats.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  booking: one(bookings, {
    fields: [tickets.bookingId],
    references: [bookings.id],
  }),
  showtime: one(show_times, {
    fields: [tickets.showtimeId],
    references: [show_times.id],
  }),
  seat: one(seats, { fields: [tickets.seatId], references: [seats.id] }),
}));

/* =============
   TYPES
   ============= */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Movie = typeof movies.$inferSelect;
export type NewMovie = typeof movies.$inferInsert;

export type Cinema = typeof cinemas.$inferSelect;
export type NewCinema = typeof cinemas.$inferInsert;

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;

export type Seat = typeof seats.$inferSelect;
export type NewSeat = typeof seats.$inferInsert;

export type Showtime = typeof show_times.$inferSelect;
export type NewShowtime = typeof show_times.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

export type BookingSeat = typeof bookingSeats.$inferSelect;
export type NewBookingSeat = typeof bookingSeats.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
