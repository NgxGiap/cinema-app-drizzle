import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/cinema.service';
import { makePagination } from '../utils/http';

export async function listCinemas(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Number(req.query.page);
    const pageSize = Number(req.query.pageSize);

    const filters = req.query as svc.CinemaFilters;

    const { items, total } = await svc.list(
      page,
      pageSize,
      Object.keys(filters).length ? filters : undefined,
    );
    return res.ok(
      { items, total, pagination: makePagination(page, pageSize, total) },
      'Cinemas fetched',
    );
  } catch (err) {
    next(err);
  }
}

export async function getCinema(
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

export async function createCinema(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const created = await svc.create(req.body);
    return res.ok(created, 'Cinema created');
  } catch (err) {
    next(err);
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
  } catch (err) {
    next(err);
  }
}

export async function toggleCinemaStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const detail = await svc.toggleStatus(req.params.id);
    return res.ok(detail, 'Cinema status toggled');
  } catch (err) {
    next(err);
  }
}

export async function deleteCinema(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const out = await svc.remove(req.params.id);
    return res.ok(out, 'Cinema deleted');
  } catch (err) {
    next(err);
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
  } catch (err) {
    next(err);
  }
}
