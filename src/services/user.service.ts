import { randomUUID } from 'crypto';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, count } from 'drizzle-orm';

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
  return row || null;
}

export async function create(input: {
  name: string;
  email: string;
  password: string;
  role?: string;
}) {
  const id = randomUUID();
  await db.insert(users).values({
    id,
    name: input.name,
    email: input.email,
    password: input.password, // nếu controller nhận plain password, hãy hash trước khi gọi service
    role: input.role ?? 'CUSTOMER',
  });
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row!;
}

export async function remove(id: string) {
  await db.delete(users).where(eq(users.id, id));
}
