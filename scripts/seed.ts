import 'dotenv/config';
import { db } from '../src/db';
import {
  users,
  movies,
  cinemas,
  rooms,
  seats,
  show_times,
  bookings,
  bookingSeats,
  payments,
  tickets,
  MOVIE_STATE,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  TICKET_STATUS,
  SEAT_TYPE,
} from '../src/db/schema';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';

function uid() {
  return crypto.randomUUID();
}
function bookingNo() {
  return 'BK' + Math.floor(100000 + Math.random() * 900000);
}
function qr() {
  return crypto.randomBytes(24).toString('hex');
}

async function seed() {
  try {
    /* USERS */
    await db.delete(users);
    await db.insert(users).values([
      {
        id: uid(),
        name: 'Alice',
        email: 'alice@example.com',
        password: await bcrypt.hash('password', 10),
        role: 'user',
      },
      {
        id: uid(),
        name: 'Bob',
        email: 'bob@example.com',
        password: await bcrypt.hash('password', 10),
        role: 'user',
      },
    ]);
    console.log('✅ Users seeded');

    /* MOVIES (lean + JSON) */
    await db.delete(movies);
    await db.insert(movies).values([
      {
        id: uid(),
        slug: 'mua-do',
        title: 'Mưa Đỏ',
        description: 'Phim chiến tranh lấy cảm hứng từ sự kiện 1972.',
        runtimeMinutes: 124,
        releaseDate: new Date('2025-08-22'),
        state: MOVIE_STATE.NOW_SHOWING,
        posterUrl: 'https://example.com/posters/mua-do.jpg',
        trailerUrl: 'https://www.youtube.com/watch?v=dummy1',
        genres: JSON.stringify(['Hành Động', 'Lịch Sử']),
        directors: JSON.stringify(['NSƯT Đặng Thái Huyền']),
        cast: JSON.stringify(['Đỗ Nhật Hoàng', 'Phương Nam', 'Lâm Thanh Nhã']),
        ratingCode: 'T13',
        originalLanguage: 'vi',
      },
      {
        id: uid(),
        slug: 'inception',
        title: 'Inception',
        description:
          'A thief who steals corporate secrets through dream-sharing tech.',
        runtimeMinutes: 148,
        releaseDate: new Date('2010-07-16'),
        state: MOVIE_STATE.NOW_SHOWING,
        posterUrl: 'https://example.com/posters/inception.jpg',
        trailerUrl: 'https://www.youtube.com/watch?v=dummy2',
        genres: JSON.stringify(['Action', 'Sci-Fi']),
        directors: JSON.stringify(['Christopher Nolan']),
        cast: JSON.stringify(['Leonardo DiCaprio', 'Joseph Gordon-Levitt']),
        ratingCode: 'PG-13',
        originalLanguage: 'en',
      },
      {
        id: uid(),
        slug: 'interstellar',
        title: 'Interstellar',
        description: 'Explorers travel through a wormhole in space.',
        runtimeMinutes: 169,
        releaseDate: new Date('2014-11-07'),
        state: MOVIE_STATE.COMING_SOON,
        posterUrl: 'https://example.com/posters/interstellar.jpg',
        trailerUrl: 'https://www.youtube.com/watch?v=dummy3',
        genres: JSON.stringify(['Adventure', 'Drama', 'Sci-Fi']),
        directors: JSON.stringify(['Christopher Nolan']),
        cast: JSON.stringify(['Matthew McConaughey', 'Anne Hathaway']),
        ratingCode: 'PG-13',
        originalLanguage: 'en',
      },
    ]);
    console.log('✅ Movies seeded');

    /* CINEMAS */
    await db.delete(cinemas);
    const cgv1 = {
      id: uid(),
      name: 'CGV Vincom Đồng Khởi',
      address: '72 Lê Thánh Tôn, Q1',
      city: 'Hồ Chí Minh',
      isActive: true,
    };
    const cgv2 = {
      id: uid(),
      name: 'CGV Aeon Tân Phú',
      address: '30 Bờ Bao Tân Thắng, Tân Phú',
      city: 'Hồ Chí Minh',
      isActive: true,
    };
    await db.insert(cinemas).values([cgv1, cgv2]);
    console.log('✅ Cinemas seeded');

    /* ROOMS */
    await db.delete(rooms);
    const roomList = [
      {
        id: uid(),
        cinemaId: cgv1.id,
        name: 'Room 1',
        capacity: 0,
        isActive: true,
      },
      {
        id: uid(),
        cinemaId: cgv1.id,
        name: 'Room 2',
        capacity: 0,
        isActive: true,
      },
      {
        id: uid(),
        cinemaId: cgv2.id,
        name: 'Room A',
        capacity: 0,
        isActive: true,
      },
    ];
    await db.insert(rooms).values(roomList);
    console.log('✅ Rooms seeded');

    /* SEATS (generate simple 5x10 per room: A-E × 1..10; VIP: col 1-2) */
    await db.delete(seats);
    const seatInserts: (typeof seats.$inferInsert)[] = [];
    const rowsAZ = ['A', 'B', 'C', 'D', 'E'];
    for (const r of roomList) {
      for (const row of rowsAZ) {
        for (let col = 1; col <= 10; col++) {
          const type = col <= 2 ? SEAT_TYPE.VIP : SEAT_TYPE.REGULAR;
          const price = String(col <= 2 ? 120_000 : 80_000);
          seatInserts.push({
            id: uid(),
            roomId: r.id!,
            seatNumber: `${row}${col}`,
            row,
            column: col,
            type,
            price,
            isActive: true,
          });
        }
      }
    }
    await db.insert(seats).values(seatInserts);
    console.log(`✅ Seats seeded (${seatInserts.length})`);

    await db.delete(show_times);
    const movieRows = await db.select().from(movies);
    const showtimeInserts: (typeof show_times.$inferInsert)[] = [];
    const startBase = new Date();
    startBase.setMinutes(0, 0, 0);

    function at(d: Date, h: number, m = 0) {
      const t = new Date(d);
      t.setHours(h, m, 0, 0);
      return t;
    }

    const baseSlots = [10, 14, 19];
    for (const r of roomList) {
      const cin = [cgv1, cgv2].find((c) => c.id === r.cinemaId)!;

      movieRows.slice(0, 2).forEach((mv, i) => {
        const d1 = new Date(startBase);
        d1.setDate(d1.getDate() + 1);
        const d2 = new Date(startBase);
        d2.setDate(d2.getDate() + 2);

        showtimeInserts.push(
          {
            id: uid(),
            movieId: mv.id!,
            cinemaId: cin.id!,
            roomId: r.id!,
            startsAt: at(d1, baseSlots[0] + i * 3),
            price: '90000.00',
            totalSeats: 50,
            bookedSeats: 0,
            isActive: true,
          },
          {
            id: uid(),
            movieId: mv.id!,
            cinemaId: cin.id!,
            roomId: r.id!,
            startsAt: at(d1, baseSlots[1] + i * 3),
            price: '90000.00',
            totalSeats: 50,
            bookedSeats: 0,
            isActive: true,
          },
          {
            id: uid(),
            movieId: mv.id!,
            cinemaId: cin.id!,
            roomId: r.id!,
            startsAt: at(d2, baseSlots[2] + i * 3, 30),
            price: '100000.00',
            totalSeats: 50,
            bookedSeats: 0,
            isActive: true,
          },
        );
      });
    }

    await db.insert(show_times).values(showtimeInserts);
    console.log(`✅ show_times seeded (${showtimeInserts.length})`);

    /* BOOKINGS (+ booking_seats, payments, tickets) */
    await db.delete(bookings);
    await db.delete(bookingSeats);
    await db.delete(payments);
    await db.delete(tickets);

    const [u1, u2] = await db.select().from(users).limit(2);
    const futureShow = await db
      .select({
        id: show_times.id,
        roomId: show_times.roomId,
        startsAt: show_times.startsAt,
        price: show_times.price,
      })
      .from(show_times)
      .limit(3);

    // pick some seats of first showtime
    const st = futureShow[0];
    const someSeats = await db
      .select({ id: seats.id, price: seats.price })
      .from(seats)
      .where(
        and(
          eq(seats.roomId, st.roomId),
          inArray(seats.seatNumber, ['A1', 'A2', 'B3', 'B4']),
        ),
      );

    // Booking 1: CONFIRMED + PAID
    const b1 = {
      id: uid(),
      bookingNumber: bookingNo(),
      userId: u1?.id,
      showtimeId: st.id!,
      status: BOOKING_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.PAID,
      expiresAt: null,
      confirmedAt: new Date(),
      currency: 'VND',
      subtotalAmount: someSeats
        .reduce((s, x) => s + Number(x.price), 0)
        .toFixed(2),
      discountAmount: '0.00',
      taxAmount: '0.00',
      feeAmount: '0.00',
      totalAmount: someSeats
        .reduce((s, x) => s + Number(x.price), 0)
        .toFixed(2),
      notes: 'seed: confirmed & paid',
    } as const;

    await db.transaction(async (tx) => {
      await tx.insert(bookings).values(b1);

      // composite PK: (showtime_id, seat_id)
      await tx.insert(bookingSeats).values(
        someSeats.map((s) => ({
          bookingId: b1.id,
          showtimeId: b1.showtimeId,
          seatId: s.id!,
          unitPrice: String(s.price),
        })),
      );

      // increment bookedSeats
      await tx
        .update(show_times)
        .set({
          bookedSeats: sql`${show_times.bookedSeats} + ${someSeats.length}`,
        })
        .where(eq(show_times.id, b1.showtimeId));

      // payment + tickets
      await tx.insert(payments).values({
        id: uid(),
        bookingId: b1.id,
        amount: b1.totalAmount,
        currency: 'VND',
        method: 'CASH',
        status: PAYMENT_STATUS.PAID,
        transactionId: 'SEED-TX-' + Math.floor(Math.random() * 1e6),
        processedAt: new Date(),
      });

      await tx.insert(tickets).values(
        someSeats.map((s) => ({
          id: uid(),
          bookingId: b1.id,
          showtimeId: b1.showtimeId,
          seatId: s.id!,
          status: TICKET_STATUS.ISSUED,
          qrToken: qr(),
          issuedAt: new Date(),
          version: 1,
        })),
      );
    });

    // Booking 2: PENDING (holding)
    const st2 = futureShow[1];
    const holdSeats = await db
      .select({ id: seats.id, price: seats.price })
      .from(seats)
      .where(
        and(
          eq(seats.roomId, st2.roomId),
          inArray(seats.seatNumber, ['C5', 'C6']),
        ),
      );

    const b2 = {
      id: uid(),
      bookingNumber: bookingNo(),
      userId: u2?.id,
      showtimeId: st2.id!,
      status: BOOKING_STATUS.PENDING,
      paymentStatus: PAYMENT_STATUS.PENDING,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      currency: 'VND',
      subtotalAmount: holdSeats
        .reduce((s, x) => s + Number(x.price), 0)
        .toFixed(2),
      discountAmount: '0.00',
      taxAmount: '0.00',
      feeAmount: '0.00',
      totalAmount: holdSeats
        .reduce((s, x) => s + Number(x.price), 0)
        .toFixed(2),
      notes: 'seed: pending (holding seats)',
    } as const;

    await db.transaction(async (tx) => {
      await tx.insert(bookings).values(b2);

      await tx.insert(bookingSeats).values(
        holdSeats.map((s) => ({
          bookingId: b2.id,
          showtimeId: b2.showtimeId,
          seatId: s.id!,
          unitPrice: String(s.price),
        })),
      );

      await tx
        .update(show_times)
        .set({
          bookedSeats: sql`${show_times.bookedSeats} + ${holdSeats.length}`,
        })
        .where(eq(show_times.id, b2.showtimeId));
    });

    console.log('✅ Bookings/Payments/Tickets seeded');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
