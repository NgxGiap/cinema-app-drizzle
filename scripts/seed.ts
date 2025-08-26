import 'dotenv/config';
import { db } from '../src/db';
import { users, movies, seats, cinemas, showtimes } from '../src/db/schema';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { and, eq, sql } from 'drizzle-orm';

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

    const today = new Date();
    const showtimeList: (typeof showtimes.$inferInsert)[] = [];

    // Lấy movies và cinemas đã tạo
    const movieList = await db.select().from(movies);

    // Tạo lịch chiếu cho 7 ngày tới
    const times = ['09:00:00', '12:00:00', '15:00:00', '18:00:00', '21:00:00'];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayOffset);

      for (const movie of movieList) {
        for (const cinema of cinemaList) {
          // Random 2-4 suất chiếu mỗi ngày cho mỗi phim tại mỗi rạp
          const numShowtimes = Math.floor(Math.random() * 3) + 2;
          const selectedTimes = times
            .sort(() => 0.5 - Math.random())
            .slice(0, numShowtimes);

          for (const time of selectedTimes) {
            // Skip past showtimes for today
            if (dayOffset === 0) {
              const now = new Date();
              const showtimeDateTime = new Date(
                `${currentDate.toISOString().split('T')[0]} ${time}`,
              );
              if (showtimeDateTime < now) {
                continue;
              }
            }

            showtimeList.push({
              id: crypto.randomUUID(),
              movieId: movie.id,
              cinemaId: cinema.id!,
              showDate: currentDate,
              showTime: time,
              price: String(90000 + Math.floor(Math.random() * 50000)), // 90k-140k VND
              totalSeats: 50, // Will be updated later
              bookedSeats: Math.floor(Math.random() * 15), // Random 0-14 booked seats
              isActive: true,
            });
          }
        }
      }
    }

    if (showtimeList.length > 0) {
      await db.insert(showtimes).values(showtimeList);

      // Cập nhật totalSeats từ seats table
      console.log('✅ Updating total seats for showtimes...');
      for (const showtime of showtimeList) {
        const [seatCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(seats)
          .where(
            and(
              eq(seats.cinemaId, showtime.cinemaId),
              eq(seats.isActive, true),
            ),
          );

        await db
          .update(showtimes)
          .set({ totalSeats: Number(seatCount.count) })
          .where(eq(showtimes.id, showtime.id!));
      }

      console.log(`✅ Showtimes seeded successfully! (${showtimeList.length})`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seed();
