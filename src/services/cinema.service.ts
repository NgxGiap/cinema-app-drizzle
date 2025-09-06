import { randomUUID } from 'crypto';
import { and, asc, count, eq, inArray, like, SQL } from 'drizzle-orm';
import { db } from '../db';
import { cinemas, rooms } from '../db/schema';
import { ConflictError, NotFoundError } from '../utils/errors/base';

export type CinemaListItem = {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  roomsCount: number;
  // seatsCount: number;
};

// tránh interface rỗng:
export type CinemaDetail = CinemaListItem;

export type CinemaFilters = {
  city?: string;
  isActive?: boolean;
  q?: string;
};

export type CreateCinemaInput = {
  name: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
};

export type UpdateCinemaInput = Partial<CreateCinemaInput>;

function whereFromFilters(filters?: CinemaFilters): SQL<unknown> | undefined {
  if (!filters) return undefined;
  const clauses: SQL<unknown>[] = [];
  if (filters.city) clauses.push(eq(cinemas.city, filters.city));
  if (typeof filters.isActive === 'boolean')
    clauses.push(eq(cinemas.isActive, filters.isActive));
  if (filters.q) clauses.push(like(cinemas.name, `%${filters.q}%`));
  return clauses.length ? and(...clauses) : undefined;
}

export async function list(
  page = 1,
  pageSize = 20,
  filters?: CinemaFilters,
): Promise<{ items: CinemaListItem[]; total: number }> {
  const where = whereFromFilters(filters);
  const offset = (page - 1) * pageSize;

  // Lấy danh sách rạp (không kèm count)
  const baseRows = await db
    .select({
      id: cinemas.id,
      name: cinemas.name,
      address: cinemas.address,
      city: cinemas.city,
      phone: cinemas.phone,
      email: cinemas.email,
      isActive: cinemas.isActive,
    })
    .from(cinemas)
    .where(where)
    .orderBy(asc(cinemas.name))
    .limit(pageSize)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(cinemas)
    .where(where);

  // Nếu không có rạp thì trả sớm
  if (baseRows.length === 0) {
    return {
      items: [],
      total: Number(total),
    };
  }

  const ids = baseRows.map((r) => r.id);

  // Đếm số phòng theo cinemaId
  const roomCountsRows = await db
    .select({ cinemaId: rooms.cinemaId, cnt: count() })
    .from(rooms)
    .where(inArray(rooms.cinemaId, ids))
    .groupBy(rooms.cinemaId);

  const roomCounts: Record<string, number> = {};
  for (const r of roomCountsRows) roomCounts[r.cinemaId] = Number(r.cnt);

  // Đếm số ghế theo cinemaId: join rooms → seats, group by cinemaId
  // const seatCountsRows = await db
  //   .select({ cinemaId: rooms.cinemaId, cnt: count() })
  //   .from(rooms)
  //   .leftJoin(seats, eq(seats.roomId, rooms.id))
  //   .where(inArray(rooms.cinemaId, ids))
  //   .groupBy(rooms.cinemaId);

  // const seatCounts: Record<string, number> = {};
  // for (const r of seatCountsRows) seatCounts[r.cinemaId] = Number(r.cnt);

  const items: CinemaListItem[] = baseRows.map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    city: r.city,
    phone: r.phone ?? null,
    email: r.email ?? null,
    isActive: r.isActive,
    roomsCount: roomCounts[r.id] ?? 0,
    // seatsCount: seatCounts[r.id] ?? 0,
  }));

  return { items, total: Number(total) };
}

export async function getById(id: string): Promise<CinemaDetail> {
  const [c] = await db
    .select({
      id: cinemas.id,
      name: cinemas.name,
      address: cinemas.address,
      city: cinemas.city,
      phone: cinemas.phone,
      email: cinemas.email,
      isActive: cinemas.isActive,
    })
    .from(cinemas)
    .where(eq(cinemas.id, id))
    .limit(1);

  if (!c) throw new NotFoundError('Cinema not found');

  const [{ rc }] = await db
    .select({ rc: count() })
    .from(rooms)
    .where(eq(rooms.cinemaId, id));

  // const [{ sc }] = await db
  //   .select({ sc: count() })
  //   .from(rooms)
  //   .leftJoin(seats, eq(seats.roomId, rooms.id))
  //   .where(eq(rooms.cinemaId, id));

  return {
    id: c.id,
    name: c.name,
    address: c.address,
    city: c.city,
    phone: c.phone ?? null,
    email: c.email ?? null,
    isActive: c.isActive,
    roomsCount: Number(rc),
    // seatsCount: Number(sc),
  };
}

/** unique name + city (tuỳ policy, bạn có thể bỏ) */
async function assertUniqueNameInCity(
  name: string,
  city: string,
  excludeId?: string,
) {
  const q = db
    .select({ id: cinemas.id })
    .from(cinemas)
    .where(and(eq(cinemas.name, name), eq(cinemas.city, city)));
  const rows = await q;
  const dup = rows.find((r) => r.id !== excludeId);
  if (dup) throw new ConflictError('Cinema name already exists in this city');
}

export async function create(input: CreateCinemaInput): Promise<CinemaDetail> {
  await assertUniqueNameInCity(input.name, input.city);

  const id = randomUUID();
  await db.insert(cinemas).values({
    id,
    name: input.name,
    address: input.address,
    city: input.city,
    phone: input.phone ?? null,
    email: input.email ?? null,
    isActive: typeof input.isActive === 'boolean' ? input.isActive : true,
  });

  return getById(id);
}

export async function update(
  id: string,
  patch: UpdateCinemaInput,
): Promise<CinemaDetail> {
  const [existing] = await db
    .select()
    .from(cinemas)
    .where(eq(cinemas.id, id))
    .limit(1);
  if (!existing) throw new NotFoundError('Cinema not found');

  const nextName = patch.name ?? existing.name;
  const nextCity = patch.city ?? existing.city;
  if (nextName !== existing.name || nextCity !== existing.city) {
    await assertUniqueNameInCity(nextName, nextCity, id);
  }

  const data: Partial<typeof cinemas.$inferInsert> = {};
  if (typeof patch.name === 'string') data.name = patch.name;
  if (typeof patch.address === 'string') data.address = patch.address;
  if (typeof patch.city === 'string') data.city = patch.city;
  if (typeof patch.phone === 'string') data.phone = patch.phone;
  if (typeof patch.email === 'string') data.email = patch.email;
  if (typeof patch.isActive === 'boolean') data.isActive = patch.isActive;

  if (Object.keys(data).length > 0) {
    await db.update(cinemas).set(data).where(eq(cinemas.id, id));
  }
  return getById(id); // ✅ trả detail
}

// toggleStatus: Promise<CinemaDetail>
export async function toggleStatus(id: string): Promise<CinemaDetail> {
  const [row] = await db
    .select({ isActive: cinemas.isActive })
    .from(cinemas)
    .where(eq(cinemas.id, id))
    .limit(1);
  if (!row) throw new NotFoundError('Cinema not found');
  await db
    .update(cinemas)
    .set({ isActive: !row.isActive })
    .where(eq(cinemas.id, id));
  return getById(id); // ✅ trả detail
}

// remove: Promise<{ id: string }>
export async function remove(id: string): Promise<{ id: string }> {
  await db.delete(cinemas).where(eq(cinemas.id, id));
  return { id }; // ✅ trả id
}

export async function getCitiesList(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ city: cinemas.city })
    .from(cinemas)
    .where(eq(cinemas.isActive, true));
  return rows.map((r) => r.city);
}
