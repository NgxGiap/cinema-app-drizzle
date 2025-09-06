import { randomUUID } from 'crypto';
import { and, asc, count, eq, inArray, like, SQL } from 'drizzle-orm';
import { db } from '../db';
import { rooms, seats } from '../db/schema';
import { ConflictError, NotFoundError } from '../utils/errors/base';

export type RoomListItem = {
  id: string;
  cinemaId: string;
  name: string;
  capacity: number;
  isActive: boolean;
  seatingMap: unknown | null;
  seatsCount: number;
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

function whereFromFilters(filters?: RoomFilters): SQL<unknown> | undefined {
  if (!filters) return undefined;
  const clauses: SQL<unknown>[] = [];
  if (filters.cinemaId) clauses.push(eq(rooms.cinemaId, filters.cinemaId));
  if (typeof filters.isActive === 'boolean')
    clauses.push(eq(rooms.isActive, filters.isActive));
  if (filters.q) clauses.push(like(rooms.name, `%${filters.q}%`));
  return clauses.length ? and(...clauses) : undefined;
}

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
  filters?: RoomFilters,
): Promise<{ items: RoomListItem[]; total: number }> {
  const where = whereFromFilters(filters);
  const offset = (page - 1) * pageSize;

  const baseRows = await db
    .select({
      id: rooms.id,
      cinemaId: rooms.cinemaId,
      name: rooms.name,
      capacity: rooms.capacity,
      isActive: rooms.isActive,
      seatingMap: rooms.seatingMap,
    })
    .from(rooms)
    .where(where)
    .orderBy(asc(rooms.name))
    .limit(pageSize)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(rooms)
    .where(where);

  if (baseRows.length === 0) {
    return { items: [], total: Number(total) };
  }

  const ids = baseRows.map((r) => r.id);
  const seatCountsRows = await db
    .select({ roomId: seats.roomId, cnt: count() })
    .from(seats)
    .where(inArray(seats.roomId, ids))
    .groupBy(seats.roomId);

  const seatCounts: Record<string, number> = {};
  for (const r of seatCountsRows) seatCounts[r.roomId] = Number(r.cnt);

  const items: RoomListItem[] = baseRows.map((r) => ({
    id: r.id,
    cinemaId: r.cinemaId,
    name: r.name,
    capacity: r.capacity ?? 0,
    isActive: r.isActive,
    seatingMap: r.seatingMap ?? null,
    seatsCount: seatCounts[r.id] ?? 0,
  }));

  return { items, total: Number(total) };
}

export async function getById(id: string): Promise<RoomListItem> {
  const [r] = await db
    .select({
      id: rooms.id,
      cinemaId: rooms.cinemaId,
      name: rooms.name,
      capacity: rooms.capacity,
      isActive: rooms.isActive,
      seatingMap: rooms.seatingMap,
    })
    .from(rooms)
    .where(eq(rooms.id, id))
    .limit(1);

  if (!r) throw new NotFoundError('Room not found');

  const [{ sc }] = await db
    .select({ sc: count() })
    .from(seats)
    .where(eq(seats.roomId, id));

  return {
    id: r.id,
    cinemaId: r.cinemaId,
    name: r.name,
    capacity: r.capacity ?? 0,
    isActive: r.isActive,
    seatingMap: r.seatingMap ?? null,
    seatsCount: Number(sc),
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
