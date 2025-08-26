import { randomUUID } from 'crypto';
import { and, eq, like, sql, count } from 'drizzle-orm';
import { db } from '../db';
import { seats, cinemas } from '../db/schema';
import { NotFoundError, ConflictError } from '../utils/errors/base';

export type SeatRow = typeof seats.$inferSelect;

export type NewSeat = {
  cinemaId: string;
  seatNumber: string;
  row: string;
  column: number;
  type?: 'regular' | 'vip' | 'couple' | 'disabled';
  price: string;
  isActive?: boolean;
};

export type SeatFilters = {
  cinemaId?: string;
  type?: 'regular' | 'vip' | 'couple' | 'disabled';
  row?: string;
  isActive?: boolean;
};

export async function list(
  page = 1,
  pageSize = 10,
  filters?: SeatFilters,
): Promise<{ items: SeatRow[]; total: number }> {
  const conditions = [];

  if (filters?.cinemaId) {
    conditions.push(eq(seats.cinemaId, filters.cinemaId));
  }
  if (filters?.type) {
    conditions.push(eq(seats.type, filters.type));
  }
  if (filters?.row) {
    conditions.push(like(seats.row, `%${filters.row}%`));
  }
  if (typeof filters?.isActive === 'boolean') {
    conditions.push(eq(seats.isActive, filters.isActive));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(seats)
      .where(whereClause)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(seats).where(whereClause),
  ]);

  return { items: rows, total: Number(total) };
}

export async function createOne(input: NewSeat) {
  // Validate cinema exists
  const [cinema] = await db
    .select()
    .from(cinemas)
    .where(eq(cinemas.id, input.cinemaId))
    .limit(1);

  if (!cinema) {
    throw new NotFoundError('Cinema not found');
  }

  // Check for duplicate seat in the same cinema
  const [existingSeat] = await db
    .select()
    .from(seats)
    .where(
      and(
        eq(seats.cinemaId, input.cinemaId),
        eq(seats.seatNumber, input.seatNumber),
      ),
    )
    .limit(1);

  if (existingSeat) {
    throw new ConflictError('Seat number already exists in this cinema');
  }

  // Check for duplicate position (row + column) in the same cinema
  const [existingPosition] = await db
    .select()
    .from(seats)
    .where(
      and(
        eq(seats.cinemaId, input.cinemaId),
        eq(seats.row, input.row),
        eq(seats.column, input.column),
      ),
    )
    .limit(1);

  if (existingPosition) {
    throw new ConflictError(
      'Seat position (row + column) already exists in this cinema',
    );
  }

  const id = randomUUID();
  const insertData = {
    id,
    cinemaId: input.cinemaId,
    seatNumber: input.seatNumber,
    row: input.row,
    column: input.column,
    type: input.type ?? 'regular',
    price: input.price,
    isActive: input.isActive ?? true,
  };

  await db.insert(seats).values(insertData);

  const [row] = await db.select().from(seats).where(eq(seats.id, id)).limit(1);

  if (!row) throw new Error('Failed to create seat');
  return row;
}

export async function bulkCreate(inputs: NewSeat[]) {
  if (inputs.length === 0) return { inserted: 0 };

  // Validate all cinemas exist
  const cinemaIds = [...new Set(inputs.map((s) => s.cinemaId))];
  for (const cinemaId of cinemaIds) {
    const [cinema] = await db
      .select()
      .from(cinemas)
      .where(eq(cinemas.id, cinemaId))
      .limit(1);

    if (!cinema) {
      throw new NotFoundError(`Cinema with ID ${cinemaId} not found`);
    }
  }

  // Check for duplicates within the input array
  const seatKeys = new Set();
  const positionKeys = new Set();

  for (const input of inputs) {
    const seatKey = `${input.cinemaId}-${input.seatNumber}`;
    const positionKey = `${input.cinemaId}-${input.row}-${input.column}`;

    if (seatKeys.has(seatKey)) {
      throw new ConflictError(
        `Duplicate seat number ${input.seatNumber} in cinema ${input.cinemaId}`,
      );
    }
    if (positionKeys.has(positionKey)) {
      throw new ConflictError(
        `Duplicate position ${input.row}-${input.column} in cinema ${input.cinemaId}`,
      );
    }

    seatKeys.add(seatKey);
    positionKeys.add(positionKey);
  }

  // Check for existing seats in database
  for (const input of inputs) {
    const [existingSeat] = await db
      .select()
      .from(seats)
      .where(
        and(
          eq(seats.cinemaId, input.cinemaId),
          eq(seats.seatNumber, input.seatNumber),
        ),
      )
      .limit(1);

    if (existingSeat) {
      throw new ConflictError(
        `Seat ${input.seatNumber} already exists in cinema ${input.cinemaId}`,
      );
    }
  }

  const values = inputs.map((s) => ({
    id: randomUUID(),
    cinemaId: s.cinemaId,
    seatNumber: s.seatNumber,
    row: s.row,
    column: s.column,
    type: s.type ?? ('regular' as const),
    price: s.price,
    isActive: s.isActive ?? true,
  }));

  await db.insert(seats).values(values);
  return { inserted: values.length };
}

export async function getById(id: string) {
  const [row] = await db.select().from(seats).where(eq(seats.id, id)).limit(1);

  if (!row) throw new NotFoundError('Seat not found');
  return row;
}

export async function updateById(
  id: string,
  patch: Partial<{
    seatNumber: string;
    row: string;
    column: number;
    type: 'regular' | 'vip' | 'couple' | 'disabled';
    price: string;
    isActive: boolean;
  }>,
) {
  const [existingSeat] = await db
    .select()
    .from(seats)
    .where(eq(seats.id, id))
    .limit(1);

  if (!existingSeat) throw new NotFoundError('Seat not found');

  // Check for conflicts if updating seat number, row, or column
  if (patch.seatNumber && patch.seatNumber !== existingSeat.seatNumber) {
    const [conflictSeat] = await db
      .select()
      .from(seats)
      .where(
        and(
          eq(seats.cinemaId, existingSeat.cinemaId),
          eq(seats.seatNumber, patch.seatNumber),
          sql`${seats.id} != ${id}`,
        ),
      )
      .limit(1);

    if (conflictSeat) {
      throw new ConflictError('Seat number already exists in this cinema');
    }
  }

  if (
    (patch.row && patch.row !== existingSeat.row) ||
    (patch.column && patch.column !== existingSeat.column)
  ) {
    const checkRow = patch.row ?? existingSeat.row;
    const checkColumn = patch.column ?? existingSeat.column;

    const [conflictPosition] = await db
      .select()
      .from(seats)
      .where(
        and(
          eq(seats.cinemaId, existingSeat.cinemaId),
          eq(seats.row, checkRow),
          eq(seats.column, checkColumn),
          sql`${seats.id} != ${id}`,
        ),
      )
      .limit(1);

    if (conflictPosition) {
      throw new ConflictError('Seat position already exists in this cinema');
    }
  }

  await db.update(seats).set(patch).where(eq(seats.id, id));

  const [updatedRow] = await db
    .select()
    .from(seats)
    .where(eq(seats.id, id))
    .limit(1);

  if (!updatedRow) throw new Error('Failed to update seat');
  return updatedRow;
}

export async function removeById(id: string) {
  const [existingSeat] = await db
    .select()
    .from(seats)
    .where(eq(seats.id, id))
    .limit(1);

  if (!existingSeat) throw new NotFoundError('Seat not found');

  await db.delete(seats).where(eq(seats.id, id));
  return true;
}
