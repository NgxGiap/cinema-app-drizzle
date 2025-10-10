export type User = {
  id: Id;
  name: string;
  email: string;
  role?: string;
  isActive?: boolean;
  phone?: string;
  avatarUrl?: string;
};
export type Id = string;

export type MovieState = 'COMING_SOON' | 'NOW_SHOWING' | 'ENDED';
export type SeatType = 'REGULAR' | 'VIP' | 'COUPLE' | 'DISABLED';
export type SeatStatus = 'available' | 'holding' | 'booked';
export type PaymentMethod =
  | 'CARD'
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'VNPAY'
  | 'MOMO'
  | 'STRIPE'
  | 'PAYPAL';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type BookingStatus =
  | 'PENDING'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED';
export type TicketStatus = 'ISSUED' | 'CHECKED_IN' | 'VOIDED' | 'REFUNDED';

export type ApiHeader = {
  success: boolean;
  code: string;
  message: string;
  timestamp: string;
  requestId?: string;
};
export type ApiResponse<T> = { header: ApiHeader; data: T | null };

export type CastItem = { name: string; role?: string };
export type Movie = {
  id: Id;
  title: string;
  slug: string;
  releaseDate?: string;
  runtimeMinutes?: number;
  genres: string[];
  ratingCode?: string;
  originalLanguage?: string;
  posterUrl: string;
  trailerUrl?: string;
  state: MovieState;
  directors?: string[];
  cast?: CastItem[];
  description?: string;
};

export type Cinema = {
  id: Id;
  name: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  roomsCount?: number;
  rooms?: Room[];
};
export type Room = {
  id: Id;
  cinemaId: Id;
  name: string;
  isActive: boolean;
  capacity?: number;
};

export type Showtime = {
  id: Id;
  movieId: Id;
  cinemaId: Id;
  roomId: Id;
  startAt?: string;
  startsAt?: string;
  format?: string;
  basePrice?: string;
  price?: string;
  isActive: boolean;
  movie?: Movie;
  cinema?: Cinema;
  room?: Room;
  totalSeats?: number;
  bookedSeats?: number;
  availableSeats?: number;
};

export type SeatMapItem = {
  id: Id;
  seatNumber: string;
  row: string;
  column: number;
  type: SeatType;
  price: string;
  isActive: boolean;
  status: SeatStatus;
};

export type ComboItem = { id: Id; name: string; price: string; quantity: number };

export type HoldPayload = { showtimeId: Id; seatIds: Id[]; combos?: ComboItem[] };

export type Booking = {
  id: Id;
  bookingNumber: string;
  userId?: Id;
  showtimeId: Id;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  expiresAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  refundedAt?: string;
  currency: string;
  subtotalAmount: string;
  discountAmount: string;
  taxAmount: string;
  feeAmount: string;
  totalAmount: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentIntentRequest = { bookingId: Id; method: PaymentMethod };
export type Payment = {
  id: Id;
  bookingId: Id;
  amount: string;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type PaymentIntentResponse = { payment: Payment; redirectUrl?: string; qrData?: string };

export type Ticket = {
  id: Id;
  bookingId: Id;
  showtimeId?: Id;
  seatId?: Id;
  qrData: string;
  seatLabels?: string[];
  seatNumber?: string;
  row?: string;
  column?: number;
  cinemaName?: string;
  movieTitle?: string;
  startAt?: string;
  status: TicketStatus;
  checkedInAt?: string;
  checkedInGate?: string;
};
