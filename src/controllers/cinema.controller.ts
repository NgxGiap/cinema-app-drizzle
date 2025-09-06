import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/cinema.service';
import { makePagination } from '../utils/http';

export async function listCinemas(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Number(req.query.pageSize) || 20);

    const filters: svc.CinemaFilters = {};
    if (typeof req.query.city === 'string' && req.query.city.trim())
      filters.city = req.query.city.trim();
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
    const created = await svc.create({
      name: String(req.body.name),
      address: String(req.body.address),
      city: String(req.body.city),
      phone: typeof req.body.phone === 'string' ? req.body.phone : undefined,
      email: typeof req.body.email === 'string' ? req.body.email : undefined,
      isActive:
        typeof req.body.isActive === 'boolean' ? req.body.isActive : undefined,
    });
    return res.ok(created, 'Cinema created'); // ✅
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
    const patch: svc.UpdateCinemaInput = {};
    if (typeof req.body.name === 'string') patch.name = req.body.name;
    if (typeof req.body.address === 'string') patch.address = req.body.address;
    if (typeof req.body.city === 'string') patch.city = req.body.city;
    if (typeof req.body.phone === 'string') patch.phone = req.body.phone;
    if (typeof req.body.email === 'string') patch.email = req.body.email;
    if (typeof req.body.isActive === 'boolean')
      patch.isActive = req.body.isActive;

    const updated = await svc.update(req.params.id, patch);
    return res.ok(updated, 'Cinema updated'); // ✅
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
    return res.ok(detail, 'Cinema status toggled'); // ✅ trả detail
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
    return res.ok(out, 'Cinema deleted'); // ✅ trả { id }
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
