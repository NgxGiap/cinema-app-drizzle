import 'dotenv/config';
import { db } from '../src/db';
import { users, movies } from '../src/db/schema';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    await db.delete(users);
    await db.delete(movies);

    // Seed Users
    const hashedAdmin = await bcrypt.hash('123456', 10);
    const hashedUser = await bcrypt.hash('123456', 10);

    await db.insert(users).values([
      {
        name: 'Admin',
        email: 'admin@example.com',
        password: hashedAdmin,
        role: 'admin',
      },
      {
        name: 'Regular User',
        email: 'user@example.com',
        password: hashedUser,
        role: 'user',
      },
    ]);

    console.log('✅ Users seeded successfully!');

    // Seed Movies
    await db.insert(movies).values([
      {
        title: 'Inception',
        description:
          'A thief who steals corporate secrets through dream-sharing technology.',
        duration: 148,
        releaseDate: new Date('2010-07-16'),
      },
      {
        title: 'Interstellar',
        description: 'A team of explorers travel through a wormhole in space.',
        duration: 169,
        releaseDate: new Date('2014-11-07'),
      },
      {
        title: 'The Dark Knight',
        description: 'Batman faces the Joker in Gotham City.',
        duration: 152,
        releaseDate: new Date('2008-07-18'),
      },
    ]);

    console.log('✅ Movies seeded successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seed();
