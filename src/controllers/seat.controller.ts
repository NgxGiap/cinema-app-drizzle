import { Request, Response } from 'express';
import * as svc from '../services/seat.service';
import type { NewSeat, SeatFilters, SeatType } from '../services/seat.service';
import { makePagination } from '../utils/http';

/* --- helpers: type-guards & parsers (strict, no-any) --- */

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function parseBool(v: unknown): boolean | undefined {
  if (typeof v !== 'string') return undefined;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
}

function normalizeSeatType(v: unknown): SeatType | undefined {
  if (typeof v !== 'string') return undefined;
  const up = v.toUpperCase();
  return up === 'REGULAR' ||
    up === 'VIP' ||
    up === 'COUPLE' ||
    up === 'DISABLED'
    ? (up as SeatType)
    : undefined;
}

/** Xây NewSeat nhưng KHÔNG bao giờ gán `undefined` cho optional props (phù hợp exactOptionalPropertyTypes) */
function parseNewSeat(u: unknown): NewSeat {
  if (!isObject(u)) throw new Error('Invalid seat payload');

  const roomId = u.roomId;
  const seatNumber = u.seatNumber;
  const row = u.row;
  const column = u.column;
  const price = u.price;

  if (typeof roomId !== 'string' || roomId.length === 0)
    throw new Error('roomId is required');
  if (typeof seatNumber !== 'string' || seatNumber.length === 0)
    throw new Error('seatNumber is required');
  if (typeof row !== 'string' || row.length === 0)
    throw new Error('row is required');
  if (typeof column !== 'number' || !Number.isFinite(column) || column < 1)
    throw new Error('column invalid');
  if (typeof price !== 'string' || price.length === 0)
    throw new Error('price is required');

  const result: NewSeat = {
    roomId,
    seatNumber,
    row,
    column,
    price,
  };

  const t = normalizeSeatType(u.type);
  if (t) {
    // chỉ set khi có giá trị hợp lệ
    result.type = t;
  }

  if (typeof u.isActive === 'boolean') {
    result.isActive = u.isActive;
  }

  return result;
}

/* ------------------------- controllers ------------------------- */

export async function listSeats(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);

  const filters: SeatFilters = {};
  if (typeof req.query.roomId === 'string' && req.query.roomId.trim())
    filters.roomId = req.query.roomId.trim();
  if (typeof req.query.row === 'string' && req.query.row.trim())
    filters.row = req.query.row.trim();
  const t = normalizeSeatType(req.query.type);
  if (t) filters.type = t;
  const isActive = parseBool(req.query.isActive);
  if (typeof isActive === 'boolean') filters.isActive = isActive;
  if (typeof req.query.q === 'string' && req.query.q.trim())
    filters.q = req.query.q.trim();

  const { items, total } = await svc.list(
    page,
    pageSize,
    Object.keys(filters).length ? filters : undefined,
  );
  return res.ok(
    { items, total, pagination: makePagination(page, pageSize, total) },
    'Seats fetched',
  );
}

export async function getSeat(req: Request, res: Response) {
  const seat = await svc.getById(req.params.id);
  return res.ok(seat);
}

export async function createSeat(req: Request, res: Response) {
  const created = await svc.create(parseNewSeat(req.body));
  // Response type của bạn không có res.created ⇒ dùng res.ok hoặc chuẩn Express:
  // return res.status(201).json({ data: created, message: 'Seat created' });
  return res.ok(created, 'Seat created');
}

export async function createManySeats(req: Request, res: Response) {
  const raw = req.body?.items as unknown;
  if (!Array.isArray(raw) || raw.length === 0) {
    return res.fail('items must be a non-empty array');
  }
  const inputs: NewSeat[] = raw.map(parseNewSeat);
  const result = await svc.createMany(inputs);
  return res.ok(result, 'Seats created');
}

export async function updateSeat(req: Request, res: Response) {
  const body = req.body as unknown;
  if (!isObject(body)) return res.fail('Invalid payload');

  // Xây patch mà không đưa các key = undefined (để khớp exactOptionalPropertyTypes)
  const patch: svc.UpdateSeat = {};
  if (typeof body.roomId === 'string') patch.roomId = body.roomId;
  if (typeof body.seatNumber === 'string') patch.seatNumber = body.seatNumber;
  if (typeof body.row === 'string') patch.row = body.row;
  if (typeof body.column === 'number') patch.column = body.column;
  const t = normalizeSeatType(body.type);
  if (t) patch.type = t;
  if (typeof body.price === 'string') patch.price = body.price;
  if (typeof body.isActive === 'boolean') patch.isActive = body.isActive;

  const updated = await svc.updateById(req.params.id, patch);
  return res.ok(updated, 'Seat updated');
}

export async function deleteSeat(req: Request, res: Response) {
  const out = await svc.removeById(req.params.id);
  return res.ok(out, 'Seat deleted');
}

export async function seatMap(req: Request, res: Response) {
  const { roomId, showtimeId } = req.params;
  const data = await svc.getSeatMapWithStatus(roomId, showtimeId);
  return res.ok(data, 'Seat map fetched');
}
