import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import {
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from '../utils/errors/base';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES = '7d';

export async function login(email: string, password: string) {
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!u) throw new NotFoundError('User not found');

  const ok = await bcrypt.compare(password, u.password);
  if (!ok) throw new UnauthorizedError('Invalid credentials');

  const token = jwt.sign(
    { id: u.id, email: u.email, role: u.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );

  return {
    token,
    user: { id: u.id, name: u.name, email: u.email, role: u.role },
  };
}

export async function register(input: {
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
    throw new ConflictError('User with this email already exists');
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

  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u) throw new Error('Failed to create user');

  return u;
}
