import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/room.service';
import { makePagination } from '../utils/http';

// layout helpers lấy từ seat.service (đã thêm trước đó)
import { previewLayout, applyLayout } from '../services/seat.service';
import { SeatLayout } from '../types/seat-layout';

export async function listRooms(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Number(req.query.pageSize) || 20);

    const filters: svc.RoomFilters = {};
    if (typeof req.query.cinemaId === 'string')
      filters.cinemaId = req.query.cinemaId;
    if (typeof req.query.isActive === 'string')
      filters.isActive = req.query.isActive === 'true';
    if (typeof req.query.q === 'string' && req.query.q.trim())
      filters.q = req.query.q.trim();

    const { items, total } = await svc.list(
      page,
      pageSize,
      Object.keys(filters).length ? filters : undefined,
    );
    return res.ok(
      { items, total, pagination: makePagination(page, pageSize, total) },
      'Rooms fetched',
    );
  } catch (err) {
    next(err);
  }
}

export async function getRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await svc.getById(req.params.id);
    return res.ok(item);
  } catch (err) {
    next(err);
  }
}

export async function createRoom(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const created = await svc.create({
      cinemaId: String(req.body.cinemaId),
      name: String(req.body.name),
      capacity:
        typeof req.body.capacity === 'number' ? req.body.capacity : undefined,
      isActive:
        typeof req.body.isActive === 'boolean' ? req.body.isActive : undefined,
      seatingMap:
        typeof req.body.seatingMap !== 'undefined'
          ? req.body.seatingMap
          : undefined,
    });
    return res.ok(created, 'Room created');
  } catch (err) {
    next(err);
  }
}

export async function updateRoom(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const patch: svc.UpdateRoom = {};
    if (typeof req.body.cinemaId === 'string')
      patch.cinemaId = req.body.cinemaId;
    if (typeof req.body.name === 'string') patch.name = req.body.name;
    if (typeof req.body.capacity === 'number')
      patch.capacity = req.body.capacity;
    if (typeof req.body.isActive === 'boolean')
      patch.isActive = req.body.isActive;
    if (typeof req.body.seatingMap !== 'undefined')
      patch.seatingMap = req.body.seatingMap;

    const updated = await svc.update(req.params.id, patch);
    return res.ok(updated, 'Room updated');
  } catch (err) {
    next(err);
  }
}

export async function toggleRoomStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const detail = await svc.toggleStatus(req.params.id);
    return res.ok(detail, 'Room status toggled');
  } catch (err) {
    next(err);
  }
}

export async function deleteRoom(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const out = await svc.remove(req.params.id);
    return res.ok(out, 'Room deleted');
  } catch (err) {
    next(err);
  }
}

/* ====== LAYOUT endpoints ====== */

export async function previewRoomLayout(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const roomId = req.params.id;
    const layout = req.body as SeatLayout;
    const items = await previewLayout(roomId, layout);
    return res.ok({ items, total: items.length }, 'Preview layout built');
  } catch (err) {
    next(err);
  }
}

export async function applyRoomLayout(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const roomId = req.params.id;
    const mode =
      String(req.query.mode || 'replace').toLowerCase() === 'merge'
        ? 'merge'
        : 'replace';
    const layout = req.body as SeatLayout;
    const out = await applyLayout(roomId, layout, mode);
    return res.ok(out, `Layout applied (${mode})`);
  } catch (err) {
    next(err);
  }
}
