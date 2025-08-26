import { randomUUID } from 'crypto';
import { db } from '../db';
import { showtimes, movies, cinemas, seats } from '../db/schema';
import { eq, count, and, gte, sql, asc } from 'drizzle-orm';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../utils/errors/base';

export type CreateShowtimeInput = {
  movieId: string;
  cinemaId: string;
  showDate: Date;
  showTime: string; // "14:30:00"
  price: number;
};

export type ShowtimeFilters = {
  movieId?: string;
  cinemaId?: string;
  showDate?: string;
  city?: string;
  isActive?: boolean;
  fromDate?: string;
  toDate?: string;
};

export async function list(page = 1, pageSize = 10, filters?: ShowtimeFilters) {
  const conditions = [];

  if (filters?.movieId) {
    conditions.push(eq(showtimes.movieId, filters.movieId));
  }
  if (filters?.cinemaId) {
    conditions.push(eq(showtimes.cinemaId, filters.cinemaId));
  }
  if (filters?.showDate) {
    const date = new Date(filters.showDate);
    conditions.push(sql`DATE(${showtimes.showDate}) = DATE(${date})`);
  }
  if (filters?.fromDate) {
    conditions.push(gte(showtimes.showDate, new Date(filters.fromDate)));
  }
  if (filters?.toDate) {
    const toDate = new Date(filters.toDate);
    toDate.setHours(23, 59, 59, 999); // End of day
    conditions.push(sql`${showtimes.showDate} <= ${toDate}`);
  }
  if (filters?.city) {
    conditions.push(eq(cinemas.city, filters.city));
  }
  if (typeof filters?.isActive !== 'undefined') {
    conditions.push(eq(showtimes.isActive, filters.isActive));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: showtimes.id,
        movieId: showtimes.movieId,
        cinemaId: showtimes.cinemaId,
        showDate: showtimes.showDate,
        showTime: showtimes.showTime,
        price: showtimes.price,
        totalSeats: showtimes.totalSeats,
        bookedSeats: showtimes.bookedSeats,
        availableSeats: sql<number>`${showtimes.totalSeats} - ${showtimes.bookedSeats}`,
        isActive: showtimes.isActive,
        createdAt: showtimes.createdAt,
        // Movie info
        movie: {
          id: movies.id,
          title: movies.title,
          duration: movies.duration,
          description: movies.description,
        },
        // Cinema info
        cinema: {
          id: cinemas.id,
          name: cinemas.name,
          city: cinemas.city,
          address: cinemas.address,
        },
      })
      .from(showtimes)
      .leftJoin(movies, eq(showtimes.movieId, movies.id))
      .leftJoin(cinemas, eq(showtimes.cinemaId, cinemas.id))
      .where(whereClause)
      .orderBy(asc(showtimes.showDate), asc(showtimes.showTime))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: count() })
      .from(showtimes)
      .leftJoin(cinemas, eq(showtimes.cinemaId, cinemas.id))
      .where(whereClause),
  ]);

  return { items: rows, total: Number(total) };
}

export async function create(input: CreateShowtimeInput) {
  // Validate time format
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
  if (!timeRegex.test(input.showTime)) {
    throw new ValidationError('Invalid time format. Use HH:MM:SS');
  }

  // Validate showDate is not in the past
  const now = new Date();
  const showDateTime = new Date(
    `${input.showDate.toISOString().split('T')[0]} ${input.showTime}`,
  );

  if (showDateTime < now) {
    throw new ValidationError('Show date and time cannot be in the past');
  }

  // Validate movie exists
  const [movie] = await db
    .select()
    .from(movies)
    .where(eq(movies.id, input.movieId))
    .limit(1);
  if (!movie) throw new NotFoundError('Movie not found');

  // Validate cinema exists and is active
  const [cinema] = await db
    .select()
    .from(cinemas)
    .where(and(eq(cinemas.id, input.cinemaId), eq(cinemas.isActive, true)))
    .limit(1);
  if (!cinema) throw new NotFoundError('Cinema not found or inactive');

  // Check for time conflicts
  await checkTimeConflict(
    input.cinemaId,
    input.showDate,
    input.showTime,
    movie.duration,
  );

  // Get total seats for this cinema
  const [seatCount] = await db
    .select({ count: count() })
    .from(seats)
    .where(and(eq(seats.cinemaId, input.cinemaId), eq(seats.isActive, true)));

  if (seatCount.count === 0) {
    throw new ValidationError('Cinema has no active seats');
  }

  const id = randomUUID();
  await db.insert(showtimes).values({
    id,
    movieId: input.movieId,
    cinemaId: input.cinemaId,
    showDate: input.showDate,
    showTime: input.showTime,
    price: String(input.price),
    totalSeats: seatCount.count,
    bookedSeats: 0,
    isActive: true,
  });

  return await getById(id);
}

async function checkTimeConflict(
  cinemaId: string,
  showDate: Date,
  showTime: string,
  movieDuration: number,
  excludeId?: string,
) {
  const showDateTime = new Date(
    `${showDate.toISOString().split('T')[0]} ${showTime}`,
  );
  const movieEndTime = new Date(
    showDateTime.getTime() + movieDuration * 60000 + 30 * 60000,
  ); // +30min buffer

  let conditions = [
    eq(showtimes.cinemaId, cinemaId),
    sql`DATE(${showtimes.showDate}) = DATE(${showDate})`,
    eq(showtimes.isActive, true),
  ];

  if (excludeId) {
    conditions.push(sql`${showtimes.id} != ${excludeId}`);
  }

  const conflictingShowtimes = await db
    .select({
      id: showtimes.id,
      showTime: showtimes.showTime,
      movieDuration: movies.duration,
    })
    .from(showtimes)
    .leftJoin(movies, eq(showtimes.movieId, movies.id))
    .where(and(...conditions));

  for (const existing of conflictingShowtimes) {
    const existingStart = new Date(
      `${showDate.toISOString().split('T')[0]} ${existing.showTime}`,
    );
    const existingEnd = new Date(
      existingStart.getTime() +
        (existing.movieDuration || 0) * 60000 +
        30 * 60000,
    );

    // Check if times overlap (with 30-minute buffer)
    if (
      (showDateTime >= existingStart && showDateTime < existingEnd) ||
      (movieEndTime > existingStart && movieEndTime <= existingEnd) ||
      (showDateTime <= existingStart && movieEndTime >= existingEnd)
    ) {
      throw new ConflictError(
        `Showtime conflicts with existing showtime at ${existing.showTime}. Minimum 30-minute gap required.`,
      );
    }
  }
}

export async function getById(id: string) {
  const [row] = await db
    .select({
      id: showtimes.id,
      movieId: showtimes.movieId,
      cinemaId: showtimes.cinemaId,
      showDate: showtimes.showDate,
      showTime: showtimes.showTime,
      price: showtimes.price,
      totalSeats: showtimes.totalSeats,
      bookedSeats: showtimes.bookedSeats,
      availableSeats: sql<number>`${showtimes.totalSeats} - ${showtimes.bookedSeats}`,
      isActive: showtimes.isActive,
      createdAt: showtimes.createdAt,
      movie: {
        id: movies.id,
        title: movies.title,
        description: movies.description,
        duration: movies.duration,
        releaseDate: movies.releaseDate,
      },
      cinema: {
        id: cinemas.id,
        name: cinemas.name,
        address: cinemas.address,
        city: cinemas.city,
        phone: cinemas.phone,
        email: cinemas.email,
      },
    })
    .from(showtimes)
    .leftJoin(movies, eq(showtimes.movieId, movies.id))
    .leftJoin(cinemas, eq(showtimes.cinemaId, cinemas.id))
    .where(eq(showtimes.id, id))
    .limit(1);

  if (!row) throw new NotFoundError('Showtime not found');
  return row;
}

export async function update(id: string, input: Partial<CreateShowtimeInput>) {
  const [existing] = await db
    .select()
    .from(showtimes)
    .where(eq(showtimes.id, id))
    .limit(1);

  if (!existing) throw new NotFoundError('Showtime not found');

  // Check if showtime has bookings
  if (existing.bookedSeats > 0) {
    throw new ConflictError('Cannot update showtime with existing bookings');
  }

  const updateData: Partial<typeof existing> = {};

  if (input.movieId) {
    const [movie] = await db
      .select()
      .from(movies)
      .where(eq(movies.id, input.movieId))
      .limit(1);
    if (!movie) throw new NotFoundError('Movie not found');
    updateData.movieId = input.movieId;
  }

  if (input.cinemaId) {
    const [cinema] = await db
      .select()
      .from(cinemas)
      .where(and(eq(cinemas.id, input.cinemaId), eq(cinemas.isActive, true)))
      .limit(1);
    if (!cinema) throw new NotFoundError('Cinema not found or inactive');
    updateData.cinemaId = input.cinemaId;
  }

  if (input.showDate) {
    updateData.showDate = input.showDate;
  }

  if (input.showTime) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!timeRegex.test(input.showTime)) {
      throw new ValidationError('Invalid time format. Use HH:MM:SS');
    }
    updateData.showTime = input.showTime;
  }

  if (input.price !== undefined) {
    updateData.price = String(input.price);
  }

  // Check for time conflicts if date/time/cinema changed
  if (input.showDate || input.showTime || input.cinemaId) {
    const checkCinemaId = input.cinemaId || existing.cinemaId;
    const checkDate = input.showDate || existing.showDate;
    const checkTime = input.showTime || existing.showTime;

    // Get movie duration
    const movieId = input.movieId || existing.movieId;
    const [movie] = await db
      .select()
      .from(movies)
      .where(eq(movies.id, movieId))
      .limit(1);

    if (movie) {
      await checkTimeConflict(
        checkCinemaId,
        checkDate,
        checkTime,
        movie.duration,
        id,
      );
    }
  }

  // Update total seats if cinema changed
  if (input.cinemaId) {
    const [seatCount] = await db
      .select({ count: count() })
      .from(seats)
      .where(and(eq(seats.cinemaId, input.cinemaId), eq(seats.isActive, true)));
    updateData.totalSeats = seatCount.count;
  }

  await db.update(showtimes).set(updateData).where(eq(showtimes.id, id));

  return await getById(id);
}

export async function remove(id: string) {
  const [existing] = await db
    .select()
    .from(showtimes)
    .where(eq(showtimes.id, id))
    .limit(1);

  if (!existing) throw new NotFoundError('Showtime not found');

  if (existing.bookedSeats > 0) {
    throw new ConflictError('Cannot delete showtime with existing bookings');
  }

  await db.delete(showtimes).where(eq(showtimes.id, id));
  return true;
}

export async function toggleActive(id: string) {
  const [existing] = await db
    .select()
    .from(showtimes)
    .where(eq(showtimes.id, id))
    .limit(1);

  if (!existing) throw new NotFoundError('Showtime not found');

  // Don't allow deactivating if has bookings
  if (existing.bookedSeats > 0 && existing.isActive) {
    throw new ConflictError(
      'Cannot deactivate showtime with existing bookings',
    );
  }

  await db
    .update(showtimes)
    .set({ isActive: !existing.isActive })
    .where(eq(showtimes.id, id));

  return await getById(id);
}

// Get showtimes by movie
export async function getByMovie(movieId: string, page = 1, pageSize = 20) {
  return await list(page, pageSize, { movieId, isActive: true });
}

// Get showtimes by cinema
export async function getByCinema(cinemaId: string, page = 1, pageSize = 20) {
  return await list(page, pageSize, { cinemaId, isActive: true });
}

// Get available showtimes for today and upcoming days
export async function getUpcoming(days = 7, page = 1, pageSize = 50) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  return await list(page, pageSize, {
    fromDate: today.toISOString().split('T')[0],
    toDate: futureDate.toISOString().split('T')[0],
    isActive: true,
  });
}
