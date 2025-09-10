import { randomUUID } from 'crypto';
import { asc, and, count, eq, gte, lte, SQL } from 'drizzle-orm';
import { db } from '../db';
import { cinemas, movies, rooms, seats, show_times } from '../db/schema';
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
  q?: string;
};

export type ShowtimeListItem = {
  id: string;
  startsAt: Date;
  price: string; // luôn string (decimal)
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  isActive: boolean;
  movie: {
    id: string;
    slug: string;
    title: string;
    posterUrl: string | null;
    state: (typeof movies.$inferSelect)['state'];
    runtimeMinutes: number;
    ratingCode: string | null;
  };
  cinema: {
    id: string;
    name: string;
    city: string | null;
    address: string | null;
  };
  room: {
    id: string;
    name: string;
  };
};

function mapRow(r: {
  id: string;
  startsAt: Date;
  price: string | number;
  totalSeats: number | string | bigint;
  bookedSeats: number | string | bigint;
  isActive: boolean;

  movie: {
    id: string;
    slug: string;
    title: string;
    posterUrl: string | null;
    state: (typeof movies.$inferSelect)['state'];
    runtimeMinutes: number;
    ratingCode: string | null;
  } | null;

  cinema: {
    id: string;
    name: string;
    city: string | null;
    address: string | null;
  } | null;

  room: { id: string; name: string } | null;
}): ShowtimeListItem {
  const total = Number(r.totalSeats ?? 0);
  const booked = Number(r.bookedSeats ?? 0);
  return {
    id: r.id,
    startsAt: r.startsAt,
    price: String(r.price),
    totalSeats: total,
    bookedSeats: booked,
    availableSeats: Math.max(0, total - booked),
    isActive: r.isActive,
    movie: {
      id: r.movie?.id ?? '',
      slug: r.movie?.slug ?? '',
      title: r.movie?.title ?? '',
      posterUrl: r.movie?.posterUrl ?? null,
      state: r.movie?.state ?? 'COMING_SOON',
      runtimeMinutes: r.movie?.runtimeMinutes ?? 0,
      ratingCode: r.movie?.ratingCode ?? null,
    },
    cinema: {
      id: r.cinema?.id ?? '',
      name: r.cinema?.name ?? '',
      city: r.cinema?.city ?? null,
      address: r.cinema?.address ?? null,
    },
    room: {
      id: r.room?.id ?? '',
      name: r.room?.name ?? '',
    },
  };
}

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
  if (filters.cinemaId) clauses.push(eq(show_times.cinemaId, filters.cinemaId));
  if (filters.movieId) clauses.push(eq(show_times.movieId, filters.movieId));
  if (filters.roomId) clauses.push(eq(show_times.roomId, filters.roomId));
  if (filters.isActive !== undefined)
    clauses.push(eq(show_times.isActive, filters.isActive));
  if (filters.from) clauses.push(gte(show_times.startsAt, filters.from));
  if (filters.to) clauses.push(lte(show_times.startsAt, filters.to));
  return clauses.length ? and(...clauses) : undefined;
}

/* ---------------- services ---------------- */

export async function create(
  input: CreateShowtimeInput,
): Promise<ShowtimeListItem> {
  // Chuẩn hoá & validate startsAt
  const startsAt =
    input.startsAt instanceof Date ? input.startsAt : new Date(input.startsAt);
  if (Number.isNaN(+startsAt)) {
    throw new ValidationError('startsAt is invalid');
  }

  await ensureMovie(input.movieId);
  await ensureCinema(input.cinemaId);

  const roomId = input.roomId || (await ensureDefaultRoom(input.cinemaId));

  // TRẢ VỀ id từ transaction, để đảm bảo đã commit trước khi gọi getById
  const newId = await db.transaction(async (tx) => {
    // unique (room_id, starts_at)
    const [dup] = await tx
      .select({ id: show_times.id })
      .from(show_times)
      .where(
        and(eq(show_times.roomId, roomId), eq(show_times.startsAt, startsAt)),
      )
      .limit(1);
    if (dup)
      throw new ConflictError('Showtime already exists for this room & time');

    // tổng ghế active của room
    const [{ total }] = await tx
      .select({ total: count() })
      .from(seats)
      .where(and(eq(seats.roomId, roomId), eq(seats.isActive, true)));
    const totalSeats = Number(total);
    if (totalSeats === 0) {
      throw new ValidationError(
        'Room has no active seats to schedule a showtime',
      );
    }

    const id = randomUUID();
    await tx.insert(show_times).values({
      id,
      movieId: input.movieId,
      cinemaId: input.cinemaId,
      roomId,
      startsAt,
      price: input.price,
      totalSeats,
      bookedSeats: 0,
      isActive: input.isActive ?? true,
    });

    return id;
  });
  return getById(newId);
}

// ====== REPLACE: list() ======
export async function list(
  page = 1,
  pageSize = 20,
  filters?: ShowtimeFilters,
): Promise<{ items: ShowtimeListItem[]; total: number }> {
  const where = toWhere(filters);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: show_times.id,
      startsAt: show_times.startsAt,
      price: show_times.price,
      totalSeats: show_times.totalSeats,
      bookedSeats: show_times.bookedSeats,
      isActive: show_times.isActive,

      movie: {
        id: movies.id,
        slug: movies.slug,
        title: movies.title,
        posterUrl: movies.posterUrl,
        state: movies.state,
        runtimeMinutes: movies.runtimeMinutes,
        ratingCode: movies.ratingCode,
      },
      cinema: {
        id: cinemas.id,
        name: cinemas.name,
        city: cinemas.city,
        address: cinemas.address,
      },
      room: {
        id: rooms.id,
        name: rooms.name,
      },
    })
    .from(show_times)
    .leftJoin(movies, eq(movies.id, show_times.movieId))
    .leftJoin(cinemas, eq(cinemas.id, show_times.cinemaId))
    .leftJoin(rooms, eq(rooms.id, show_times.roomId))
    .where(where)
    .orderBy(asc(show_times.startsAt))
    .limit(pageSize)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(show_times)
    .where(where);

  return { items: rows.map(mapRow), total: Number(total) };
}

// ====== REPLACE (hoặc thêm mới): getById() trả nested ======
export async function getById(id: string): Promise<ShowtimeListItem> {
  const [r] = await db
    .select({
      id: show_times.id,
      startsAt: show_times.startsAt,
      price: show_times.price,
      totalSeats: show_times.totalSeats,
      bookedSeats: show_times.bookedSeats,
      isActive: show_times.isActive,

      movie: {
        id: movies.id,
        slug: movies.slug,
        title: movies.title,
        posterUrl: movies.posterUrl,
        state: movies.state,
        runtimeMinutes: movies.runtimeMinutes,
        ratingCode: movies.ratingCode,
      },
      cinema: {
        id: cinemas.id,
        name: cinemas.name,
        city: cinemas.city,
        address: cinemas.address,
      },
      room: {
        id: rooms.id,
        name: rooms.name,
      },
    })
    .from(show_times)
    .leftJoin(movies, eq(movies.id, show_times.movieId))
    .leftJoin(cinemas, eq(cinemas.id, show_times.cinemaId))
    .leftJoin(rooms, eq(rooms.id, show_times.roomId))
    .where(eq(show_times.id, id))
    .limit(1);

  if (!r) throw new NotFoundError('Showtime not found'); // nếu bạn đã có NotFoundError
  return mapRow(r);
}

export async function update(
  id: string,
  patch: UpdateShowtimeInput,
): Promise<ShowtimeListItem> {
  const [existing] = await db
    .select()
    .from(show_times)
    .where(eq(show_times.id, id))
    .limit(1);
  if (!existing) throw new NotFoundError('Showtime not found');

  const updates: Partial<typeof show_times.$inferInsert> = {};

  if (patch.movieId) {
    await ensureMovie(patch.movieId);
    updates.movieId = patch.movieId;
  }
  if (patch.cinemaId) {
    await ensureCinema(patch.cinemaId);
    updates.cinemaId = patch.cinemaId;
  }
  if (patch.roomId) {
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

  await db.update(show_times).set(updates).where(eq(show_times.id, id));
  return getById(id);
}

export async function toggleStatus(id: string): Promise<ShowtimeListItem> {
  const [r] = await db
    .select({ isActive: show_times.isActive })
    .from(show_times)
    .where(eq(show_times.id, id))
    .limit(1);
  if (!r) throw new NotFoundError('Showtime not found');
  await db
    .update(show_times)
    .set({ isActive: !r.isActive })
    .where(eq(show_times.id, id));
  return getById(id);
}

export async function remove(id: string): Promise<{ id: string }> {
  await db.delete(show_times).where(eq(show_times.id, id));
  return { id };
}
export async function getUpcoming(days = 7, page = 1, pageSize = 50) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + days);
  return list(page, pageSize, { from: start, to: end, isActive: true });
}
