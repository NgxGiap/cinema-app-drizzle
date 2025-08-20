import { randomUUID } from 'crypto';
import { db } from '../db';
import { movies } from '../db/schema';
import { eq, count } from 'drizzle-orm';

type CreateMovieInput = {
  title: string;
  duration: number; // phút
  releaseDate: Date; // hoặc string 'YYYY-MM-DD' nếu dùng MySQL DATE
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
    // Nếu schema là DATE, truyền dạng 'YYYY-MM-DD' hoặc new Date() tùy bạn định nghĩa
    releaseDate: input.releaseDate as any,
  });
  const [row] = await db
    .select()
    .from(movies)
    .where(eq(movies.id, id))
    .limit(1);
  return row!;
}

export async function getById(id: string) {
  const [row] = await db
    .select()
    .from(movies)
    .where(eq(movies.id, id))
    .limit(1);
  return row || null;
}
