import 'dotenv/config';
import { db } from '../src/db';
import { users, movies, seats, cinemas } from '../src/db/schema';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function seed() {
  try {
    // await db.delete(users);
    // await db.delete(movies);
    // await db.delete(seats);
    // await db.delete(cinemas);

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

    const cinemaList: (typeof cinemas.$inferInsert)[] = [
      {
        id: crypto.randomUUID(),
        name: 'CGV Vincom Đồng Khởi',
        address: '72 Lê Thánh Tôn, Quận 1',
        city: 'Hồ Chí Minh',
        isActive: true,
      },
      {
        id: crypto.randomUUID(),
        name: 'Lotte Cinema Hà Nội Center',
        address: '54 Liễu Giai, Ba Đình',
        city: 'Hà Nội',
        isActive: true,
      },
    ];

    await db.insert(cinemas).values(cinemaList);
    console.log(`✅ Cinemas seeded successfully! (${cinemaList.length})`);

    // ===== Seed Seats (Ghế) cho mỗi rạp =====
    // 5 hàng (A–E) x 10 ghế/hàng. Cột 1–2: VIP (120k), còn lại Regular (80k)
    const allSeats: (typeof seats.$inferInsert)[] = [];
    const rows = ['A', 'B', 'C', 'D', 'E'];

    for (const c of cinemaList) {
      for (const r of rows) {
        for (let col = 1; col <= 10; col++) {
          const type = col <= 2 ? 'vip' : 'regular';
          // Nếu cột price trong schema là string (như hiện tại), để String(...)
          const price = String(col <= 2 ? 120_000 : 80_000);

          allSeats.push({
            id: crypto.randomUUID(),
            cinemaId: c.id!,
            seatNumber: `${r}${col}`,
            row: r,
            column: col,
            type,
            price,
            isActive: true,
          });
        }
      }
    }

    await db.insert(seats).values(allSeats);
    console.log(`✅ Seats seeded successfully! (${allSeats.length})`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seed();
