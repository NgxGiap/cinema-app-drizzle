import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/showtime.service';
import { makePagination } from '../utils/http';

export async function listShowtimes(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;

    const filters: svc.ShowtimeFilters = {
      movieId: req.query.movieId as string | undefined,
      cinemaId: req.query.cinemaId as string | undefined,
      roomId: req.query.roomId as string | undefined,
      from: req.query.from ? new Date(String(req.query.from)) : undefined,
      to: req.query.to ? new Date(String(req.query.to)) : undefined,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      q: req.query.q as string | undefined,
    };

    const { items, total } = await svc.list(page, pageSize, filters);
    return res.ok(
      { items, total, pagination: makePagination(page, pageSize, total) },
      'Showtimes fetched',
    );
  } catch (err) {
    next(err);
  }
}

export async function getShowtime(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const item = await svc.getById(req.params.id);
    return res.ok(item);
  } catch (err) {
    next(err);
  }
}

export async function createShowtime(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const created = await svc.create(req.body);
    return res.ok(created, 'Showtime created');
  } catch (err) {
    next(err);
  }
}

export async function updateShowtime(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const updated = await svc.update(req.params.id, req.body);
    return res.ok(updated, 'Showtime updated');
  } catch (err) {
    next(err);
  }
}

export async function toggleShowtimeStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const detail = await svc.toggleStatus(req.params.id);
    return res.ok(detail, 'Showtime status toggled');
  } catch (err) {
    next(err);
  }
}

export async function deleteShowtime(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const out = await svc.remove(req.params.id);
    return res.ok(out, 'Showtime deleted');
  } catch (err) {
    next(err);
  }
}

export async function getUpcomingShowtimes(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 50;

    const { items, total } = await svc.getUpcoming(days, page, pageSize);
    return res.ok(
      { items, total, pagination: makePagination(page, pageSize, total) },
      'Upcoming showtimes fetched',
    );
  } catch (err) {
    next(err);
  }
}
