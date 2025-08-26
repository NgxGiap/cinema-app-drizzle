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

// Relations
export const cinemasRelations = relations(cinemas, ({ many }) => ({
  seats: many(seats),
  showtimes: many(showtimes),
}));

export const seatsRelations = relations(seats, ({ one }) => ({
  cinema: one(cinemas, {
    fields: [seats.cinemaId],
    references: [cinemas.id],
  }),
}));

export const showtimesRelations = relations(showtimes, ({ one }) => ({
  movie: one(movies, {
    fields: [showtimes.movieId],
    references: [movies.id],
  }),
  cinema: one(cinemas, {
    fields: [showtimes.cinemaId],
    references: [cinemas.id],
  }),
}));

export const moviesRelations = relations(movies, ({ many }) => ({
  showtimes: many(showtimes),
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
