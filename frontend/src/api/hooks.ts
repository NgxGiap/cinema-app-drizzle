import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from './http';
import { endpoints } from './endpoints';
import {
  Movie,
  Cinema,
  Showtime,
  SeatMapItem,
  Booking,
  PaymentIntentRequest,
  PaymentIntentResponse,
  Ticket,
  User,
} from 'types';
import { useEffect } from 'react';

export function useMe(token?: string) {
  return useQuery<User>({
    queryKey: ['me'],
    queryFn: () => apiGet<User>(endpoints.auth.me(), token),
    enabled: !!token,
  });
}

export function useMovies() {
  return useQuery<{ items: Movie[] }>({
    queryKey: ['movies'],
    queryFn: () => apiGet<{ items: Movie[] }>(endpoints.movies.list()),
  });
}

export function useMovie(id: string) {
  return useQuery<Movie>({
    queryKey: ['movie', id],
    queryFn: () => apiGet<Movie>(endpoints.movies.detail(id)),
    enabled: !!id,
  });
}

export function useCinemas() {
  return useQuery<{ items: Cinema[] }>({
    queryKey: ['cinemas'],
    queryFn: () => apiGet<{ items: Cinema[] }>(endpoints.cinemas.list()),
  });
}

export function useShowtimes(params?: Record<string, string>) {
  const q = params ? new URLSearchParams(params).toString() : undefined;
  return useQuery<{ items: Showtime[] }>({
    queryKey: ['showtimes', q],
    queryFn: () => apiGet<{ items: Showtime[] }>(endpoints.showtimes.list(q)),
  });
}

export function useShowtime(id: string, token?: string) {
  return useQuery<Showtime>({
    queryKey: ['showtime', id, token],
    queryFn: () => apiGet<Showtime>(endpoints.showtimes.detail(id), token),
    enabled: !!id,
  });
}

export function useSeatMap(roomId: string, showtimeId: string, token?: string) {
  return useQuery<SeatMapItem[]>({
    queryKey: ['seatMap', roomId, showtimeId],
    queryFn: () => apiGet<SeatMapItem[]>(endpoints.seats.seatMap(roomId, showtimeId), token),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    enabled: Boolean(roomId && showtimeId),
  });
}

export function useHoldSeats(token?: string) {
  return useMutation({
    mutationFn: (payload: {
      showtimeId: string;
      seatIds: string[];
      sessionId: string;
      combos?: any[];
    }) => apiPost(endpoints.bookings.hold(), payload, token),
  });
}

export function useCancelBooking(token?: string) {
  return useMutation({
    mutationFn: (bookingId: string) => apiPost(endpoints.bookings.cancel(bookingId), {}, token),
  });
}

export function usePaymentIntent(token?: string) {
  return useMutation({
    mutationFn: (payload: PaymentIntentRequest) =>
      apiPost<PaymentIntentRequest, PaymentIntentResponse>(
        endpoints.payments.intent(),
        payload,
        token,
      ),
  });
}

export function usePaymentDetail(paymentId: string, token?: string) {
  return useQuery<PaymentIntentResponse>({
    queryKey: ['payment', paymentId],
    queryFn: () => apiGet<PaymentIntentResponse>(endpoints.payments.detail(paymentId), token),
    refetchInterval: 2000,
    enabled: !!paymentId,
  });
}

export function useTicketsByBooking(bookingId: string, token?: string) {
  return useQuery<{ items: Ticket[] }>({
    queryKey: ['tickets', bookingId],
    queryFn: () => apiGet<{ items: Ticket[] }>(endpoints.tickets.byBooking(bookingId), token),
    enabled: !!bookingId,
  });
}

export function useMyBookings(token?: string) {
  return useQuery<{ items: Booking[] }>({
    queryKey: ['myBookings'],
    queryFn: () => apiGet<{ items: Booking[] }>(endpoints.bookings.mine(), token),
    enabled: !!token,
  });
}
