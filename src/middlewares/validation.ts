import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.fail('Validation failed', 400, errors.array());
  }
  next();
};

export const validateLogin = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

export const validateRegister = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'staff', 'user'])
    .withMessage('Invalid role'),
  handleValidationErrors,
];

const movieStateEnum = [
  'COMING_SOON',
  'NOW_SHOWING',
  'ENDED',
  'coming_soon',
  'now_showing',
  'ended',
] as const;

export const validateMovieListQuery = [
  query('q').optional().isString().trim().isLength({ min: 1, max: 100 }),
  query('state').optional().isIn(movieStateEnum),
  query('fromReleaseDate').optional().isISO8601(),
  query('toReleaseDate').optional().isISO8601(),
];

export const validateMovieCreate = [
  body('slug').isString().trim().isLength({ min: 1, max: 150 }),
  body('title').isString().trim().isLength({ min: 1, max: 250 }),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1 })
    .isLength({ max: 5000 }),
  body('runtimeMinutes').optional().isInt({ min: 0 }).toInt(),
  body('releaseDate').optional().isISO8601(),
  body('state').optional().isIn(movieStateEnum),
  body('posterUrl').optional().isURL(),
  body('trailerUrl').optional().isURL(),

  body('genres')
    .optional()
    .custom((v) => Array.isArray(v) || typeof v === 'string'),
  body('directors')
    .optional()
    .custom((v) => Array.isArray(v) || typeof v === 'string'),
  body('cast')
    .optional()
    .custom((v) => Array.isArray(v) || typeof v === 'string'),

  body('ratingCode').optional().isString().trim().isLength({ min: 1, max: 10 }),
  body('originalLanguage')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 10 }),
];

export const validateMovieUpdate = [
  body('slug').optional().isString().trim().isLength({ min: 1, max: 150 }),
  body('title').optional().isString().trim().isLength({ min: 1, max: 250 }),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1 })
    .isLength({ max: 5000 }),
  body('runtimeMinutes').optional().isInt({ min: 0 }).toInt(),
  body('releaseDate').optional().isISO8601(),
  body('state').optional().isIn(movieStateEnum),
  body('posterUrl').optional().isURL(),
  body('trailerUrl').optional().isURL(),
  body('genres')
    .optional()
    .custom((v) => Array.isArray(v) || typeof v === 'string'),
  body('directors')
    .optional()
    .custom((v) => Array.isArray(v) || typeof v === 'string'),
  body('cast')
    .optional()
    .custom((v) => Array.isArray(v) || typeof v === 'string'),
  body('ratingCode').optional().isString().trim().isLength({ min: 1, max: 10 }),
  body('originalLanguage')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 10 }),
];

export const validateSlugParam = [
  param('slug').isString().trim().isLength({ min: 1 }),
];

/** GET /cinemas?city=&isActive=&q=&page=&pageSize= */
export const validateCinemaListQuery = [
  query('city').optional().isString().trim().isLength({ min: 1 }),
  query('isActive').optional().isBoolean().toBoolean(),
  query('q').optional().isString().trim().isLength({ min: 1, max: 100 }),
];

/** POST /cinemas */
export const validateCinemaCreate = [
  body('name').isString().trim().isLength({ min: 1, max: 150 }),
  body('address').isString().trim().isLength({ min: 1, max: 250 }),
  body('city').isString().trim().isLength({ min: 1, max: 100 }),
  body('phone').optional().isString().trim().isLength({ min: 3, max: 50 }),
  body('email').optional().isEmail(),
  body('isActive').optional().isBoolean().toBoolean(),
];

/** PUT /cinemas/:id */
export const validateCinemaUpdate = [
  body('name').optional().isString().trim().isLength({ min: 1, max: 150 }),
  body('address').optional().isString().trim().isLength({ min: 1, max: 250 }),
  body('city').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('phone').optional().isString().trim().isLength({ min: 3, max: 50 }),
  body('email').optional().isEmail(),
  body('isActive').optional().isBoolean().toBoolean(),
];

const seatTypeEnum = [
  'REGULAR',
  'VIP',
  'COUPLE',
  'DISABLED',
  'regular',
  'vip',
  'couple',
  'disabled',
] as const;

/** GET /seats?roomId=&row=&type=&isActive=&q=&page=&pageSize= */
export const validateSeatListQuery = [
  query('roomId').optional().isString().trim().isLength({ min: 1 }),
  query('row').optional().isString().trim().isLength({ min: 1, max: 5 }),
  query('type').optional().isIn(seatTypeEnum),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be boolean')
    .toBoolean(),
  query('q').optional().isString().trim().isLength({ min: 1, max: 50 }),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 200 }).toInt(),
];

/** GET /seats/rooms/:roomId/show_times/:showtimeId/seat-map */
export const validateSeatMapParams = [
  param('roomId').isString().trim().isLength({ min: 1 }),
  param('showtimeId').isString().trim().isLength({ min: 1 }),
];

/** Param :id cho get/update/delete */
export const validateSeatIdParam = [
  param('id').isString().trim().isLength({ min: 1 }),
];

/** POST /seats */
export const validateSeatCreate = [
  body('roomId')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('roomId is required'),
  body('seatNumber').isString().trim().isLength({ min: 1, max: 10 }),
  body('row').isString().trim().isLength({ min: 1, max: 5 }),
  body('column').isInt({ min: 1 }).withMessage('column must be >= 1').toInt(),
  body('type').optional().isIn(seatTypeEnum),
  body('price')
    .isString()
    .trim()
    .matches(/^\d+(\.\d{1,2})?$/)
    .withMessage('price must be a decimal string (e.g., "90000.00")'),
  body('isActive').optional().isBoolean().toBoolean(),
];

/** POST /seats/bulk  { items: NewSeat[] } */
export const validateSeatCreateMany = [
  body('items').isArray({ min: 1 }),
  body('items.*.roomId').isString().trim().isLength({ min: 1 }),
  body('items.*.seatNumber').isString().trim().isLength({ min: 1, max: 10 }),
  body('items.*.row').isString().trim().isLength({ min: 1, max: 5 }),
  body('items.*.column').isInt({ min: 1 }).toInt(),
  body('items.*.type').optional().isIn(seatTypeEnum),
  body('items.*.price')
    .isString()
    .trim()
    .matches(/^\d+(\.\d{1,2})?$/),
  body('items.*.isActive').optional().isBoolean().toBoolean(),
];

/** PUT /seats/:id */
export const validateSeatUpdate = [
  body('roomId').optional().isString().trim().isLength({ min: 1 }),
  body('seatNumber').optional().isString().trim().isLength({ min: 1, max: 10 }),
  body('row').optional().isString().trim().isLength({ min: 1, max: 5 }),
  body('column').optional().isInt({ min: 1 }).toInt(),
  body('type').optional().isIn(seatTypeEnum),
  body('price')
    .optional()
    .isString()
    .trim()
    .matches(/^\d+(\.\d{1,2})?$/),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const validateIdParam = [
  param('id').isString().trim().isLength({ min: 1 }),
];

/** GET /show_times?cinemaId=&movieId=&roomId=&from=&to=&isActive= */
export const validateShowtimeListQuery = [
  query('cinemaId').optional().isString().trim().isLength({ min: 1 }),
  query('movieId').optional().isString().trim().isLength({ min: 1 }),
  query('roomId').optional().isString().trim().isLength({ min: 1 }),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('isActive').optional().isBoolean().toBoolean(),
];

export const validateUserCreation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'staff', 'user'])
    .withMessage('Invalid role'),
  handleValidationErrors,
];

export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100'),
  handleValidationErrors,
];

export const validateShowtimeCreation = [
  body('movieId').isString().trim().isLength({ min: 1 }),
  body('cinemaId').isString().trim().isLength({ min: 1 }),
  body('roomId').optional().isString().trim().isLength({ min: 1 }),
  body('price')
    .isString()
    .trim()
    .matches(/^\d+(\.\d{1,2})?$/),
  body('isActive').optional().isBoolean().toBoolean(),

  body().custom((val) => {
    const hasStartsAt = typeof val?.startsAt === 'string';
    const hasPair =
      typeof val?.showDate === 'string' && typeof val?.showTime === 'string';
    if (!hasStartsAt && !hasPair) {
      throw new Error('Provide startsAt (ISO) or showDate + showTime');
    }
    return true;
  }),
];

/** PUT /show_times/:id */
export const validateShowtimeUpdate = [
  body('movieId').optional().isString().trim().isLength({ min: 1 }),
  body('cinemaId').optional().isString().trim().isLength({ min: 1 }),
  body('roomId').optional().isString().trim().isLength({ min: 1 }),
  body('price')
    .optional()
    .isString()
    .trim()
    .matches(/^\d+(\.\d{1,2})?$/),
  body('isActive').optional().isBoolean().toBoolean(),
  body('startsAt').optional().isISO8601(),
  body('showDate').optional().isISO8601(),
  body('showTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
];

/** Rooms */
export const validateRoomListQuery = [
  query('cinemaId').optional().isString().trim().isLength({ min: 1 }),
  query('isActive').optional().isBoolean().toBoolean(),
  query('q').optional().isString().trim().isLength({ min: 1, max: 100 }),
];

export const validateRoomCreate = [
  body('cinemaId').isString().trim().isLength({ min: 1 }),
  body('name').isString().trim().isLength({ min: 1, max: 120 }),
  body('capacity').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  body('seatingMap')
    .optional()
    .custom((v) => typeof v === 'object' && v !== null),
];

export const validateRoomUpdate = [
  body('cinemaId').optional().isString().trim().isLength({ min: 1 }),
  body('name').optional().isString().trim().isLength({ min: 1, max: 120 }),
  body('capacity').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  body('seatingMap')
    .optional()
    .custom((v) => typeof v === 'object' || v === null),
];

export const validateSeatLayout = [
  body('defaultPrice').isString().trim().isLength({ min: 1 }),
  body('blocks').isArray({ min: 1 }),
];

export const validateBookingCreation = [
  body('showtimeId')
    .notEmpty()
    .withMessage('Showtime ID is required')
    .isUUID()
    .withMessage('Valid showtime ID required'),
  body('seatIds')
    .isArray({ min: 1, max: 8 })
    .withMessage('seatIds must be an array with 1-8 seats')
    .custom((seatIds) => {
      // Check if all elements are valid UUIDs
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!seatIds.every((id: string) => uuidRegex.test(id))) {
        throw new Error('All seat IDs must be valid UUIDs');
      }
      // Check for duplicates
      if (new Set(seatIds).size !== seatIds.length) {
        throw new Error('Duplicate seat IDs are not allowed');
      }
      return true;
    }),
  body('customerName')
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2-100 characters'),
  body('customerEmail')
    .notEmpty()
    .withMessage('Customer email is required')
    .isEmail()
    .withMessage('Valid email address required'),
  body('customerPhone')
    .optional()
    .matches(/^[\+]?[0-9\s\-\(\)]{10,20}$/)
    .withMessage('Invalid phone number format'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
  handleValidationErrors,
];

function bodyHasSeatIds(val: unknown): boolean {
  if (!val || typeof val !== 'object') return false;
  const x = (val as Record<string, unknown>).seatIds;
  return (
    Array.isArray(x) &&
    x.length > 0 &&
    x.every((v: unknown) => typeof v === 'string' && v.trim().length > 0)
  );
}

function bodyHasSeatsArray(val: unknown): boolean {
  if (!val || typeof val !== 'object') return false;
  const x = (val as Record<string, unknown>).seats;
  if (!Array.isArray(x) || x.length === 0) return false;
  return x.every((v: unknown) => {
    if (!v || typeof v !== 'object') return false;
    const sid = (v as Record<string, unknown>).seatId;
    return typeof sid === 'string' && sid.trim().length > 0;
  });
}

/** Validation cho POST /bookings/hold */
export const validateBookingHold = [
  body('showtimeId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('showtimeId is required'),

  body().custom((val: unknown) => {
    if (bodyHasSeatIds(val) || bodyHasSeatsArray(val)) return true;
    throw new Error('Provide seatIds: string[] or seats: { seatId: string }[]');
  }),

  handleValidationErrors,
];

const paymentMethodEnum = [
  'CARD',
  'CASH',
  'BANK_TRANSFER',
  'VNPAY',
  'MOMO',
  'STRIPE',
  'PAYPAL',
] as const;
const paymentStatusEnum = [
  'PENDING',
  'PROCESSING',
  'PAID',
  'FAILED',
  'REFUNDED',
] as const;

export const validatePaymentIntent = [
  body('bookingId').isString().trim().isLength({ min: 1 }),
  body('amount')
    .optional()
    .isString()
    .trim()
    .matches(/^\d+(\.\d{1,2})?$/),
  body('currency').optional().isString().trim().isLength({ min: 1, max: 5 }),
  body('method').isIn(paymentMethodEnum),
  body('transactionId').optional().isString().trim().isLength({ min: 1 }),
];

export const validatePaymentWebhook = [
  body('transactionId').optional().isString().trim().isLength({ min: 1 }),
  body('bookingId').optional().isString().trim().isLength({ min: 1 }),
  body('status').isIn(paymentStatusEnum),
  body('failedReason')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 }),
  body('processedAt').optional().isISO8601(),
];

export const validateTicketScan = [
  body('qrToken').isString().trim().isLength({ min: 1 }),
  body('gate').optional().isString().trim().isLength({ min: 1, max: 50 }),
];

export const validateBookingIdParam = [
  param('bookingId').isString().trim().isLength({ min: 1 }),
];

export const validatePaymentUpdate = [
  body('paymentStatus')
    .isIn(['pending', 'paid', 'failed', 'refunded'])
    .withMessage('Invalid payment status'),
  body('transactionId')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Transaction ID must be 1-100 characters'),
  handleValidationErrors,
];

export const validateBookingQuery = [
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'cancelled', 'expired'])
    .withMessage('Invalid booking status'),
  query('paymentStatus')
    .optional()
    .isIn(['pending', 'paid', 'failed', 'refunded'])
    .withMessage('Invalid payment status'),
  query('userId').optional().isUUID().withMessage('Invalid user ID format'),
  query('showtimeId')
    .optional()
    .isUUID()
    .withMessage('Invalid showtime ID format'),
  query('movieId').optional().isUUID().withMessage('Invalid movie ID format'),
  query('cinemaId').optional().isUUID().withMessage('Invalid cinema ID format'),
  query('fromDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid fromDate format (use YYYY-MM-DD)'),
  query('toDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid toDate format (use YYYY-MM-DD)'),
  query('bookingNumber')
    .optional()
    .matches(/^BK\d{8}\d{6}[A-Z0-9]{4}$/)
    .withMessage('Invalid booking number format'),
  handleValidationErrors,
];

export const validateConfirmBooking = [
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'online', 'bank_transfer', 'wallet'])
    .withMessage('Invalid payment method'),
  handleValidationErrors,
];

export const validateCancelBooking = [
  body('reason')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Cancellation reason must not exceed 200 characters'),
  handleValidationErrors,
];

export const validateStatsQuery = [
  query('fromDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid fromDate format (use YYYY-MM-DD)'),
  query('toDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid toDate format (use YYYY-MM-DD)'),
  handleValidationErrors,
];
