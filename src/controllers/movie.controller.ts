import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/movie.service';
import { makePagination } from '../utils/http';

export async function listMovies(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);

    const filters: svc.MovieFilters = {
      q: req.query.q as string,
      state: req.query.state as svc.MovieState,
      fromReleaseDate: req.query.fromReleaseDate
        ? new Date(req.query.fromReleaseDate as string)
        : undefined,
      toReleaseDate: req.query.toReleaseDate
        ? new Date(req.query.toReleaseDate as string)
        : undefined,
    };

    const { items, total } = await svc.list(page, pageSize, filters);
    return res.ok(
      { items, total, pagination: makePagination(page, pageSize, total) },
      'Movies fetched',
    );
  } catch (err) {
    next(err);
  }
}

export async function getMovie(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const item = await svc.getById(req.params.id);
    return res.ok(item, 'Movie detail fetched');
  } catch (err) {
    next(err);
  }
}

export async function getMovieBySlug(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const item = await svc.getBySlug(req.params.slug);
    return res.ok(item, 'Movie detail fetched by slug');
  } catch (err) {
    next(err);
  }
}

export async function createMovie(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input: svc.CreateMovieInput = req.body;
    const created = await svc.create(input);
    return res.ok(created, 'Movie created');
  } catch (err) {
    next(err);
  }
}

export async function updateMovie(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const patch: svc.UpdateMovieInput = req.body;
    const updated = await svc.update(req.params.id, patch);
    return res.ok(updated, 'Movie updated');
  } catch (err) {
    next(err);
  }
}

export async function deleteMovie(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const out = await svc.remove(req.params.id);
    return res.ok(out, 'Movie deleted');
  } catch (err) {
    next(err);
  }
}
