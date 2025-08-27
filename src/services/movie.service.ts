import { randomUUID } from 'crypto';
import { db } from '../db';
import { movies } from '../db/schema';
import { eq, count, and, like, gte, lte, sql } from 'drizzle-orm';
import { NotFoundError } from '../utils/errors/base';

type CreateMovieInput = {
  title: string;
  duration: number;
  releaseDate: Date;
  description?: string;
};

type MovieFilters = {
  title?: string;
  releaseYear?: number;
  durationMin?: number;
  durationMax?: number;
  releaseDateFrom?: Date;
  releaseDateTo?: Date;
};

export async function list(page = 1, pageSize = 10, filters?: MovieFilters) {
  const conditions = [];

  if (filters?.title) {
    conditions.push(like(movies.title, `%${filters.title}%`));
  }

  if (filters?.releaseYear) {
    // Filter by release year using SQL YEAR() function
    conditions.push(sql`YEAR(${movies.releaseDate}) = ${filters.releaseYear}`);
  }

  if (filters?.durationMin) {
    conditions.push(gte(movies.duration, filters.durationMin));
  }

  if (filters?.durationMax) {
    conditions.push(lte(movies.duration, filters.durationMax));
  }

  if (filters?.releaseDateFrom) {
    conditions.push(gte(movies.releaseDate, filters.releaseDateFrom));
  }

  if (filters?.releaseDateTo) {
    // Set time to end of day for 'to' date
    const toDate = new Date(filters.releaseDateTo);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(movies.releaseDate, toDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [movieRows, [{ total }]] = await Promise.all([
    db
      .select({
        id: movies.id,
        title: movies.title,
        description: movies.description,
        duration: movies.duration,
        releaseDate: movies.releaseDate,
        createdAt: movies.createdAt,
      })
      .from(movies)
      .where(whereClause)
      .orderBy(movies.createdAt)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(movies).where(whereClause),
  ]);

  return { items: movieRows, total: Number(total) };
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
