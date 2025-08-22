import { randomUUID } from 'crypto';
import { db } from '../db';
import { movies } from '../db/schema';
import { eq, count } from 'drizzle-orm';
import { NotFoundError } from '../utils/errors/base';

type CreateMovieInput = {
  title: string;
  duration: number;
  releaseDate: Date;
  description?: string;
};

export async function list(page = 1, pageSize = 10) {
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(movies)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(movies),
  ]);
  return { items: rows, total: Number(total) };
}

export async function create(input: CreateMovieInput) {
  const id = randomUUID();
  await db.insert(movies).values({
    id,
    title: input.title,
    description: input.description ?? null,
    duration: input.duration,
    releaseDate: input.releaseDate,
  });

  const [row] = await db
    .select()
    .from(movies)
    .where(eq(movies.id, id))
    .limit(1);

  if (!row) throw new Error('Failed to create movie');
  return row;
}

export async function getById(id: string) {
  const [row] = await db
    .select()
    .from(movies)
    .where(eq(movies.id, id))
    .limit(1);

  if (!row) throw new NotFoundError('Movie not found');
  return row;
}

export async function update(id: string, input: Partial<CreateMovieInput>) {
  const [existingMovie] = await db
    .select()
    .from(movies)
    .where(eq(movies.id, id))
    .limit(1);

  if (!existingMovie) throw new NotFoundError('Movie not found');

  await db
    .update(movies)
    .set({
      title: input.title ?? existingMovie.title,
      description: input.description ?? existingMovie.description,
      duration: input.duration ?? existingMovie.duration,
      releaseDate: input.releaseDate ?? existingMovie.releaseDate,
    })
    .where(eq(movies.id, id));

  const [updatedRow] = await db
    .select()
    .from(movies)
    .where(eq(movies.id, id))
    .limit(1);

  if (!updatedRow) throw new Error('Failed to update movie');
  return updatedRow;
}

export async function remove(id: string) {
  const [existingMovie] = await db
    .select()
    .from(movies)
    .where(eq(movies.id, id))
    .limit(1);

  if (!existingMovie) throw new NotFoundError('Movie not found');

  await db.delete(movies).where(eq(movies.id, id));
  return true;
}
