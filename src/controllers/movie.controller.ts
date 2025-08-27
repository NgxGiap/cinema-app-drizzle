import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/movie.service';
import { makePagination } from '../utils/http';

type MovieFilters = {
  title?: string;
  releaseYear?: number;
  durationMin?: number;
  durationMax?: number;
  releaseDateFrom?: Date;
  releaseDateTo?: Date;
};

export async function listMovies(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 10);

    const filters: MovieFilters = {};

    // Filter by title (partial match)
    if (typeof req.query.title === 'string' && req.query.title.trim()) {
      filters.title = req.query.title.trim();
    }

    // Filter by release year
    if (
      typeof req.query.releaseYear === 'string' &&
      req.query.releaseYear.trim()
    ) {
      const year = Number(req.query.releaseYear);
      if (!isNaN(year) && year > 1900 && year <= new Date().getFullYear() + 5) {
        filters.releaseYear = year;
      }
    }

    // Filter by minimum duration
    if (
      typeof req.query.durationMin === 'string' &&
      req.query.durationMin.trim()
    ) {
      const minDuration = Number(req.query.durationMin);
      if (!isNaN(minDuration) && minDuration > 0) {
        filters.durationMin = minDuration;
      }
    }

    // Filter by maximum duration
    if (
      typeof req.query.durationMax === 'string' &&
      req.query.durationMax.trim()
    ) {
      const maxDuration = Number(req.query.durationMax);
      if (!isNaN(maxDuration) && maxDuration > 0) {
        filters.durationMax = maxDuration;
      }
    }

    // Filter by release date from
    if (
      typeof req.query.releaseDateFrom === 'string' &&
      req.query.releaseDateFrom.trim()
    ) {
      const fromDate = new Date(req.query.releaseDateFrom);
      if (!isNaN(fromDate.getTime())) {
        filters.releaseDateFrom = fromDate;
      }
    }

    // Filter by release date to
    if (
      typeof req.query.releaseDateTo === 'string' &&
      req.query.releaseDateTo.trim()
    ) {
      const toDate = new Date(req.query.releaseDateTo);
      if (!isNaN(toDate.getTime())) {
        filters.releaseDateTo = toDate;
      }
    }

    const where = Object.keys(filters).length ? filters : undefined;
    const { items, total } = await svc.list(page, pageSize, where);

    return res.ok(
      { items, pagination: makePagination(page, pageSize, total) },
      'Movies fetched',
    );
  } catch (error) {
    next(error);
  }
}

export async function createMovie(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { title, description, duration, releaseDate } = req.body;

    if (!title || !duration || !releaseDate) {
      return res.fail(
        'Missing required fields: title, duration, releaseDate',
        400,
      );
    }

    const parsedDate = new Date(releaseDate);
    if (isNaN(parsedDate.getTime())) {
      return res.fail('Invalid releaseDate format. Use YYYY-MM-DD', 400);
    }

    const created = await svc.create({
      title,
      description,
      duration: Number(duration),
      releaseDate: parsedDate,
    });

    return res.ok(created, 'Movie created', 201);
  } catch (error) {
    next(error);
  }
}

export async function getMovie(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const row = await svc.getById(req.params.id);
    return row ? res.ok(row, 'Movie detail') : res.fail('Movie not found', 404);
  } catch (error) {
    next(error);
  }
}

export async function updateMovie(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { releaseDate, ...rest } = req.body;
    let parsedDate: Date | undefined = undefined;

    if (releaseDate) {
      parsedDate = new Date(releaseDate);
      if (isNaN(parsedDate.getTime())) {
        return res.fail('Invalid releaseDate format. Use YYYY-MM-DD', 400);
      }
    }

    const updated = await svc.update(req.params.id, {
      ...rest,
      ...(parsedDate ? { releaseDate: parsedDate } : {}),
    });

    return res.ok(updated, 'Movie updated');
  } catch (error) {
    next(error);
  }
}

export async function deleteMovie(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await svc.remove(req.params.id);
    return res.ok(null, 'Movie deleted');
  } catch (error) {
    next(error);
  }
}
