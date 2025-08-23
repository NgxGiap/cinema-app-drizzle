import { Request, Response } from 'express';
import * as svc from '../services/movie.service';
import { makePagination } from '../utils/http';

export async function listMovies(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Number(req.query.pageSize) || 10);
  const { items, total } = await svc.list(page, pageSize);
  return res.ok(
    { items, total, pagination: makePagination(page, pageSize, total) },
    'Movies fetched',
  );
}
export async function createMovie(req: Request, res: Response) {
  const created = await svc.create(req.body);
  return res.ok(created, 'Movie created', 201);
}
export async function getMovie(req: Request, res: Response) {
  const row = await svc.getById(req.params.id);
  return row ? res.ok(row, 'Movie detail') : res.fail('Movie not found', 404);
}
export async function updateMovie(req: Request, res: Response) {
  const updated = await svc.update(req.params.id, req.body);
  return res.ok(updated, 'Movie updated');
}
export async function deleteMovie(req: Request, res: Response) {
  await svc.remove(req.params.id);
  return res.ok(null, 'Movie deleted');
}
