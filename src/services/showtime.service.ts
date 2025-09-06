import { randomUUID } from 'crypto';
import { asc, and, count, eq, gte, lte, SQL } from 'drizzle-orm';
import { db } from '../db';
import { cinemas, movies, rooms, showtimes } from '../db/schema';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../utils/errors/base';

export type CreateShowtimeInput = {
  movieId: string;
  cinemaId: string;
  roomId?: string;
  startsAt: Date;
  price: string;
  isActive?: boolean;
};

export type UpdateShowtimeInput = {
  movieId?: string;
  cinemaId?: string;
  roomId?: string;
  startsAt?: Date;
  price?: string;
  isActive?: boolean;
};

export type ShowtimeFilters = {
  cinemaId?: string;
  movieId?: string;
  roomId?: string;
  from?: Date;
  to?: Date;
  isActive?: boolean;
};

export type ShowtimeListItem = {
  id: string;
  movieId: string;
  cinemaId: string;
  roomId: string;
  startsAt: Date;
  price: string;
  totalSeats: number;
  bookedSeats: number;
  isActive: boolean;
};

/* ---------------- helpers ---------------- */

// async function assertExists() {
//   // no-op; chỉ để bạn tiện đặt breakpoint nếu cần
// }

async function ensureMovie(movieId: string): Promise<void> {
  const [m] = await db
    .select({ id: movies.id })
    .from(movies)
    .where(eq(movies.id, movieId))
    .limit(1);
  if (!m) throw new NotFoundError('Movie not found');
}

async function ensureCinema(cinemaId: string): Promise<void> {
  const [c] = await db
    .select({ id: cinemas.id })
    .from(cinemas)
    .where(eq(cinemas.id, cinemaId))
    .limit(1);
  if (!c) throw new NotFoundError('Cinema not found');
}

/** Lấy hoặc tạo Room 1 cho một rạp (compat khi bạn chưa có Rooms module) */
export async function ensureDefaultRoom(cinemaId: string): Promise<string> {
  const [r] = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(and(eq(rooms.cinemaId, cinemaId), eq(rooms.name, 'Room 1')))
    .limit(1);
  if (r?.id) return r.id;

  const id = randomUUID();
  await db.insert(rooms).values({
    id,
    cinemaId,
    name: 'Room 1',
    capacity: 0,
    isActive: true,
  });
  return id;
}

function toWhere(filters?: ShowtimeFilters): SQL<unknown> | undefined {
  const clauses: SQL<unknown>[] = [];
  if (!filters) return undefined;
  if (filters.cinemaId) clauses.push(eq(showtimes.cinemaId, filters.cinemaId));
  if (filters.movieId) clauses.push(eq(showtimes.movieId, filters.movieId));
  if (filters.roomId) clauses.push(eq(showtimes.roomId, filters.roomId));
  if (filters.isActive !== undefined)
    clauses.push(eq(showtimes.isActive, filters.isActive));
  if (filters.from) clauses.push(gte(showtimes.startsAt, filters.from));
  if (filters.to) clauses.push(lte(showtimes.startsAt, filters.to));
  return clauses.length ? and(...clauses) : undefined;
}

/* ---------------- services ---------------- */

export async function create(
  input: CreateShowtimeInput,
): Promise<ShowtimeListItem> {
  if (
    !(input as { startsAt: Date }).startsAt ||
    Number.isNaN(+input.startsAt)
  ) {
    throw new ValidationError('startsAt is invalid');
  }
  await ensureMovie(input.movieId);
  await ensureCinema(input.cinemaId);

  const roomId = input.roomId || (await ensureDefaultRoom(input.cinemaId));

  // unique theo (room_id, starts_at)
  const [dup] = await db
    .select({ id: showtimes.id })
    .from(showtimes)
    .where(
      and(eq(showtimes.roomId, roomId), eq(showtimes.startsAt, input.startsAt)),
    )
    .limit(1);
  if (dup)
    throw new ConflictError('Showtime already exists for this room & time');

  const id = randomUUID();
  await db.insert(showtimes).values({
    id,
    movieId: input.movieId,
    cinemaId: input.cinemaId,
    roomId,
    startsAt: input.startsAt,
    price: input.price,
    totalSeats: 0,
    bookedSeats: 0,
    isActive: input.isActive ?? true,
  });

  return getById(id);
}

export async function list(
  page = 1,
  pageSize = 20,
  filters?: ShowtimeFilters,
): Promise<{ items: ShowtimeListItem[]; total: number }> {
  const where = toWhere(filters);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: showtimes.id,
      movieId: showtimes.movieId,
      cinemaId: showtimes.cinemaId,
      // roomId: showtimes.roomId,
      // startsAt: showtimes.startsAt,
      // price: showtimes.price,
      // totalSeats: showtimes.totalSeats,
      // bookedSeats: showtimes.bookedSeats,
      isActive: showtimes.isActive,
    })
    .from(showtimes)
    .where(where)
    .orderBy(asc(showtimes.startsAt))
    .limit(pageSize)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(showtimes)
    .where(where);

  // cast gọn (Drizzle đã gợi ý đúng kiểu sẵn)
  return { items: rows as ShowtimeListItem[], total: Number(total) };
}

export async function getById(id: string): Promise<ShowtimeListItem> {
  const [r] = await db
    .select({
      id: showtimes.id,
      movieId: showtimes.movieId,
      cinemaId: showtimes.cinemaId,
      roomId: showtimes.roomId,
      startsAt: showtimes.startsAt,
      price: showtimes.price,
      totalSeats: showtimes.totalSeats,
      bookedSeats: showtimes.bookedSeats,
      isActive: showtimes.isActive,
    })
    .from(showtimes)
    .where(eq(showtimes.id, id))
    .limit(1);

  if (!r) throw new NotFoundError('Showtime not found');
  return r as ShowtimeListItem;
}

export async function update(
  id: string,
  patch: UpdateShowtimeInput,
): Promise<ShowtimeListItem> {
  const [existing] = await db
    .select()
    .from(showtimes)
    .where(eq(showtimes.id, id))
    .limit(1);
  if (!existing) throw new NotFoundError('Showtime not found');

  const updates: Partial<typeof showtimes.$inferInsert> = {};

  if (patch.movieId) {
    await ensureMovie(patch.movieId);
    updates.movieId = patch.movieId;
  }
  if (patch.cinemaId) {
    await ensureCinema(patch.cinemaId);
    updates.cinemaId = patch.cinemaId;
  }
  if (patch.roomId) {
    // chỉ kiểm tra tồn tại; bạn có thể enforce cùng cinema nếu muốn
    const [r] = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(eq(rooms.id, patch.roomId))
      .limit(1);
    if (!r) throw new NotFoundError('Room not found');
    updates.roomId = patch.roomId;
  }
  if (patch.startsAt) {
    if (Number.isNaN(+patch.startsAt))
      throw new ValidationError('startsAt invalid');
    updates.startsAt = patch.startsAt;
  }
  if (typeof patch.price === 'string') updates.price = patch.price;
  if (typeof patch.isActive === 'boolean') updates.isActive = patch.isActive;

  if (Object.keys(updates).length === 0) return getById(id);

  // nếu đổi (roomId|startsAt) bạn có thể kiểm tra trùng lịch tại đây (optional)

  await db.update(showtimes).set(updates).where(eq(showtimes.id, id));
  return getById(id);
}

export async function toggleStatus(id: string): Promise<ShowtimeListItem> {
  const [r] = await db
    .select({ isActive: showtimes.isActive })
    .from(showtimes)
    .where(eq(showtimes.id, id))
    .limit(1);
  if (!r) throw new NotFoundError('Showtime not found');
  await db
    .update(showtimes)
    .set({ isActive: !r.isActive })
    .where(eq(showtimes.id, id));
  return getById(id);
}

export async function remove(id: string): Promise<{ id: string }> {
  // tuỳ bạn: có thể kiểm tra đã có booking hay chưa
  await db.delete(showtimes).where(eq(showtimes.id, id));
  return { id };
}
export async function getUpcoming(days = 7, page = 1, pageSize = 50) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + days);
  return list(page, pageSize, { from: start, to: end, isActive: true });
}
