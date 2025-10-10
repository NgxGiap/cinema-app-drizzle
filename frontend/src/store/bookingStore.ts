import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Id } from '../types';

type BookingState = {
  movieId?: Id;
  cinemaId?: Id;
  roomId?: Id;
  showtimeId?: Id;
  selectedSeatIds: Id[];
  combos: { id: Id; name: string; price: string; quantity: number }[];
  bookingId?: Id;
  expiresAt?: string;
  amount?: string;
  paymentId?: Id;
  setContext(p: { movieId: Id; cinemaId: Id; roomId: Id; showtimeId: Id }): void;
  toggleSeat(id: Id): void;
  setCombos(items: { id: Id; name: string; price: string; quantity: number }[]): void;
  setHold(p: { bookingId: Id; expiresAt: string; amount: string }): void;
  setPayment(id: Id): void;
  reset(): void;
};

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      movieId: undefined,
      cinemaId: undefined,
      roomId: undefined,
      showtimeId: undefined,
      selectedSeatIds: [],
      combos: [],
      bookingId: undefined,
      expiresAt: undefined,
      amount: undefined,
      paymentId: undefined,

      setContext: ({ movieId, cinemaId, roomId, showtimeId }) =>
        set({ movieId, cinemaId, roomId, showtimeId }),

      toggleSeat: (id) =>
        set((state) => ({
          selectedSeatIds: state.selectedSeatIds.includes(id)
            ? state.selectedSeatIds.filter((sid) => sid !== id)
            : [...state.selectedSeatIds, id],
        })),

      setCombos: (items) => set({ combos: items }),

      setHold: ({ bookingId, expiresAt, amount }) =>
        set({
          bookingId,
          expiresAt,
          amount,
          selectedSeatIds: [],
        }),

      setPayment: (id) => set({ paymentId: id }),

      reset: () =>
        set({
          movieId: undefined,
          cinemaId: undefined,
          roomId: undefined,
          showtimeId: undefined,
          selectedSeatIds: [],
          combos: [],
          bookingId: undefined,
          expiresAt: undefined,
          amount: undefined,
          paymentId: undefined,
        }),
    }),
    {
      name: 'booking-storage',
      partialize: (state) => ({
        // ✅ Context
        movieId: state.movieId,
        cinemaId: state.cinemaId,
        roomId: state.roomId,
        showtimeId: state.showtimeId,
        // ✅ Seats
        selectedSeatIds: state.selectedSeatIds,
        // ✅ THÊM booking details
        bookingId: state.bookingId,
        expiresAt: state.expiresAt,
        amount: state.amount,
        paymentId: state.paymentId,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<BookingState>),
        selectedSeatIds: (persistedState as Partial<BookingState>)?.selectedSeatIds ?? [],
      }),
    },
  ),
);
