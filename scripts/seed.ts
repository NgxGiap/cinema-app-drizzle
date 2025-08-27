import 'dotenv/config';
import { db } from '../src/db';
import {
  users,
  movies,
  seats,
  cinemas,
  showtimes,
  bookings,
  bookingSeats,
  payments,
} from '../src/db/schema';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { and, eq, sql, inArray } from 'drizzle-orm';

async function seed() {
  try {
    // await db.delete(users);
    // await db.delete(movies);
    // await db.delete(seats);
    // await db.delete(cinemas);
    // await db.delete(showtimes);
    // await db.delete(bookings);

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

    async function seedBookings() {
      console.log('⏳ Seeding bookings...');

      // Lấy 2 user để làm người đặt mẫu
      const userList = await db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .limit(2);

      if (userList.length === 0) {
        console.log('⚠️  No users to create bookings for. Skipped.');
        return;
      }
      const userA = userList[0];
      const userB = userList[userList.length > 1 ? 1 : 0];

      // Chọn một số showtime tương lai & đang active
      const futureShowtimes = await db
        .select({
          id: showtimes.id,
          cinemaId: showtimes.cinemaId,
          showDate: showtimes.showDate,
          showTime: showtimes.showTime,
          price: showtimes.price,
          isActive: showtimes.isActive,
          bookedSeats: showtimes.bookedSeats,
          totalSeats: showtimes.totalSeats,
        })
        .from(showtimes)
        .where(
          and(
            eq(showtimes.isActive, true),
            sql`TIMESTAMP(${showtimes.showDate}, ${showtimes.showTime}) > NOW()`,
          ),
        )
        .limit(6);

      if (futureShowtimes.length === 0) {
        console.log('⚠️  No future showtimes found. Skipped.');
        return;
      }

      const genBookingNumber = () =>
        'BK' +
        Date.now().toString().slice(-6) +
        Math.random().toString(36).slice(2, 6).toUpperCase();

      let created = 0;

      for (const st of futureShowtimes) {
        // Ghế đã bị giữ/đặt
        const taken = await db
          .select({ seatId: bookingSeats.seatId })
          .from(bookingSeats)
          .leftJoin(bookings, eq(bookingSeats.bookingId, bookings.id))
          .where(
            and(
              eq(bookings.showtimeId, st.id!),
              inArray(bookings.status, ['pending', 'confirmed']),
              inArray(bookingSeats.status, ['reserved', 'booked']),
            ),
          );
        const takenSet = new Set(taken.map((t) => t.seatId));

        // Ghế còn trống của rạp
        const seatPool = await db
          .select({ id: seats.id, price: seats.price })
          .from(seats)
          .where(
            and(eq(seats.cinemaId, st.cinemaId!), eq(seats.isActive, true)),
          );
        const freeSeats = seatPool.filter((s) => !takenSet.has(s.id));
        if (freeSeats.length < 1) continue;

        const remainingCapacity =
          (st.totalSeats ?? freeSeats.length) - (st.bookedSeats ?? 0);
        if (remainingCapacity <= 0) continue;

        // --- Booking 1: confirmed + paid (2 ghế nếu đủ) ---
        const pick1Count = Math.min(2, remainingCapacity, freeSeats.length);
        if (pick1Count > 0) {
          const pick1 = freeSeats.slice(0, pick1Count);
          const total1 = pick1.reduce((sum, s) => sum + Number(s.price), 0);
          const bookingNumber1 = genBookingNumber();

          await db.transaction(async (tx) => {
            const b1Id = crypto.randomUUID();

            await tx.insert(bookings).values({
              id: b1Id,
              userId: userA.id!,
              showtimeId: st.id!,
              bookingNumber: bookingNumber1,
              totalAmount: total1.toFixed(2),
              totalSeats: pick1.length,
              status: 'confirmed',
              paymentStatus: 'paid',
              paymentMethod: 'cash',
              customerName: userA.name || 'Seed User A',
              customerEmail: userA.email!,
              customerPhone: null,
              notes: 'seed: confirmed paid',
              confirmedAt: new Date(),
            });

            await tx.insert(bookingSeats).values(
              pick1.map((s) => ({
                id: crypto.randomUUID(),
                bookingId: b1Id,
                showtimeId: st.id!, // BẮT BUỘC: schema yêu cầu
                seatId: s.id!,
                price: Number(s.price).toFixed(2),
                status: 'booked' as const,
              })),
            );

            await tx
              .update(showtimes)
              .set({
                bookedSeats: sql`${showtimes.bookedSeats} + ${pick1.length}`,
              })
              .where(eq(showtimes.id, st.id!));

            await tx.insert(payments).values({
              id: crypto.randomUUID(),
              bookingId: b1Id,
              amount: total1.toFixed(2),
              method: 'cash',
              status: 'completed',
              transactionId: null,
              processedAt: new Date(),
            });
          });

          created++;
        }

        // --- Booking 2: pending (1 ghế) ---
        const freeAfter1 = freeSeats.slice(pick1Count);
        const capacityAfter1 =
          (st.totalSeats ?? 9999) - (st.bookedSeats ?? 0) - pick1Count;

        if (freeAfter1.length >= 1 && capacityAfter1 > 0) {
          const pick2 = freeAfter1.slice(0, 1);
          const total2 = pick2.reduce((sum, s) => sum + Number(s.price), 0);
          const bookingNumber2 = genBookingNumber();
          const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

          await db.transaction(async (tx) => {
            const b2Id = crypto.randomUUID();

            await tx.insert(bookings).values({
              id: b2Id,
              userId: userB.id!,
              showtimeId: st.id!,
              bookingNumber: bookingNumber2,
              totalAmount: total2.toFixed(2),
              totalSeats: pick2.length,
              status: 'pending',
              paymentStatus: 'pending',
              paymentMethod: null,
              customerName: userB.name || 'Seed User B',
              customerEmail: userB.email!,
              customerPhone: null,
              notes: 'seed: pending hold',
              expiresAt,
            });

            await tx.insert(bookingSeats).values(
              pick2.map((s) => ({
                id: crypto.randomUUID(),
                bookingId: b2Id,
                showtimeId: st.id!, // BẮT BUỘC: schema yêu cầu
                seatId: s.id!,
                price: Number(s.price).toFixed(2),
                status: 'reserved' as const,
              })),
            );

            await tx
              .update(showtimes)
              .set({
                bookedSeats: sql`${showtimes.bookedSeats} + ${pick2.length}`,
              })
              .where(eq(showtimes.id, st.id!));
          });

          created++;
        }
      }

      console.log(`✅ Bookings seeded: ${created}`);
    }

    await seedBookings();

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seed();
