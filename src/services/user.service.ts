import { randomUUID } from 'crypto';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, count } from 'drizzle-orm';
import { NotFoundError, ConflictError } from '../utils/errors/base';

export async function list(page = 1, pageSize = 10) {
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(users)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(users),
  ]);
  return { items: rows, total: Number(total) };
}

export async function getById(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row) throw new NotFoundError('User not found');
  return row;
}

export async function create(input: {
  name: string;
  email: string;
  password: string;
  role?: string;
}) {
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existingUser) {
    throw new ConflictError('Email already exists');
  }

  const id = randomUUID();
  await db.insert(users).values({
    id,
    name: input.name,
    email: input.email,
    password: input.password,
    role: input.role ?? 'user',
  });

  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row) throw new Error('Failed to create user');
  return row;
}

export async function remove(id: string) {
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!existingUser) {
    throw new NotFoundError('User not found');
  }

  await db.delete(users).where(eq(users.id, id));
  return true;
}
