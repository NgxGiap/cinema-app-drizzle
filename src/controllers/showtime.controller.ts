import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/showtime.service';
import { makePagination } from '../utils/http';

type UpdateShowtimeInput = Partial<svc.CreateShowtimeInput>;

export async function listShowtimes(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);

    const filters: svc.ShowtimeFilters = {};
    if (req.query.movieId) filters.movieId = String(req.query.movieId);
    if (req.query.cinemaId) filters.cinemaId = String(req.query.cinemaId);
    if (req.query.showDate) filters.showDate = String(req.query.showDate);
    if (req.query.city) filters.city = String(req.query.city);
    if (req.query.fromDate) filters.fromDate = String(req.query.fromDate);
    if (req.query.toDate) filters.toDate = String(req.query.toDate);
    if (req.query.isActive) filters.isActive = req.query.isActive === 'true';

    const { items, total } = await svc.list(page, pageSize, filters);

    return res.ok(
      { items, total, pagination: makePagination(page, pageSize, total) },
      'Showtimes fetched',
    );
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
    const { movieId, cinemaId, showDate, showTime, price } = req.body;

    const created = await svc.create({
      movieId,
      cinemaId,
      showDate: new Date(showDate),
      showTime,
      price: Number(price),
    });

    return res.ok(created, 'Showtime created', 201);
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
    const row = await svc.getById(req.params.id);
    return res.ok(row, 'Showtime detail');
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
    const { showDate, price, ...rest } = req.body;

    const updateData: UpdateShowtimeInput = { ...rest };
    if (showDate) updateData.showDate = new Date(showDate);
    if (price !== undefined) updateData.price = Number(price);

    const updated = await svc.update(req.params.id, updateData);
    return res.ok(updated, 'Showtime updated');
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
    await svc.remove(req.params.id);
    return res.ok(null, 'Showtime deleted');
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
    const updated = await svc.toggleActive(req.params.id);
    return res.ok(updated, 'Showtime status toggled');
  } catch (error) {
    next(error);
  }
}

export async function getShowtimesByMovie(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);

    const { items, total } = await svc.getByMovie(
      req.params.movieId,
      page,
      pageSize,
    );

    return res.ok(
      { items, total, pagination: makePagination(page, pageSize, total) },
      'Movie showtimes fetched',
    );
  } catch (error) {
    next(error);
  }
}

export async function getShowtimesByCinema(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);

    const { items, total } = await svc.getByCinema(
      req.params.cinemaId,
      page,
      pageSize,
    );

    return res.ok(
      { items, total, pagination: makePagination(page, pageSize, total) },
      'Cinema showtimes fetched',
    );
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
