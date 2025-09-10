import { randomBytes, randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { seats, show_times, tickets } from '../db/schema';
import { ConflictError, NotFoundError } from '../utils/errors/base';

export type TicketStatus = 'ISSUED' | 'CHECKED_IN' | 'VOIDED' | 'REFUNDED';

export type TicketDetail = {
  id: string;
  bookingId: string;
  showtimeId: string;
  seatId: string;
  status: TicketStatus;
  qrToken: string;
  issuedAt: Date;
  checkedInAt: Date | null;
  checkedInGate: string | null;
  version: number;
  seatNumber: string;
  row: string;
  column: number;
};

export type ScanResult = {
  ticketId: string;
  status: Extract<TicketStatus, 'CHECKED_IN'>;
  firstScan: boolean;
  checkedInAt: Date;
  seatNumber: string;
  row: string;
  column: number;
};

export async function getById(id: string): Promise<TicketDetail> {
  const [r] = await db
    .select({
      id: tickets.id,
      bookingId: tickets.bookingId,
      showtimeId: tickets.showtimeId,
      seatId: tickets.seatId,
      status: tickets.status,
      qrToken: tickets.qrToken,
      issuedAt: tickets.issuedAt,
      checkedInAt: tickets.checkedInAt,
      checkedInGate: tickets.checkedInGate,
      version: tickets.version,
      seatNumber: seats.seatNumber,
      row: seats.row,
      column: seats.column,
    })
    .from(tickets)
    .innerJoin(seats, eq(seats.id, tickets.seatId))
    .where(eq(tickets.id, id))
    .limit(1);

  if (!r) throw new NotFoundError('Ticket not found');

  return {
    id: r.id,
    bookingId: r.bookingId,
    showtimeId: r.showtimeId,
    seatId: r.seatId,
    status: r.status as TicketStatus,
    qrToken: r.qrToken,
    issuedAt: r.issuedAt,
    checkedInAt: r.checkedInAt ?? null,
    checkedInGate: r.checkedInGate ?? null,
    version: r.version,
    seatNumber: r.seatNumber,
    row: r.row,
    column: r.column,
  };
}

export async function listByBooking(
  bookingId: string,
): Promise<TicketDetail[]> {
  const rows = await db
    .select({
      id: tickets.id,
      bookingId: tickets.bookingId,
      showtimeId: tickets.showtimeId,
      seatId: tickets.seatId,
      status: tickets.status,
      qrToken: tickets.qrToken,
      issuedAt: tickets.issuedAt,
      checkedInAt: tickets.checkedInAt,
      checkedInGate: tickets.checkedInGate,
      version: tickets.version,
      seatNumber: seats.seatNumber,
      row: seats.row,
      column: seats.column,
    })
    .from(tickets)
    .innerJoin(seats, eq(seats.id, tickets.seatId))
    .where(eq(tickets.bookingId, bookingId))
    .orderBy(desc(tickets.issuedAt));

  return rows.map((r) => ({
    id: r.id,
    bookingId: r.bookingId,
    showtimeId: r.showtimeId,
    seatId: r.seatId,
    status: r.status as TicketStatus,
    qrToken: r.qrToken,
    issuedAt: r.issuedAt,
    checkedInAt: r.checkedInAt ?? null,
    checkedInGate: r.checkedInGate ?? null,
    version: r.version,
    seatNumber: r.seatNumber,
    row: r.row,
    column: r.column,
  }));
}

/** Idempotent scan theo qrToken:
 *  - Nếu ISSUED  → chuyển CHECKED_IN và set thời gian/gate.
 *  - Nếu CHECKED_IN → trả về firstScan=false.
 *  - Nếu VOIDED/REFUNDED → báo lỗi.
 */
export async function scanByQrToken(
  qrToken: string,
  gate?: string,
): Promise<ScanResult> {
  const [t] = await db
    .select({
      id: tickets.id,
      bookingId: tickets.bookingId,
      showtimeId: tickets.showtimeId,
      seatId: tickets.seatId,
      status: tickets.status,
      checkedInAt: tickets.checkedInAt,
      seatNumber: seats.seatNumber,
      row: seats.row,
      column: seats.column,
    })
    .from(tickets)
    .innerJoin(seats, eq(seats.id, tickets.seatId))
    .where(eq(tickets.qrToken, qrToken))
    .limit(1);

  if (!t) throw new NotFoundError('Invalid QR token');

  if (t.status === 'VOIDED' || t.status === 'REFUNDED') {
    throw new ConflictError('Ticket is not valid for entry');
  }

  if (t.status === 'CHECKED_IN') {
    return {
      ticketId: t.id,
      status: 'CHECKED_IN',
      firstScan: false,
      checkedInAt: t.checkedInAt ?? new Date(), // fallback
      seatNumber: t.seatNumber,
      row: t.row,
      column: t.column,
    };
  }

  // t.status === 'ISSUED' → cập nhật
  const now = new Date();
  await db
    .update(tickets)
    .set({
      status: 'CHECKED_IN',
      checkedInAt: now,
      checkedInGate: gate ?? null,
    })
    .where(and(eq(tickets.id, t.id), eq(tickets.status, 'ISSUED')));

  return {
    ticketId: t.id,
    status: 'CHECKED_IN',
    firstScan: true,
    checkedInAt: now,
    seatNumber: t.seatNumber,
    row: t.row,
    column: t.column,
  };
}

/** Reissue: vô hiệu hoá vé cũ (VOIDED) và phát vé mới với version+1 */
export async function reissue(
  ticketId: string,
): Promise<{ newTicketId: string; qrToken: string }> {
  const [t] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);
  if (!t) throw new NotFoundError('Ticket not found');
  if (t.status === 'CHECKED_IN')
    throw new ConflictError('Cannot reissue a checked-in ticket');

  const newId = randomUUID();
  const newQr = randomBytes(24).toString('hex');

  await db.transaction(async (tx) => {
    await tx
      .update(tickets)
      .set({ status: 'VOIDED' })
      .where(and(eq(tickets.id, ticketId), eq(tickets.status, t.status)));

    await tx.insert(tickets).values({
      id: newId,
      bookingId: t.bookingId,
      showtimeId: t.showtimeId,
      seatId: t.seatId,
      status: 'ISSUED',
      qrToken: newQr,
      issuedAt: new Date(),
      // nếu bạn có cột reissued_from_id trong schema:
      version: (t.version ?? 1) + 1,
    } as typeof tickets.$inferInsert);
  });

  return { newTicketId: newId, qrToken: newQr };
}

/** Void 1 vé (khi cần huỷ trước suất chiếu) */
export async function voidTicket(ticketId: string): Promise<void> {
  const [t] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);
  if (!t) throw new NotFoundError('Ticket not found');
  if (t.status === 'CHECKED_IN')
    throw new ConflictError('Cannot void a checked-in ticket');
  await db
    .update(tickets)
    .set({ status: 'VOIDED' })
    .where(eq(tickets.id, ticketId));
}

/** (tuỳ) Validate vé thuộc đúng showtime trước giờ chiếu */
export async function assertUsableForShowtime(ticketId: string): Promise<void> {
  const [row] = await db
    .select({
      id: tickets.id,
      status: tickets.status,
      startsAt: show_times.startsAt,
    })
    .from(tickets)
    .innerJoin(show_times, eq(show_times.id, tickets.showtimeId))
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!row) throw new NotFoundError('Ticket not found');
  if (row.status !== 'ISSUED' && row.status !== 'CHECKED_IN') {
    throw new ConflictError('Ticket not valid');
  }
  if (row.startsAt && row.startsAt < new Date()) {
    // Tuỳ chính sách: có cho vào trễ không
  }
}
