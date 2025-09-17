import { randomUUID } from 'crypto';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { cinemas, rooms, seats } from '../db/schema';
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
};

export type CinemaDetail = CinemaListItem & {
  rooms: { id: string; name: string; capacity: number; isActive: boolean }[];
};

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

export async function list(
  page: number,
  pageSize: number,
  filters?: CinemaFilters,
): Promise<{ items: CinemaListItem[]; total: number }> {
  const where = and(
    filters?.city ? eq(cinemas.city, filters.city) : undefined,
    typeof filters?.isActive === 'boolean'
      ? eq(cinemas.isActive, filters.isActive)
      : undefined,
    filters?.q
      ? sql`(${cinemas.name} LIKE ${'%' + filters.q + '%'})`
      : undefined,
  );

  const rows = await db
    .select({
      id: cinemas.id,
      name: cinemas.name,
      city: cinemas.city,
      address: cinemas.address,
      phone: cinemas.phone,
      email: cinemas.email,
      isActive: cinemas.isActive,
      roomsCount: sql<number>`COUNT(DISTINCT ${rooms.id})`,
    })
    .from(cinemas)
    .leftJoin(rooms, eq(rooms.cinemaId, cinemas.id))
    .leftJoin(seats, eq(seats.roomId, rooms.id))
    .where(where)
    .groupBy(cinemas.id)
    .orderBy(asc(cinemas.name))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ total }] = await db
    .select({ total: count() })
    .from(cinemas)
    .where(where);

  const items: CinemaListItem[] = rows.map((r) => ({
    ...r,
    roomsCount: Number(r.roomsCount),
  }));

  return { items, total: Number(total) };
}

export async function getById(id: string): Promise<CinemaDetail> {
  const [base] = await db
    .select({
      id: cinemas.id,
      name: cinemas.name,
      city: cinemas.city,
      address: cinemas.address,
      phone: cinemas.phone,
      email: cinemas.email,
      isActive: cinemas.isActive,
    })
    .from(cinemas)
    .where(eq(cinemas.id, id))
    .limit(1);

  if (!base) throw new NotFoundError('Cinema not found');

  const rs = await db
    .select({
      id: rooms.id,
      name: rooms.name,
      capacity: rooms.capacity,
      isActive: rooms.isActive,
    })
    .from(rooms)
    .where(eq(rooms.cinemaId, id))
    .orderBy(asc(rooms.name));

  const roomsCount = rs.length;

  return {
    ...base,
    roomsCount,
    rooms: rs.map((r) => ({ ...r, capacity: Number(r.capacity ?? 0) })),
  };
}

async function assertUniqueNameInCity(
  name: string,
  city: string,
  excludeId?: string,
) {
  const rows = await db
    .select({ id: cinemas.id })
    .from(cinemas)
    .where(and(eq(cinemas.name, name), eq(cinemas.city, city)));

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
    isActive: input.isActive ?? true,
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
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.address !== undefined) data.address = patch.address;
  if (patch.city !== undefined) data.city = patch.city;
  if (patch.phone !== undefined) data.phone = patch.phone;
  if (patch.email !== undefined) data.email = patch.email;
  if (patch.isActive !== undefined) data.isActive = patch.isActive;

  if (Object.keys(data).length > 0) {
    await db.update(cinemas).set(data).where(eq(cinemas.id, id));
  }

  return getById(id);
}

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

  return getById(id);
}

export async function remove(id: string): Promise<{ id: string }> {
  await db.delete(cinemas).where(eq(cinemas.id, id));
  return { id };
}

export async function getCitiesList(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ city: cinemas.city })
    .from(cinemas)
    .where(eq(cinemas.isActive, true));

  return rows.map((r) => r.city);
}
