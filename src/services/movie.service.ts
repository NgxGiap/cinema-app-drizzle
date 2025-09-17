import { randomUUID } from 'crypto';
import { and, asc, count, eq, like, gte, lte, SQL } from 'drizzle-orm';
import { db } from '../db';
import { movies, MOVIE_STATE } from '../db/schema';
import { ConflictError, NotFoundError } from '../utils/errors/base';

// Sync với schema
export type MovieState = keyof typeof MOVIE_STATE;

// Sync với validation - cast structure
export type CastItem = { name: string; role?: string | undefined };

export type MovieListItem = {
  id: string;
  slug: string;
  title: string;
  state: MovieState;
  releaseDate: Date; // NOT NULL theo schema
  posterUrl: string | null;
  runtimeMinutes: number;
  genres: string[];
};

export type MovieDetail = MovieListItem & {
  description: string | null;
  trailerUrl: string | null;
  directors: string[];
  cast: CastItem[]; // Thay đổi từ string[] thành CastItem[]
  ratingCode: string | null;
  originalLanguage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MovieFilters = {
  q?: string;
  state?: MovieState;
  fromReleaseDate?: Date | undefined;
  toReleaseDate?: Date | undefined;
};

// Sync với validation requirements
export type CreateMovieInput = {
  slug: string; // REQUIRED
  title: string; // REQUIRED
  description?: string;
  runtimeMinutes: number; // REQUIRED theo schema
  releaseDate: Date; // REQUIRED theo schema
  state: MovieState; // REQUIRED theo schema
  posterUrl?: string;
  trailerUrl?: string;
  genres?: string[];
  directors?: string[];
  cast?: CastItem[]; // Sync với validation
  ratingCode?: string;
  originalLanguage?: string;
};

export type UpdateMovieInput = Partial<CreateMovieInput>;

/* ----------------- helpers ----------------- */

// Helper to create CastItem safely with exactOptionalPropertyTypes
function createCastItem(name: string, role?: string): CastItem {
  const result: CastItem = { name };
  if (role !== undefined && role.length > 0) {
    result.role = role;
  }
  return result;
}

// Parse cast từ DB - hỗ trợ cả string[] cũ và CastItem[] mới
function jsonToCastArray(dbValue: unknown): CastItem[] {
  if (dbValue == null) return [];

  if (Array.isArray(dbValue)) {
    return dbValue
      .map((item) => {
        if (typeof item === 'string') {
          return createCastItem(item.trim());
        }
        if (typeof item === 'object' && item !== null && 'name' in item) {
          const castItem = item as Record<string, unknown>;
          const name = String(castItem.name).trim();
          const role = castItem.role ? String(castItem.role).trim() : undefined;
          return createCastItem(name, role);
        }
        return createCastItem(String(item).trim());
      })
      .filter((item) => item.name.length > 0);
  }

  if (typeof dbValue === 'string') {
    try {
      const parsed = JSON.parse(dbValue);
      return jsonToCastArray(parsed);
    } catch {
      // Fallback: treat as simple string
      const name = dbValue.trim();
      return name.length > 0 ? [createCastItem(name)] : [];
    }
  }

  return [];
}

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
      return [];
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
  }
  if (filters.state) clauses.push(eq(movies.state, filters.state));
  if (filters.fromReleaseDate)
    clauses.push(gte(movies.releaseDate, filters.fromReleaseDate));
  if (filters.toReleaseDate)
    clauses.push(lte(movies.releaseDate, filters.toReleaseDate));

  return clauses.length ? and(...clauses) : undefined;
}

/* ----------------- services - simplified validation ----------------- */

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
    releaseDate: r.releaseDate!, // NOT NULL theo schema
    posterUrl: r.posterUrl ?? null,
    runtimeMinutes: r.runtimeMinutes,
    genres: jsonToStringArray(r.genres),
  }));

  return { items, total: Number(total) };
}

export async function getById(id: string): Promise<MovieDetail> {
  const [r] = await db.select().from(movies).where(eq(movies.id, id)).limit(1);
  if (!r) throw new NotFoundError('Movie not found');

  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    state: r.state as MovieState,
    releaseDate: r.releaseDate!, // NOT NULL
    posterUrl: r.posterUrl ?? null,
    runtimeMinutes: r.runtimeMinutes,
    genres: jsonToStringArray(r.genres),
    description: r.description ?? null,
    trailerUrl: r.trailerUrl ?? null,
    directors: jsonToStringArray(r.directors),
    cast: jsonToCastArray(r.cast),
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

  return getById(r.id); // Reuse logic
}

export async function create(input: CreateMovieInput): Promise<MovieDetail> {
  // Validation middleware đã xử lý basic validation
  // Service chỉ cần check business rules

  const [dup] = await db
    .select({ id: movies.id })
    .from(movies)
    .where(eq(movies.slug, input.slug))
    .limit(1);
  if (dup) throw new ConflictError('Slug already exists');

  const id = randomUUID();

  const toInsert: typeof movies.$inferInsert = {
    id,
    slug: input.slug,
    title: input.title,
    description: input.description ?? null,
    runtimeMinutes: input.runtimeMinutes,
    releaseDate: input.releaseDate,
    state: input.state,
    posterUrl: input.posterUrl ?? null,
    trailerUrl: input.trailerUrl ?? null,
    genres: JSON.stringify(input.genres ?? []),
    directors: JSON.stringify(input.directors ?? []),
    cast: JSON.stringify(input.cast ?? []),
    ratingCode: input.ratingCode ?? null,
    originalLanguage: input.originalLanguage ?? null,
  };

  await db.insert(movies).values(toInsert);
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

  // Check slug uniqueness if changed
  if (patch.slug && patch.slug !== existing.slug) {
    const [dup] = await db
      .select({ id: movies.id })
      .from(movies)
      .where(eq(movies.slug, patch.slug))
      .limit(1);
    if (dup) throw new ConflictError('Slug already exists');
    data.slug = patch.slug;
  }

  // Simple field updates
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.runtimeMinutes !== undefined)
    data.runtimeMinutes = patch.runtimeMinutes;
  if (patch.releaseDate !== undefined) data.releaseDate = patch.releaseDate;
  if (patch.state !== undefined) data.state = patch.state;
  if (patch.posterUrl !== undefined) data.posterUrl = patch.posterUrl;
  if (patch.trailerUrl !== undefined) data.trailerUrl = patch.trailerUrl;
  if (patch.genres !== undefined) data.genres = JSON.stringify(patch.genres);
  if (patch.directors !== undefined)
    data.directors = JSON.stringify(patch.directors);
  if (patch.cast !== undefined) data.cast = JSON.stringify(patch.cast);
  if (patch.ratingCode !== undefined) data.ratingCode = patch.ratingCode;
  if (patch.originalLanguage !== undefined)
    data.originalLanguage = patch.originalLanguage;

  if (Object.keys(data).length === 0) return getById(id);

  await db.update(movies).set(data).where(eq(movies.id, id));
  return getById(id);
}

export async function remove(id: string): Promise<{ id: string }> {
  await db.delete(movies).where(eq(movies.id, id));
  return { id };
}
