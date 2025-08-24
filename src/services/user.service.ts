import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, count } from 'drizzle-orm';
import { NotFoundError, ConflictError } from '../utils/errors/base';

type UserInsert = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
};

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
  const hash = await bcrypt.hash(input.password, 10);

  await db.insert(users).values({
    id,
    name: input.name,
    email: input.email,
    password: hash,
    role: input.role ?? 'user',
  });

  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row) throw new Error('Failed to create user');
  return row;
}

export async function update(
  id: string,
  input: Partial<{
    name: string;
    email: string;
    password: string;
    role: string;
  }>,
) {
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!existingUser) throw new NotFoundError('User not found');

  if (input.email && input.email !== existingUser.email) {
    const [emailExists] = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (emailExists) throw new ConflictError('Email already exists');
  }

  const updateData: Partial<UserInsert> = {};

  if (typeof input.name !== 'undefined' && input.name !== existingUser.name)
    updateData.name = input.name;
  if (typeof input.email !== 'undefined' && input.email !== existingUser.email)
    updateData.email = input.email;
  if (typeof input.role !== 'undefined' && input.role !== existingUser.role)
    updateData.role = input.role;
  if (typeof input.password === 'string' && input.password.length > 0) {
    updateData.password = await bcrypt.hash(input.password, 10);
  }

  await db.update(users).set(updateData).where(eq(users.id, id));

  const [updatedUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!updatedUser) throw new Error('Failed to update user');
  return updatedUser;
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
