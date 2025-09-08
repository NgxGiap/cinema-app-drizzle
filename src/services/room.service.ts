import { randomUUID } from 'crypto';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { cinemas, rooms, seats } from '../db/schema';
import { ConflictError, NotFoundError } from '../utils/errors/base';

export type RoomListItem = {
  id: string;
  name: string;
  capacity: number;
  isActive: boolean;
  cinema: { id: string; name: string } | null;
  seatsCount: number;
  activeSeats: number;
};

export type RoomFilters = {
  cinemaId?: string;
  isActive?: boolean;
  q?: string;
};

export type NewRoom = {
  cinemaId: string;
  name: string;
  capacity?: number;
  isActive?: boolean;
  seatingMap?: unknown;
};

export type UpdateRoom = Partial<NewRoom>;

async function assertUniqueNameInCinema(
  cinemaId: string,
  name: string,
  excludeId?: string,
) {
  const rows = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(and(eq(rooms.cinemaId, cinemaId), eq(rooms.name, name)));
  const dup = rows.find((r) => r.id !== excludeId);
  if (dup) throw new ConflictError('Room name already exists in this cinema');
}

export async function list(
  page = 1,
  pageSize = 20,
  filters?: { cinemaId?: string; isActive?: boolean; q?: string },
): Promise<{ items: RoomListItem[]; total: number }> {
  const where = filters?.cinemaId
    ? eq(rooms.cinemaId, filters.cinemaId)
    : undefined;

  const rows = await db
    .select({
      id: rooms.id,
      name: rooms.name,
      capacity: rooms.capacity,
      isActive: rooms.isActive,
      cinema: { id: cinemas.id, name: cinemas.name },
      seatsCount: sql<number>`COUNT(${seats.id})`,
      activeSeats: sql<number>`SUM(CASE WHEN ${seats.isActive} THEN 1 ELSE 0 END)`,
    })
    .from(rooms)
    .leftJoin(cinemas, eq(cinemas.id, rooms.cinemaId))
    .leftJoin(seats, eq(seats.roomId, rooms.id))
    .where(where)
    .groupBy(rooms.id, cinemas.id)
    .orderBy(asc(rooms.name))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ total }] = await db
    .select({ total: count() })
    .from(rooms)
    .where(where);
  const items: RoomListItem[] = rows.map((r) => ({
    ...r,
    capacity: Number(r.capacity ?? 0),
    seatsCount: Number(r.seatsCount ?? 0),
    activeSeats: Number(r.activeSeats ?? 0),
  }));
  return { items, total: Number(total) };
}

export async function getById(id: string): Promise<RoomListItem> {
  const [r] = await db
    .select({
      id: rooms.id,
      name: rooms.name,
      capacity: rooms.capacity,
      isActive: rooms.isActive,
      cinema: { id: cinemas.id, name: cinemas.name },
      seatsCount: sql<number>`COUNT(${seats.id})`,
      activeSeats: sql<number>`SUM(CASE WHEN ${seats.isActive} THEN 1 ELSE 0 END)`,
    })
    .from(rooms)
    .leftJoin(cinemas, eq(cinemas.id, rooms.cinemaId))
    .leftJoin(seats, eq(seats.roomId, rooms.id))
    .where(eq(rooms.id, id))
    .groupBy(rooms.id, cinemas.id)
    .limit(1);

  if (!r) throw new NotFoundError('Room not found');
  return {
    ...r,
    capacity: Number(r.capacity ?? 0),
    seatsCount: Number(r.seatsCount ?? 0),
    activeSeats: Number(r.activeSeats ?? 0),
  };
}

export async function create(input: NewRoom): Promise<RoomListItem> {
  await assertUniqueNameInCinema(input.cinemaId, input.name);

  const id = randomUUID();
  await db.insert(rooms).values({
    id,
    cinemaId: input.cinemaId,
    name: input.name,
    capacity: typeof input.capacity === 'number' ? input.capacity : 0,
    isActive: typeof input.isActive === 'boolean' ? input.isActive : true,
    seatingMap:
      typeof input.seatingMap !== 'undefined' ? input.seatingMap : null,
  });

  return getById(id);
}

export async function update(
  id: string,
  patch: UpdateRoom,
): Promise<RoomListItem> {
  const [existing] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, id))
    .limit(1);
  if (!existing) throw new NotFoundError('Room not found');

  const nextCinema = patch.cinemaId ?? existing.cinemaId;
  const nextName = patch.name ?? existing.name;
  if (nextCinema !== existing.cinemaId || nextName !== existing.name) {
    await assertUniqueNameInCinema(nextCinema, nextName, id);
  }

  const data: Partial<typeof rooms.$inferInsert> = {};
  if (typeof patch.cinemaId === 'string') data.cinemaId = patch.cinemaId;
  if (typeof patch.name === 'string') data.name = patch.name;
  if (typeof patch.capacity === 'number') data.capacity = patch.capacity;
  if (typeof patch.isActive === 'boolean') data.isActive = patch.isActive;
  if (typeof patch.seatingMap !== 'undefined')
    data.seatingMap = patch.seatingMap;

  if (Object.keys(data).length > 0) {
    await db.update(rooms).set(data).where(eq(rooms.id, id));
  }
  return getById(id);
}

export async function toggleStatus(id: string): Promise<RoomListItem> {
  const [r] = await db
    .select({ isActive: rooms.isActive })
    .from(rooms)
    .where(eq(rooms.id, id))
    .limit(1);
  if (!r) throw new NotFoundError('Room not found');
  await db.update(rooms).set({ isActive: !r.isActive }).where(eq(rooms.id, id));
  return getById(id);
}

export async function remove(id: string): Promise<{ id: string }> {
  await db.delete(rooms).where(eq(rooms.id, id));
  return { id };
}
