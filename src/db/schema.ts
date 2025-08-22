import { sql } from 'drizzle-orm';
import {
  mysqlTable,
  varchar,
  datetime,
  text,
  int,
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Movie = typeof movies.$inferSelect;
export type NewMovie = typeof movies.$inferInsert;
