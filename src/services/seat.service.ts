import { randomUUID } from 'crypto';
import { and, count, eq, like, SQL } from 'drizzle-orm';
import { db } from '../db';
import { bookings, bookingSeats, rooms, seats } from '../db/schema';
import { NotFoundError, ConflictError } from '../utils/errors/base';

export type SeatType = 'REGULAR' | 'VIP' | 'COUPLE' | 'DISABLED';

export type SeatListItem = {
  id: string;
  seatNumber: string;
  row: string;
  column: number;
  type: SeatType;
  price: string;
  isActive: boolean;
  roomId: string;
};

export type SeatFilters = {
  roomId?: string;
  type?: SeatType | Lowercase<SeatType>;
  row?: string;
  isActive?: boolean;
  q?: string;
};

export type NewSeat = {
  roomId: string;
  seatNumber: string;
  row: string;
  column: number;
  type?: SeatType | Lowercase<SeatType>;
  price: string;
  isActive?: boolean;
};

export type UpdateSeat = Partial<Omit<NewSeat, 'roomId'>> & { roomId?: string };

export type SeatMapItem = {
  seatId: string;
  seatNumber: string;
  row: string;
  column: number;
  type: SeatType;
  status: 'available' | 'holding' | 'booked';
};

/* helpers */

function normalizeType(t?: string | null): SeatType | undefined {
  if (!t) return undefined;
  const up = t.toUpperCase();
  if (
    up === 'REGULAR' ||
    up === 'VIP' ||
    up === 'COUPLE' ||
    up === 'DISABLED'
  ) {
    return up as SeatType;
  }
  return undefined;
}

export type LayoutApplyMode = 'replace' | 'merge';

function makeRowLabels(rows: number, startFrom: string): string[] {
  // Excel-like: A..Z, AA..AZ, BA.. (đủ cho rạp)
  const labels: string[] = [];
  const startIndex = Math.max(
    0,
    (startFrom.toUpperCase().charCodeAt(0) || 65) - 65,
  );
  for (let i = 0; i < rows; i++) {
    labels.push(indexToLetters(startIndex + i));
  }
  return labels;
}
function indexToLetters(n: number): string {
  let s = '';
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

/* queries */

export async function list(
  page = 1,
  pageSize = 20,
  filters?: SeatFilters,
): Promise<{ items: SeatListItem[]; total: number }> {
  const predicates: SQL<unknown>[] = [];
  if (filters?.roomId) predicates.push(eq(seats.roomId, filters.roomId));
  if (filters?.row) predicates.push(eq(seats.row, filters.row));
  if (typeof filters?.isActive === 'boolean')
    predicates.push(eq(seats.isActive, filters.isActive));
  const normalizedType = normalizeType(filters?.type as string | undefined);
  if (normalizedType) predicates.push(eq(seats.type, normalizedType));
  if (filters?.q) predicates.push(like(seats.seatNumber, `%${filters.q}%`));

  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: seats.id,
      seatNumber: seats.seatNumber,
      row: seats.row,
      column: seats.column,
      type: seats.type,
      price: seats.price,
      isActive: seats.isActive,
      roomId: seats.roomId,
    })
    .from(seats)
    .where(predicates.length ? and(...predicates) : undefined)
    .limit(pageSize)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(seats)
    .where(predicates.length ? and(...predicates) : undefined);

  const items: SeatListItem[] = rows.map((r) => ({
    id: r.id,
    seatNumber: r.seatNumber,
    row: r.row,
    column: r.column,
    type: r.type as SeatType,
    price: String(r.price),
    isActive: r.isActive,
    roomId: r.roomId,
  }));

  return { items, total: Number(total) };
}

export async function getById(id: string): Promise<SeatListItem> {
  const [r] = await db
    .select({
      id: seats.id,
      seatNumber: seats.seatNumber,
      row: seats.row,
      column: seats.column,
      type: seats.type,
      price: seats.price,
      isActive: seats.isActive,
      roomId: seats.roomId,
    })
    .from(seats)
    .where(eq(seats.id, id))
    .limit(1);
  if (!r) throw new NotFoundError('Seat not found');

  return {
    id: r.id,
    seatNumber: r.seatNumber,
    row: r.row,
    column: r.column,
    type: r.type as SeatType,
    price: String(r.price),
    isActive: r.isActive,
    roomId: r.roomId,
  };
}

export async function create(input: NewSeat): Promise<SeatListItem> {
  const [room] = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(eq(rooms.id, input.roomId))
    .limit(1);
  if (!room) throw new NotFoundError('Room not found');

  const [dup] = await db
    .select({ id: seats.id })
    .from(seats)
    .where(
      and(
        eq(seats.roomId, input.roomId),
        eq(seats.seatNumber, input.seatNumber),
      ),
    )
    .limit(1);
  if (dup) throw new ConflictError('Seat number already exists in this room');

  const id = randomUUID();
  const type = normalizeType(input.type as string | undefined) ?? 'REGULAR';

  await db.insert(seats).values({
    id,
    roomId: input.roomId,
    seatNumber: input.seatNumber,
    row: input.row,
    column: input.column,
    type,
    price: input.price,
    isActive: input.isActive ?? true,
  });

  return getById(id);
}

export async function createMany(
  inputs: ReadonlyArray<NewSeat>,
): Promise<{ inserted: number }> {
  if (!inputs.length) return { inserted: 0 };

  const roomId = inputs[0].roomId;
  const [room] = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  if (!room) throw new NotFoundError('Room not found');

  const keys = new Set<string>();
  for (const s of inputs) {
    const k = `${s.roomId}:${s.seatNumber}`;
    if (keys.has(k))
      throw new ConflictError(`Duplicated seat in payload: ${s.seatNumber}`);
    keys.add(k);
  }

  const existed = await db
    .select({ seatNumber: seats.seatNumber })
    .from(seats)
    .where(eq(seats.roomId, roomId));
  const existSet = new Set(existed.map((x) => x.seatNumber));

  const conflicts = inputs.filter((x) => existSet.has(x.seatNumber));
  if (conflicts.length) {
    throw new ConflictError(
      `Seat(s) already exist: ${conflicts.map((c) => c.seatNumber).join(', ')}`,
    );
  }

  await db.insert(seats).values(
    inputs.map((s) => ({
      id: randomUUID(),
      roomId: s.roomId,
      seatNumber: s.seatNumber,
      row: s.row,
      column: s.column,
      type: normalizeType(s.type as string | undefined) ?? 'REGULAR',
      price: s.price,
      isActive: s.isActive ?? true,
    })),
  );

  return { inserted: inputs.length };
}

export async function updateById(
  id: string,
  patch: UpdateSeat,
): Promise<SeatListItem> {
  const [existing] = await db
    .select()
    .from(seats)
    .where(eq(seats.id, id))
    .limit(1);
  if (!existing) throw new NotFoundError('Seat not found');

  const nextRoomId = patch.roomId ?? existing.roomId;
  const nextSeatNumber = patch.seatNumber ?? existing.seatNumber;

  if (
    nextRoomId !== existing.roomId ||
    nextSeatNumber !== existing.seatNumber
  ) {
    const [dup] = await db
      .select({ id: seats.id })
      .from(seats)
      .where(
        and(eq(seats.roomId, nextRoomId), eq(seats.seatNumber, nextSeatNumber)),
      )
      .limit(1);
    if (dup) throw new ConflictError('Seat number already exists in this room');
  }

  const data: Partial<typeof seats.$inferInsert> = {};
  if (patch.roomId) data.roomId = patch.roomId;
  if (patch.seatNumber) data.seatNumber = patch.seatNumber;
  if (patch.row) data.row = patch.row;
  if (typeof patch.column === 'number') data.column = patch.column;
  if (typeof patch.price === 'string') data.price = patch.price;
  if (typeof patch.isActive === 'boolean') data.isActive = patch.isActive;
  const t = normalizeType(patch.type as string | undefined);
  if (t) data.type = t;

  if (Object.keys(data).length) {
    await db.update(seats).set(data).where(eq(seats.id, id));
  }
  return getById(id);
}

export async function removeById(id: string): Promise<{ id: string }> {
  const [existing] = await db
    .select()
    .from(seats)
    .where(eq(seats.id, id))
    .limit(1);
  if (!existing) throw new NotFoundError('Seat not found');
  await db.delete(seats).where(eq(seats.id, id));
  return { id };
}

export async function getSeatMapWithStatus(
  roomId: string,
  showtimeId: string,
): Promise<SeatMapItem[]> {
  const rows = await db
    .select({
      seatId: seats.id,
      seatNumber: seats.seatNumber,
      row: seats.row,
      column: seats.column,
      type: seats.type,
      bookingStatus: bookings.status,
      expiresAt: bookings.expiresAt,
    })
    .from(seats)
    .leftJoin(
      bookingSeats,
      and(
        eq(bookingSeats.showtimeId, showtimeId),
        eq(bookingSeats.seatId, seats.id),
      ),
    )
    .leftJoin(bookings, eq(bookings.id, bookingSeats.bookingId))
    .where(eq(seats.roomId, roomId));

  return rows.map<SeatMapItem>((r) => {
    const booked =
      r.bookingStatus === 'CONFIRMED' || r.bookingStatus === 'PAID';
    const holding =
      (r.bookingStatus === 'PENDING' ||
        r.bookingStatus === 'AWAITING_PAYMENT') &&
      (!r.expiresAt || r.expiresAt > new Date());

    return {
      seatId: r.seatId,
      seatNumber: r.seatNumber,
      row: r.row,
      column: r.column,
      type: r.type as SeatType,
      status: booked ? 'booked' : holding ? 'holding' : 'available',
    };
  });
}

export function buildSeatsFromLayout(
  roomId: string,
  layout: import('../types/seat-layout').SeatLayout,
): NewSeat[] {
  const out: NewSeat[] = [];
  const defaultType: SeatType = layout.defaultType ?? 'REGULAR';

  for (const block of layout.blocks) {
    const firstCol =
      block.firstColumn && block.firstColumn > 0 ? block.firstColumn : 1;
    const rowLabels =
      Array.isArray(block.rowLabels) && block.rowLabels.length === block.rows
        ? block.rowLabels
        : makeRowLabels(block.rows, block.rowStartFrom ?? 'A');

    const aisleCols = new Set<number>((block.aisles?.cols ?? []).map(Number));
    const aisleRows = new Set<number>((block.aisles?.rows ?? []).map(Number));
    const holeKey = new Set<string>(
      (block.holes ?? []).map((h) => `${h.row}:${h.col}`),
    );

    for (let r = 1; r <= block.rows; r++) {
      if (aisleRows.has(r)) continue;
      const rowLabel = rowLabels[r - 1];

      for (let c = 1; c <= block.cols; c++) {
        if (aisleCols.has(c)) continue;
        if (holeKey.has(`${r}:${c}`)) continue;

        const colNo = firstCol + (c - 1);
        const seatType: SeatType =
          (block.typeByRow && block.typeByRow[rowLabel]) ??
          (block.typeByCol && block.typeByCol[colNo]) ??
          defaultType;

        const price =
          (block.priceByType && block.priceByType[seatType]) ??
          layout.defaultPrice;

        out.push({
          roomId,
          seatNumber: `${rowLabel}${colNo}`,
          row: rowLabel,
          column: colNo,
          price,
          type: seatType,
          isActive: true,
        });
      }
    }
  }
  return out;
}

/** Xem trước (không ghi DB) */
export async function previewLayout(
  roomId: string,
  layout: import('../types/seat-layout').SeatLayout,
): Promise<NewSeat[]> {
  return buildSeatsFromLayout(roomId, layout);
}

/** Áp layout → ghi DB
 * mode:
 *  - 'replace': xóa tất ghế của room rồi insert mới
 *  - 'merge'  : chỉ insert những seatNumber chưa tồn tại (giữ nguyên ghế cũ)
 */
export async function applyLayout(
  roomId: string,
  layout: import('../types/seat-layout').SeatLayout,
  mode: LayoutApplyMode = 'replace',
): Promise<{ inserted: number }> {
  const seatsToInsert = buildSeatsFromLayout(roomId, layout);
  if (seatsToInsert.length === 0) return { inserted: 0 };

  await db.transaction(async (tx) => {
    if (mode === 'replace') {
      await tx.delete(seats).where(eq(seats.roomId, roomId));
    }

    // Lấy seatNumber đã tồn tại (khi merge)
    let filtered = seatsToInsert;
    if (mode === 'merge') {
      const existing = await tx
        .select({ seatNumber: seats.seatNumber })
        .from(seats)
        .where(eq(seats.roomId, roomId));
      const existSet = new Set(existing.map((x) => x.seatNumber));
      filtered = seatsToInsert.filter((s) => !existSet.has(s.seatNumber));
    }

    if (filtered.length > 0) {
      // batch insert
      await tx.insert(seats).values(filtered as (typeof seats.$inferInsert)[]);
    }
  });

  return { inserted: seatsToInsert.length };
}
