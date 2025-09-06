import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/movie.service';
import { makePagination } from '../utils/http';

function parseDate(v: unknown): Date | undefined {
  if (typeof v !== 'string') return undefined;
  const d = new Date(v);
  return Number.isNaN(+d) ? undefined : d;
}

export async function listMovies(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);

    const filters: svc.MovieFilters = {};
    if (typeof req.query.q === 'string' && req.query.q.trim())
      filters.q = req.query.q.trim();
    const st =
      typeof req.query.state === 'string' && req.query.state
        ? (req.query.state.toUpperCase() as svc.MovieState)
        : undefined;
    if (st === 'COMING_SOON' || st === 'NOW_SHOWING' || st === 'ENDED')
      filters.state = st;
    const from = parseDate(req.query.fromReleaseDate);
    if (from) filters.fromReleaseDate = from;
    const to = parseDate(req.query.toReleaseDate);
    if (to) filters.toReleaseDate = to;

    const { items, total } = await svc.list(
      page,
      pageSize,
      Object.keys(filters).length ? filters : undefined,
    );
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
    return res.ok(item);
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
    return res.ok(item);
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
    const input: svc.CreateMovieInput = {
      slug: String(req.body.slug),
      title: String(req.body.title),
    };

    if (typeof req.body.description === 'string')
      input.description = req.body.description;
    if (typeof req.body.runtimeMinutes === 'number')
      input.runtimeMinutes = req.body.runtimeMinutes;

    const rd = parseDate(req.body.releaseDate);
    if (rd) input.releaseDate = rd; // chỉ set khi có Date hợp lệ
    // nếu muốn cho phép clear null ngay từ create: để trống => không set, sau này update có thể set null

    const st =
      typeof req.body.state === 'string'
        ? (req.body.state.toUpperCase() as svc.MovieState)
        : undefined;
    if (st) input.state = st;

    if (typeof req.body.posterUrl === 'string')
      input.posterUrl = req.body.posterUrl;
    if (typeof req.body.trailerUrl === 'string')
      input.trailerUrl = req.body.trailerUrl;

    if (Array.isArray(req.body.genres))
      input.genres = req.body.genres.map(String);
    else if (typeof req.body.genres === 'string')
      input.genres = req.body.genres;

    if (Array.isArray(req.body.directors))
      input.directors = req.body.directors.map(String);
    else if (typeof req.body.directors === 'string')
      input.directors = req.body.directors;

    if (Array.isArray(req.body.cast)) input.cast = req.body.cast.map(String);
    else if (typeof req.body.cast === 'string') input.cast = req.body.cast;

    if (typeof req.body.ratingCode === 'string')
      input.ratingCode = req.body.ratingCode;
    if (typeof req.body.originalLanguage === 'string')
      input.originalLanguage = req.body.originalLanguage;

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
    const patch: svc.UpdateMovieInput = {};

    if (typeof req.body.slug === 'string') patch.slug = req.body.slug;
    if (typeof req.body.title === 'string') patch.title = req.body.title;
    if (typeof req.body.description === 'string')
      patch.description = req.body.description;
    if (typeof req.body.runtimeMinutes === 'number')
      patch.runtimeMinutes = req.body.runtimeMinutes;

    const rd = parseDate(req.body.releaseDate);
    if (rd) patch.releaseDate = rd;
    if (typeof req.body.releaseDate === 'string' && req.body.releaseDate === '')
      patch.releaseDate = null;

    if (typeof req.body.state === 'string')
      patch.state = req.body.state.toUpperCase() as svc.MovieState;
    if (typeof req.body.posterUrl === 'string')
      patch.posterUrl = req.body.posterUrl;
    if (typeof req.body.trailerUrl === 'string')
      patch.trailerUrl = req.body.trailerUrl;

    if (Array.isArray(req.body.genres))
      patch.genres = req.body.genres.map(String);
    else if (typeof req.body.genres === 'string')
      patch.genres = req.body.genres;
    if (Array.isArray(req.body.directors))
      patch.directors = req.body.directors.map(String);
    else if (typeof req.body.directors === 'string')
      patch.directors = req.body.directors;
    if (Array.isArray(req.body.cast)) patch.cast = req.body.cast.map(String);
    else if (typeof req.body.cast === 'string') patch.cast = req.body.cast;

    if (typeof req.body.ratingCode === 'string')
      patch.ratingCode = req.body.ratingCode;
    if (typeof req.body.originalLanguage === 'string')
      patch.originalLanguage = req.body.originalLanguage;

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
