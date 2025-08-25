import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/cinema.service';
import { makePagination } from '../utils/http';

type CinemaFilters = {
  city?: string;
  isActive?: boolean;
};

export async function listCinemas(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);

  const filters: CinemaFilters = {};
  if (typeof req.query.city === 'string' && req.query.city.trim()) {
    filters.city = req.query.city.trim();
  }
  if (typeof req.query.isActive === 'string') {
    filters.isActive = req.query.isActive === 'true';
  }

  const where = Object.keys(filters).length ? filters : undefined;
  const { items, total } = await svc.list(page, pageSize, where);

  return res.ok(
    { items, pagination: makePagination(page, pageSize, total) },
    'Cinemas fetched',
  );
}

export async function createCinema(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const created = await svc.create(req.body);
    return res.ok(created, 'Cinema created', 201);
  } catch (error) {
    next(error);
  }
}

export async function getCinema(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const row = await svc.getById(req.params.id);
    return res.ok(row, 'Cinema detail');
  } catch (error) {
    next(error);
  }
}

export async function updateCinema(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const updated = await svc.update(req.params.id, req.body);
    return res.ok(updated, 'Cinema updated');
  } catch (error) {
    next(error);
  }
}

export async function deleteCinema(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await svc.remove(req.params.id);
    return res.ok(null, 'Cinema deleted');
  } catch (error) {
    next(error);
  }
}

export async function toggleCinemaStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const updated = await svc.toggleActive(req.params.id);
    return res.ok(updated, 'Cinema status toggled');
  } catch (error) {
    next(error);
  }
}

export async function getCitiesList(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const cities = await svc.getCitiesList();
    return res.ok(cities, 'Cities list fetched');
  } catch (error) {
    next(error);
  }
}
