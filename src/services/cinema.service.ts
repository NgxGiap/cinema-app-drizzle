import { randomUUID } from 'crypto';
import { db } from '../db';
import { cinemas, seats } from '../db/schema';
import { eq, count, and, sql } from 'drizzle-orm';
import { NotFoundError, ConflictError } from '../utils/errors/base';

type CreateCinemaInput = {
  name: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
};

export async function list(
  page = 1,
  pageSize = 10,
  filters?: {
    city?: string;
    isActive?: boolean;
  },
) {
  const conditions = [];

  if (filters?.city) {
    conditions.push(eq(cinemas.city, filters.city));
  }

  if (typeof filters?.isActive !== 'undefined') {
    conditions.push(eq(cinemas.isActive, filters.isActive));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: cinemas.id,
        name: cinemas.name,
        address: cinemas.address,
        city: cinemas.city,
        phone: cinemas.phone,
        email: cinemas.email,
        isActive: cinemas.isActive,
        createdAt: cinemas.createdAt,
        // Count seats for each cinema
        seatCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${seats} 
          WHERE ${seats.cinemaId} = ${cinemas.id}
        )`.as('seat_count'),
      })
      .from(cinemas)
      .where(whereClause)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(cinemas).where(whereClause),
  ]);

  return { items: rows, total: Number(total) };
}

export async function create(input: CreateCinemaInput) {
  // Check if cinema name already exists in the same city
  const [existingCinema] = await db
    .select()
    .from(cinemas)
    .where(and(eq(cinemas.name, input.name), eq(cinemas.city, input.city)))
    .limit(1);

  if (existingCinema) {
    throw new ConflictError(
      'Cinema with same name already exists in this city',
    );
  }

  const id = randomUUID();
  await db.insert(cinemas).values({
    id,
    name: input.name,
    address: input.address,
    city: input.city,
    phone: input.phone ?? null,
    email: input.email ?? null,
    isActive: input.isActive ?? true,
  });

  const [row] = await db
    .select()
    .from(cinemas)
    .where(eq(cinemas.id, id))
    .limit(1);

  if (!row) throw new Error('Failed to create cinema');
  return row;
}

export async function getById(id: string) {
  const [row] = await db
    .select({
      id: cinemas.id,
      name: cinemas.name,
      address: cinemas.address,
      city: cinemas.city,
      phone: cinemas.phone,
      email: cinemas.email,
      isActive: cinemas.isActive,
      createdAt: cinemas.createdAt,
      seatCount: sql<number>`(
        SELECT COUNT(*) 
        FROM ${seats} 
        WHERE ${seats.cinemaId} = ${cinemas.id}
      )`.as('seat_count'),
      activeSeatCount: sql<number>`(
        SELECT COUNT(*) 
        FROM ${seats} 
        WHERE ${seats.cinemaId} = ${cinemas.id} 
        AND ${seats.isActive} = 1
      )`.as('active_seat_count'),
    })
    .from(cinemas)
    .where(eq(cinemas.id, id))
    .limit(1);

  if (!row) throw new NotFoundError('Cinema not found');
  return row;
}

export async function update(id: string, input: Partial<CreateCinemaInput>) {
  const [existingCinema] = await db
    .select()
    .from(cinemas)
    .where(eq(cinemas.id, id))
    .limit(1);

  if (!existingCinema) throw new NotFoundError('Cinema not found');

  // Check name uniqueness if name or city is being changed
  if (
    (input.name && input.name !== existingCinema.name) ||
    (input.city && input.city !== existingCinema.city)
  ) {
    const checkName = input.name ?? existingCinema.name;
    const checkCity = input.city ?? existingCinema.city;

    const [nameExists] = await db
      .select()
      .from(cinemas)
      .where(
        and(
          eq(cinemas.name, checkName),
          eq(cinemas.city, checkCity),
          sql`id != ${id}`, // Exclude current cinema
        ),
      )
      .limit(1);

    if (nameExists) {
      throw new ConflictError(
        'Cinema with same name already exists in this city',
      );
    }
  }

  await db
    .update(cinemas)
    .set({
      name: input.name ?? existingCinema.name,
      address: input.address ?? existingCinema.address,
      city: input.city ?? existingCinema.city,
      phone: input.phone ?? existingCinema.phone,
      email: input.email ?? existingCinema.email,
      isActive: input.isActive ?? existingCinema.isActive,
    })
    .where(eq(cinemas.id, id));

  const [updatedRow] = await db
    .select()
    .from(cinemas)
    .where(eq(cinemas.id, id))
    .limit(1);

  if (!updatedRow) throw new Error('Failed to update cinema');
  return updatedRow;
}

export async function remove(id: string) {
  const [existingCinema] = await db
    .select()
    .from(cinemas)
    .where(eq(cinemas.id, id))
    .limit(1);

  if (!existingCinema) throw new NotFoundError('Cinema not found');

  // Check if cinema has seats
  const [seatCount] = await db
    .select({ count: count() })
    .from(seats)
    .where(eq(seats.cinemaId, id));

  if (seatCount.count > 0) {
    throw new ConflictError(
      'Cannot delete cinema that has seats. Delete seats first.',
    );
  }

  await db.delete(cinemas).where(eq(cinemas.id, id));
  return true;
}

export async function toggleActive(id: string) {
  const [existingCinema] = await db
    .select()
    .from(cinemas)
    .where(eq(cinemas.id, id))
    .limit(1);

  if (!existingCinema) throw new NotFoundError('Cinema not found');

  await db
    .update(cinemas)
    .set({ isActive: !existingCinema.isActive })
    .where(eq(cinemas.id, id));

  const [updatedRow] = await db
    .select()
    .from(cinemas)
    .where(eq(cinemas.id, id))
    .limit(1);

  if (!updatedRow) throw new Error('Failed to toggle cinema status');
  return updatedRow;
}

export async function getCitiesList() {
  const cities = await db
    .selectDistinct({ city: cinemas.city })
    .from(cinemas)
    .where(eq(cinemas.isActive, true));

  return cities.map((c) => c.city);
}
