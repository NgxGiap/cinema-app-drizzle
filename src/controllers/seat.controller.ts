import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/seat.service';
import { makePagination } from '../utils/http';

export async function listSeats(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Number(req.query.pageSize) || 20);

    const filters: svc.SeatFilters = {
      roomId: req.query.roomId as string | undefined,
      row: req.query.row as string | undefined,
      type: req.query.type as svc.SeatType | undefined,
      isActive:
        typeof req.query.isActive === 'string'
          ? req.query.isActive === 'true'
          : undefined,
      q: req.query.q as string | undefined,
    };

    const { items, total } = await svc.list(page, pageSize, filters);

    return res.ok(
      { items, total, pagination: makePagination(page, pageSize, total) },
      'Seats fetched',
    );
  } catch (err) {
    next(err);
  }
}

export async function getSeat(req: Request, res: Response, next: NextFunction) {
  try {
    const seat = await svc.getById(req.params.id);
    return res.ok(seat);
  } catch (err) {
    next(err);
  }
}

export async function createSeat(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const created = await svc.create(req.body);
    return res.ok(created, 'Seat created');
  } catch (err) {
    next(err);
  }
}

export async function createManySeats(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const inputs = req.body.items as svc.NewSeat[];
    const result = await svc.createMany(inputs);
    return res.ok(result, 'Seats created');
  } catch (err) {
    next(err);
  }
}

export async function updateSeat(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const updated = await svc.updateById(req.params.id, req.body);
    return res.ok(updated, 'Seat updated');
  } catch (err) {
    next(err);
  }
}

export async function deleteSeat(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const out = await svc.removeById(req.params.id);
    return res.ok(out, 'Seat deleted');
  } catch (err) {
    next(err);
  }
}

export async function seatMap(req: Request, res: Response, next: NextFunction) {
  try {
    const { roomId, showtimeId } = req.params;
    const data = await svc.getSeatMapWithStatus(roomId, showtimeId);
    return res.ok(data, 'Seat map fetched');
  } catch (err) {
    next(err);
  }
}
