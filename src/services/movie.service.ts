import { randomUUID } from 'crypto';
import { and, asc, count, eq, like, gte, lte, SQL } from 'drizzle-orm';
import { db } from '../db';
import { movies } from '../db/schema';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../utils/errors/base';

export type MovieState = 'COMING_SOON' | 'NOW_SHOWING' | 'ENDED';

export type MovieListItem = {
  id: string;
  slug: string;
  title: string;
  state: MovieState;
  releaseDate: Date | null;
  posterUrl: string | null;
  runtimeMinutes: number;
  genres: string[];
};

export type MovieDetail = MovieListItem & {
  description: string | null;
  trailerUrl: string | null;
  directors: string[];
  cast: string[];
  ratingCode: string | null;
  originalLanguage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MovieFilters = {
  q?: string;
  state?: MovieState;
  fromReleaseDate?: Date;
  toReleaseDate?: Date;
};

export type CreateMovieInput = {
  slug: string;
  title: string;
  description?: string;
  runtimeMinutes?: number;
  releaseDate?: Date | null;
  state?: MovieState;
  posterUrl?: string | null;
  trailerUrl?: string | null;
  genres?: string[]; // hoặc CSV sẽ parse ở service
  directors?: string[];
  cast?: string[];
  ratingCode?: string | null;
  originalLanguage?: string | null;
};

export type UpdateMovieInput = Partial<CreateMovieInput>;

/* ----------------- helpers ----------------- */

function normalizeState(v: unknown): MovieState | undefined {
  if (typeof v !== 'string') return undefined;
  const up = v.toUpperCase();
  if (up === 'COMING_SOON' || up === 'NOW_SHOWING' || up === 'ENDED')
    return up as MovieState;
  return undefined;
}

function toStringArray(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    return v
      .map(String)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (typeof v === 'string') {
    return v
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return undefined;
}

/** Parse giá trị JSON lấy từ DB thành string[] an toàn (không dùng any) */
function jsonToStringArray(dbValue: unknown): string[] {
  if (dbValue == null) return [];
  if (Array.isArray(dbValue)) {
    return dbValue
      .map(String)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (typeof dbValue === 'string') {
    try {
      const parsed = JSON.parse(dbValue);
      if (Array.isArray(parsed)) {
        return parsed
          .map(String)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
    } catch {
      // ignore invalid JSON
    }
  }
  if (typeof dbValue === 'object') {
    // MySQL driver có thể trả về object đã parse sẵn
    const maybeArr = dbValue as unknown;
    if (Array.isArray(maybeArr)) {
      return maybeArr
        .map(String)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
  }
  return [];
}

function whereFromFilters(filters?: MovieFilters): SQL<unknown> | undefined {
  if (!filters) return undefined;
  const clauses: SQL<unknown>[] = [];
  if (filters.q) {
    const pattern = `%${filters.q}%`;
    clauses.push(like(movies.title, pattern));
    // Tăng độ bao phủ: tìm theo slug (dùng AND+LIKE 2 lần sẽ thu hẹp, nên dùng thêm logic ở list)
  }
  if (filters.state) clauses.push(eq(movies.state, filters.state));
  if (filters.fromReleaseDate)
    clauses.push(gte(movies.releaseDate, filters.fromReleaseDate));
  if (filters.toReleaseDate)
    clauses.push(lte(movies.releaseDate, filters.toReleaseDate));
  return clauses.length ? and(...clauses) : undefined;
}

/* ----------------- services ----------------- */

export async function list(
  page = 1,
  pageSize = 20,
  filters?: MovieFilters,
): Promise<{ items: MovieListItem[]; total: number }> {
  const where = whereFromFilters(filters);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: movies.id,
      slug: movies.slug,
      title: movies.title,
      state: movies.state,
      releaseDate: movies.releaseDate,
      posterUrl: movies.posterUrl,
      runtimeMinutes: movies.runtimeMinutes,
      genres: movies.genres,
    })
    .from(movies)
    .where(where)
    .orderBy(asc(movies.title))
    .limit(pageSize)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(movies)
    .where(where);

  const items: MovieListItem[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    state: r.state as MovieState,
    releaseDate: r.releaseDate ?? null,
    posterUrl: r.posterUrl ?? null,
    runtimeMinutes: r.runtimeMinutes,
    genres: jsonToStringArray(r.genres),
  }));

  // nếu có filter.q, bổ sung lọc theo slug ở client-level (đỡ ghép OR phức tạp)
  const filtered = filters?.q
    ? items.filter(
        (m) =>
          m.title.toLowerCase().includes(filters.q!.toLowerCase()) ||
          m.slug.toLowerCase().includes(filters.q!.toLowerCase()),
      )
    : items;

  return { items: filtered, total: Number(total) };
}

export async function getById(id: string): Promise<MovieDetail> {
  const [r] = await db.select().from(movies).where(eq(movies.id, id)).limit(1);

  if (!r) throw new NotFoundError('Movie not found');

  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    state: r.state as MovieState,
    releaseDate: r.releaseDate ?? null,
    posterUrl: r.posterUrl ?? null,
    runtimeMinutes: r.runtimeMinutes,
    genres: jsonToStringArray(r.genres),
    description: r.description ?? null,
    trailerUrl: r.trailerUrl ?? null,
    directors: jsonToStringArray(r.directors),
    cast: jsonToStringArray(r.cast),
    ratingCode: r.ratingCode ?? null,
    originalLanguage: r.originalLanguage ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function getBySlug(slug: string): Promise<MovieDetail> {
  const [r] = await db
    .select()
    .from(movies)
    .where(eq(movies.slug, slug))
    .limit(1);
  if (!r) throw new NotFoundError('Movie not found');
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    state: r.state as MovieState,
    releaseDate: r.releaseDate ?? null,
    posterUrl: r.posterUrl ?? null,
    runtimeMinutes: r.runtimeMinutes,
    genres: jsonToStringArray(r.genres),
    description: r.description ?? null,
    trailerUrl: r.trailerUrl ?? null,
    directors: jsonToStringArray(r.directors),
    cast: jsonToStringArray(r.cast),
    ratingCode: r.ratingCode ?? null,
    originalLanguage: r.originalLanguage ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function create(input: CreateMovieInput): Promise<MovieDetail> {
  if (!input.slug || !input.title)
    throw new ValidationError('slug and title are required');
  const [dup] = await db
    .select({ id: movies.id })
    .from(movies)
    .where(eq(movies.slug, input.slug))
    .limit(1);
  if (dup) throw new ConflictError('Slug already exists');

  const state = normalizeState(input.state) ?? 'COMING_SOON';
  const id = randomUUID();

  const toInsert: Partial<typeof movies.$inferInsert> = {
    id,
    slug: input.slug,
    title: input.title,
    description: input.description ?? null,
    runtimeMinutes:
      typeof input.runtimeMinutes === 'number' ? input.runtimeMinutes : 0,
    state,
    posterUrl: input.posterUrl ?? null,
    trailerUrl: input.trailerUrl ?? null,
    genres: JSON.stringify(toStringArray(input.genres) ?? []),
    directors: JSON.stringify(toStringArray(input.directors) ?? []),
    cast: JSON.stringify(toStringArray(input.cast) ?? []),
    ratingCode: input.ratingCode ?? null,
    originalLanguage: input.originalLanguage ?? null,
  };

  // ✅ chỉ set khi có Date hợp lệ
  if (input.releaseDate instanceof Date && !Number.isNaN(+input.releaseDate)) {
    toInsert.releaseDate = input.releaseDate;
  }

  await db.insert(movies).values(toInsert as typeof movies.$inferInsert);
  return getById(id);
}

export async function update(
  id: string,
  patch: UpdateMovieInput,
): Promise<MovieDetail> {
  const [existing] = await db
    .select()
    .from(movies)
    .where(eq(movies.id, id))
    .limit(1);
  if (!existing) throw new NotFoundError('Movie not found');

  const data: Partial<typeof movies.$inferInsert> = {};

  if (typeof patch.slug === 'string' && patch.slug !== existing.slug) {
    const [dup] = await db
      .select({ id: movies.id })
      .from(movies)
      .where(eq(movies.slug, patch.slug))
      .limit(1);
    if (dup) throw new ConflictError('Slug already exists');
    data.slug = patch.slug;
  }
  if (typeof patch.title === 'string') data.title = patch.title;
  if (typeof patch.description === 'string')
    data.description = patch.description;
  if (typeof patch.runtimeMinutes === 'number')
    data.runtimeMinutes = patch.runtimeMinutes;
  if (patch.releaseDate instanceof Date && !Number.isNaN(+patch.releaseDate))
    data.releaseDate = patch.releaseDate;

  const state = normalizeState(patch.state);
  if (state) data.state = state;

  if (typeof patch.posterUrl === 'string') data.posterUrl = patch.posterUrl;
  if (typeof patch.trailerUrl === 'string') data.trailerUrl = patch.trailerUrl;

  const g = toStringArray(patch.genres);
  if (typeof g !== 'undefined') data.genres = JSON.stringify(g);

  const d = toStringArray(patch.directors);
  if (typeof d !== 'undefined') data.directors = JSON.stringify(d);

  const c = toStringArray(patch.cast);
  if (typeof c !== 'undefined') data.cast = JSON.stringify(c);

  if (typeof patch.ratingCode === 'string') data.ratingCode = patch.ratingCode;
  if (typeof patch.originalLanguage === 'string')
    data.originalLanguage = patch.originalLanguage;

  if (Object.keys(data).length === 0) return getById(id);

  await db.update(movies).set(data).where(eq(movies.id, id));
  return getById(id); // ✅
}

export async function remove(id: string): Promise<{ id: string }> {
  await db.delete(movies).where(eq(movies.id, id));
  return { id };
}
