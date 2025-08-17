import 'dotenv/config';
import { db } from '../src/db';
import { users } from '../src/db/schema';
import bcrypt from 'bcryptjs';

async function seed() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  await db.insert(users).values({
    name: 'Admin',
    email: 'admin@cinema.com',
    password: hashedPassword,
    role: 'admin',
  });

  console.log('✅ Admin user created: admin@cinema.com / 123456');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
