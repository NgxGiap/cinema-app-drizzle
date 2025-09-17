import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/room.service';
import { makePagination } from '../utils/http';
import { SeatLayout } from '../types/seat-layout';
import { previewLayout, applyLayout } from '../services/seat.service';

export async function listRooms(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Number(req.query.page);
    const pageSize = Number(req.query.pageSize);

    const filters: svc.RoomFilters = {
      cinemaId: req.query.cinemaId as string | undefined,
      isActive: req.query.isActive as boolean | undefined,
      q: req.query.q as string | undefined,
    };

    const { items, total } = await svc.list(page, pageSize, filters);

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
    const created = await svc.create(req.body);
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
    const updated = await svc.update(req.params.id, req.body);
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
