import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES = '7d';

export async function login(email: string, password: string) {
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!u) return null;

  const ok = await bcrypt.compare(password, u.password); // <- dùng cột "password"
  if (!ok) return null;

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
  const id = randomUUID();
  const hash = await bcrypt.hash(input.password, 10);

  await db.insert(users).values({
    id,
    name: input.name,
    email: input.email,
    password: hash, // <- đúng tên cột
    role: input.role ?? 'CUSTOMER',
  });

  // lấy lại bản ghi để trả về
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return u!;
}
