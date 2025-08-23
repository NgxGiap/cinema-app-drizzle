import { Request, Response } from 'express';
import * as svc from '../services/seat.service.js';
import type { SeatFilters } from '../services/seat.service.js';

type SeatType = 'regular' | 'vip' | 'couple' | 'disabled'; // tránh union có undefined

export async function listSeats(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);

  const filters: SeatFilters = {};

  if (
    typeof req.query.cinemaId === 'string' &&
    req.query.cinemaId.trim() !== ''
  ) {
    filters.cinemaId = req.query.cinemaId.trim();
  }
  if (typeof req.query.type === 'string' && req.query.type.trim() !== '') {
    const t = req.query.type.trim();
    if (['regular', 'vip', 'couple', 'disabled'].includes(t)) {
      filters.type = t as SeatType; // ✅ không còn undefined trong union
    }
  }
  if (typeof req.query.row === 'string' && req.query.row.trim() !== '') {
    filters.row = req.query.row.trim();
  }
  if (typeof req.query.isActive === 'string') {
    filters.isActive = req.query.isActive === 'true';
  }

  const where = Object.keys(filters).length > 0 ? filters : undefined;
  const { items, total } = await svc.list(page, pageSize, where);
  return res.json({ items, total, page, pageSize });
}

export async function createSeat(req: Request, res: Response) {
  const body = req.body as {
    cinemaId: string;
    seatNumber: string;
    row: string;
    column: number | string;
    type?: SeatType;
    price: number | string; // schema hiện là string
    isActive?: boolean;
  };

  const created = await svc.createOne({
    cinemaId: String(body.cinemaId),
    seatNumber: String(body.seatNumber),
    row: String(body.row),
    column: Number(body.column),
    type: (body.type ?? 'regular') as SeatType,
    price: String(Number(body.price)), // ✅ ép về string số
    isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
  });

  return res.status(201).json(created);
}

export async function bulkCreateSeats(req: Request, res: Response) {
  const arr = (Array.isArray(req.body) ? req.body : []) as Array<{
    cinemaId: string;
    seatNumber: string;
    row: string;
    column: number | string;
    type?: SeatType;
    price: number | string;
    isActive?: boolean;
    id?: string;
  }>;

  const inputs = arr.map((s) => ({
    cinemaId: String(s.cinemaId),
    seatNumber: String(s.seatNumber),
    row: String(s.row),
    column: Number(s.column),
    type: (s.type ?? 'regular') as SeatType,
    price: String(Number(s.price)),
    isActive: typeof s.isActive === 'boolean' ? s.isActive : true,
  }));

  const result = await svc.bulkCreate(inputs);
  return res.status(201).json(result);
}

export async function updateSeat(req: Request, res: Response) {
  const { id } = req.params;
  const patch = req.body as Partial<{
    seatNumber: string;
    row: string;
    column: number | string;
    type: SeatType;
    price: number | string;
    isActive: boolean;
  }>;

  const normalized: Partial<{
    seatNumber: string;
    row: string;
    column: number;
    type: SeatType;
    price: string;
    isActive: boolean;
  }> = {};

  if (typeof patch.seatNumber === 'string')
    normalized.seatNumber = patch.seatNumber;
  if (typeof patch.row === 'string') normalized.row = patch.row;
  if (typeof patch.column !== 'undefined')
    normalized.column = Number(patch.column);
  if (typeof patch.type === 'string') normalized.type = patch.type as SeatType;
  if (typeof patch.price !== 'undefined')
    normalized.price = String(Number(patch.price));
  if (typeof patch.isActive === 'boolean') normalized.isActive = patch.isActive;

  const result = await svc.updateById(id, normalized);
  return res.json(result);
}

export async function deleteSeat(req: Request, res: Response) {
  const { id } = req.params;
  const result = await svc.removeById(id);
  return res.json(result);
}

/* -----------------------------
 *  Các alias/handler bổ sung để khớp routes hiện có
 * ----------------------------*/

// POST /seats/bulk
export const createMultipleSeats = bulkCreateSeats;

// DELETE /seats/bulk    body: { ids: string[] }
export async function deleteMultipleSeats(req: Request, res: Response) {
  const ids = Array.isArray(req.body?.ids) ? (req.body.ids as string[]) : [];
  if (ids.length === 0)
    return res.status(400).json({ deleted: 0, message: 'ids required' });

  let deleted = 0;
  for (const id of ids) {
    const r = await svc.removeById(id);
    deleted += r.deleted ?? 0;
  }
  return res.json({ deleted });
}

// GET /seats/:id
export async function getSeat(req: Request, res: Response) {
  const { id } = req.params;
  const row = await svc.getById(id);
  if (!row) return res.status(404).json({ message: 'Seat not found' });
  return res.json(row);
}

// GET /seats/cinema/:cinemaId
export async function getSeatsByCinema(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 200);
  const cinemaId = String(req.params.cinemaId);
  const { items, total } = await svc.list(page, pageSize, { cinemaId });
  return res.json({ items, total, page, pageSize });
}

// GET /seats/cinema/:cinemaId/map
export async function getSeatMap(req: Request, res: Response) {
  const cinemaId = String(req.params.cinemaId);
  const { items } = await svc.list(1, 10_000, { cinemaId });

  // Nhóm theo hàng để dựng map đơn giản
  const map: Record<string, typeof items> = {};
  for (const s of items) {
    const key = s.row ?? 'UNKNOWN';
    if (!map[key]) map[key] = [];
    map[key].push(s);
  }
  // sort trong mỗi hàng theo cột
  for (const r of Object.keys(map)) {
    map[r].sort((a, b) => (a.column ?? 0) - (b.column ?? 0));
  }
  return res.json({ cinemaId, rows: map });
}
