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
    const pageSize = Math.min(100, Number(req.query.pageSize) || 10);
    const { items, total } = await svc.list(page, pageSize);
    return res.ok(
      { items, total, pagination: makePagination(page, pageSize, total) },
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
