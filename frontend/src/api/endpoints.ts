export const endpoints = {
  users: {
    list: () => `/users`,
    detail: (id: string) => `/users/${id}`,
  },
  auth: {
    login: () => `/auth/login`,
    register: () => `/auth/register`,
    me: () => `/users/me`,
  },
  movies: {
    list: (q?: string) => `/movies${q ? `?${q}` : ''}`,
    detail: (id: string) => `/movies/${id}`,
    bySlug: (slug: string) => `/movies/slug/${slug}`,
  },
  cinemas: {
    list: () => `/cinemas`,
    cities: () => `/cinemas/cities`,
    detail: (id: string) => `/cinemas/${id}`,
  },
  showtimes: {
    list: (q?: string) => `/showtimes${q ? `?${q}` : ''}`,
    upcoming: () => `/showtimes/upcoming`,
    detail: (id: string) => `/showtimes/${id}`,
  },
  seats: {
    seatMap: (roomId: string, showtimeId: string) =>
      `/seats/rooms/${roomId}/showtimes/${showtimeId}/seat-map`,
  },
  bookings: {
    hold: () => `/bookings/hold`,
    mine: () => `/bookings/mine`,
    detail: (id: string) => `/bookings/${id}`,
    cancel: (id: string) => `/bookings/${id}/cancel`,
  },
  payments: {
    intent: () => `/payments/intent`,
    detail: (id: string) => `/payments/${id}`,
  },
  tickets: {
    byBooking: (bookingId: string) => `/tickets/by-booking/${bookingId}`,
    detail: (id: string) => `/tickets/${id}`,
  },
} as const;
