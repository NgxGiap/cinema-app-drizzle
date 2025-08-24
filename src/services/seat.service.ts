import { and, eq, like, sql, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { seats } from '../db/schema.js';
import crypto from 'crypto';

export type SeatRow = typeof seats.$inferSelect;

export type NewSeat = Omit<
  typeof seats.$inferInsert,
  'id' | 'createdAt' | 'updatedAt'
>;

export type SeatFilters = {
  cinemaId?: string;
  type?: 'regular' | 'vip' | 'couple' | 'disabled';
  row?: string;
  isActive?: boolean;
};

function buildWhere(filters?: SeatFilters): SQL<unknown> | undefined {
  if (!filters) return undefined;
  const conds: SQL<unknown>[] = [];

  if (filters.cinemaId) conds.push(eq(seats.cinemaId, filters.cinemaId));
  if (filters.type) conds.push(eq(seats.type, filters.type));
  if (filters.row) conds.push(like(seats.row, `%${filters.row}%`));
  if (typeof filters.isActive === 'boolean')
    conds.push(eq(seats.isActive, filters.isActive));

  return conds.length ? and(...conds) : undefined;
}

export async function list(
  page: number,
  pageSize: number,
  filters?: SeatFilters,
): Promise<{ items: SeatRow[]; total: number }> {
  const where = buildWhere(filters);

  const totalQ = db.select({ total: sql<number>`COUNT(*)` }).from(seats);
  const [{ total }] = where ? await totalQ.where(where) : await totalQ;

  const dataQ = db
    .select()
    .from(seats)
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const items = where ? await dataQ.where(where) : await dataQ;

  return { items, total };
}

export async function createOne(input: NewSeat) {
  const id = crypto.randomUUID(); // ✅ tự sinh id để trả về
  const values: typeof seats.$inferInsert = {
    id,
    cinemaId: input.cinemaId,
    seatNumber: input.seatNumber,
    row: input.row,
    column: input.column,
    type: input.type ?? 'regular',
    price: String(input.price), // ✅ schema hiện price là string
    isActive: typeof input.isActive === 'boolean' ? input.isActive : true,
  };

  await db.insert(seats).values(values);
  // Có thể select lại nếu cần chắc chắn
  const [row] = await db.select().from(seats).where(eq(seats.id, id)).limit(1);
  return row ?? { id, ...values };
}

export async function bulkCreate(inputs: NewSeat[]) {
  if (inputs.length === 0) return { inserted: 0 };

  const values = inputs.map<typeof seats.$inferInsert>((s) => ({
    id: crypto.randomUUID(),
    cinemaId: s.cinemaId,
    seatNumber: s.seatNumber,
    row: s.row,
    column: s.column,
    type: s.type ?? 'regular',
    price: String(s.price),
    isActive: typeof s.isActive === 'boolean' ? s.isActive : true,
  }));

  await db.insert(seats).values(values);
  return { inserted: values.length };
}

export async function getById(id: string) {
  const [row] = await db.select().from(seats).where(eq(seats.id, id)).limit(1);
  return row ?? null;
}

export async function updateById(
  id: string,
  patch: Partial<{
    seatNumber: string;
    row: string;
    column: number;
    type: 'regular' | 'vip' | 'couple' | 'disabled';
    price: string; // ✅ giữ string
    isActive: boolean;
  }>,
) {
  const res = await db.update(seats).set(patch).where(eq(seats.id, id));
  const updated =
    (res as unknown as { rowsAffected?: number }).rowsAffected ?? 0;
  return { updated };
}

export async function removeById(id: string) {
  const res = await db.delete(seats).where(eq(seats.id, id));
  const deleted =
    (res as unknown as { rowsAffected?: number }).rowsAffected ?? 0;
  return { deleted };
}
