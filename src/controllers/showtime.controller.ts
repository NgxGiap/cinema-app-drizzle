import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/showtime.service';
import { makePagination } from '../utils/http';

/** build Date từ body: ưu tiên startsAt; fallback showDate + showTime */
function buildStartsAt(body: unknown): Date | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.startsAt === 'string') {
    const d = new Date(b.startsAt);
    return Number.isNaN(+d) ? null : d;
  }
  if (typeof b.showDate === 'string' && typeof b.showTime === 'string') {
    const d = new Date(`${b.showDate}T${b.showTime}Z`); // giả định FE gửi giờ theo UTC; chỉnh nếu bạn muốn local
    return Number.isNaN(+d) ? null : d;
  }
  return null;
}

export async function listShowtimes(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);

    const filters: svc.ShowtimeFilters = {};
    if (typeof req.query.cinemaId === 'string' && req.query.cinemaId)
      filters.cinemaId = req.query.cinemaId;
    if (typeof req.query.movieId === 'string' && req.query.movieId)
      filters.movieId = req.query.movieId;
    if (typeof req.query.roomId === 'string' && req.query.roomId)
      filters.roomId = req.query.roomId;
    if (typeof req.query.isActive === 'string')
      filters.isActive = req.query.isActive === 'true';
    if (typeof req.query.from === 'string') {
      const d = new Date(req.query.from);
      if (!Number.isNaN(+d)) filters.from = d;
    }
    if (typeof req.query.to === 'string') {
      const d = new Date(req.query.to);
      if (!Number.isNaN(+d)) filters.to = d;
    }

    const { items, total } = await svc.list(
      page,
      pageSize,
      Object.keys(filters).length ? filters : undefined,
    );
    return res.ok(
      { items, total, pagination: makePagination(page, pageSize, total) },
      'Showtimes fetched',
    );
  } catch (error) {
    next(error);
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
  } catch (error) {
    next(error);
  }
}

export async function createShowtime(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const startsAt = buildStartsAt(req.body);
    if (!startsAt) return res.fail('startsAt/showDate+showTime is invalid');

    const payload: svc.CreateShowtimeInput = {
      movieId: String(req.body.movieId),
      cinemaId: String(req.body.cinemaId),
      // roomId là optional; nếu không gửi, service sẽ dùng Room 1
      roomId:
        typeof req.body.roomId === 'string' && req.body.roomId
          ? req.body.roomId
          : undefined,
      startsAt,
      price: String(req.body.price),
      isActive:
        typeof req.body.isActive === 'boolean' ? req.body.isActive : undefined,
    };

    const created = await svc.create(payload);
    // nếu bạn muốn 201:
    // return res.status(201).json({ data: created, message: 'Showtime created' });
    return res.ok(created, 'Showtime created');
  } catch (error) {
    next(error);
  }
}

export async function updateShowtime(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const patch: svc.UpdateShowtimeInput = {};
    if (typeof req.body.movieId === 'string') patch.movieId = req.body.movieId;
    if (typeof req.body.cinemaId === 'string')
      patch.cinemaId = req.body.cinemaId;
    if (typeof req.body.roomId === 'string') patch.roomId = req.body.roomId;

    const startsAt = buildStartsAt(req.body);
    if (startsAt) patch.startsAt = startsAt;

    if (typeof req.body.price === 'string') patch.price = req.body.price;
    if (typeof req.body.isActive === 'boolean')
      patch.isActive = req.body.isActive;

    const updated = await svc.update(req.params.id, patch);
    return res.ok(updated, 'Showtime updated');
  } catch (error) {
    next(error);
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
  } catch (error) {
    next(error);
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
  } catch (error) {
    next(error);
  }
}

export async function getUpcomingShowtimes(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 50);

    const { items, total } = await svc.getUpcoming(days, page, pageSize);
    return res.ok(
      { items, total, pagination: makePagination(page, pageSize, total) },
      'Upcoming showtimes fetched',
    );
  } catch (error) {
    next(error);
  }
}
