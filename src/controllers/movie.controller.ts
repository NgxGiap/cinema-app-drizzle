import { Request, Response } from 'express';
import { db } from '../db';
import { movies } from '../db/schema';
import { eq } from 'drizzle-orm';

// GET all movies
export const getMovies = async (_req: Request, res: Response) => {
  const data = await db.select().from(movies);
  res.json(data);
};

// GET movie by id
export const getMovieById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = await db
    .select()
    .from(movies)
    .where(eq(movies.id, Number(id)));

  if (!data.length) return res.status(404).json({ message: 'Movie not found' });
  res.json(data[0]);
};

// CREATE movie
export const createMovie = async (req: Request, res: Response) => {
  const { title, description, duration, releaseDate } = req.body;

  const result: any = await db.insert(movies).values({
    title,
    description,
    duration,
    releaseDate: new Date(releaseDate),
  });

  res.status(201).json({
    id: result.insertId, // ✅ MySQL trả về insertId
    title,
    description,
    duration,
    releaseDate,
  });
};

// UPDATE movie
export const updateMovie = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, duration, releaseDate } = req.body;

  const result: any = await db
    .update(movies)
    .set({
      title,
      description,
      duration,
      releaseDate: new Date(releaseDate),
    })
    .where(eq(movies.id, Number(id)));

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Movie not found' });
  }

  res.json({ message: 'Movie updated', id });
};

// DELETE movie
export const deleteMovie = async (req: Request, res: Response) => {
  const { id } = req.params;

  const result: any = await db.delete(movies).where(eq(movies.id, Number(id)));

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Movie not found' });
  }

  res.json({ message: 'Movie deleted', id });
};
