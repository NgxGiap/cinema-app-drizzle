import { MOVIE_STATE, SEAT_TYPE } from '../db/schema';
import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';

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

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.fail('Validation failed', 400, errors.array());
  next();
};

export const toUpper = (v?: unknown) =>
  typeof v === 'string' ? v.toUpperCase() : v;

const MOVIE_STATE_ENUM: readonly string[] = Object.values(
  MOVIE_STATE,
) as string[];

const SEAT_TYPES = Object.values(SEAT_TYPE) as string[];

const toStringArray = (v: unknown): string[] | undefined => {
  if (Array.isArray(v)) {
    return v
      .map((x) => String(x))
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (typeof v === 'string') {
    return v
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return undefined;
};

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isoOrMysqlDatetime = (s: string) =>
  /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z)?$/.test(s) ||
  /^\d{4}-\d{2}-\d{2}$/.test(s);

export const validateAuthRegister = [
  body('name').isString().trim().isLength({ min: 1, max: 100 }),
  body('email').isEmail().isLength({ max: 255 }),
  body('password').isString().isLength({ min: 6, max: 255 }),
];

export const validateAuthLogin = [
  body('email').isEmail().isLength({ max: 255 }),
  body('password').isString().isLength({ min: 6, max: 255 }),
];

export const validateMovieListQuery = [
  query('q').optional().isString().trim().isLength({ min: 1, max: 200 }),
  query('state')
    .optional()
    .isString()
    .customSanitizer(toUpper)
    .isIn(MOVIE_STATE_ENUM as string[]),
  query('genre').optional().isString().trim().isLength({ min: 1, max: 60 }),
  query('releasedFrom')
    .optional()
    .isString()
    .custom((v) => isoOrMysqlDatetime(v))
    .withMessage('releasedFrom must be ISO/MYSQL datetime'),
  query('releasedTo')
    .optional()
    .isString()
    .custom((v) => isoOrMysqlDatetime(v))
    .withMessage('releasedTo must be ISO/MYSQL datetime'),
  query('durationMin').optional().isInt({ min: 1, max: 1000 }).toInt(),
  query('durationMax').optional().isInt({ min: 1, max: 1000 }).toInt(),
];

export const validateMovieCreate = [
  body('slug')
    .isString()
    .trim()
    .isLength({ min: 1, max: 220 })
    .custom((v) => slugRegex.test(v))
    .withMessage('slug must be lowercase, alphanumeric and hyphen-separated'),
  body('title').isString().trim().isLength({ min: 1, max: 255 }),
  body('description').optional().isString(),
  body('runtimeMinutes').isInt({ min: 1, max: 1000 }).toInt(),
  body('releaseDate')
    .isString()
    .custom((v) => isoOrMysqlDatetime(v))
    .withMessage('releaseDate must be ISO/MYSQL datetime'),
  body('state')
    .isString()
    .customSanitizer(toUpper)
    .isIn(MOVIE_STATE_ENUM as string[])
    .withMessage(`state must be one of: ${MOVIE_STATE_ENUM.join(', ')}`),

  body('posterUrl').optional().isURL().isLength({ max: 500 }),
  body('trailerUrl').optional().isURL().isLength({ max: 500 }),

  body('genres').optional().customSanitizer(toStringArray).isArray(),
  body('directors').optional().customSanitizer(toStringArray).isArray(),

  body('cast')
    .optional()
    .isArray()
    .custom((arr: unknown[]) => {
      if (!Array.isArray(arr)) return false;
      return arr.every((item) => {
        if (!item || typeof item !== 'object') return false;
        const castItem = item as Record<string, unknown>;
        const hasValidName =
          typeof castItem.name === 'string' && castItem.name.trim().length > 0;
        const hasValidRole =
          castItem.role === undefined ||
          (typeof castItem.role === 'string' &&
            castItem.role.trim().length > 0);
        return hasValidName && hasValidRole;
      });
    })
    .custom((arr: unknown[]) => {
      if (!Array.isArray(arr)) return false;
      return arr.every((item) => {
        if (!item || typeof item !== 'object') return false;
        const castItem = item as Record<string, unknown>;
        return (
          typeof castItem.name === 'string' &&
          castItem.name.trim().length > 0 &&
          (castItem.role === undefined || typeof castItem.role === 'string')
        );
      });
    }),

  body('ratingCode').optional().isString().trim().isLength({ min: 1, max: 10 }),
  body('originalLanguage')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 5 }),
];

export const validateMovieUpdate = [
  body('slug')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 220 })
    .custom((v) => slugRegex.test(v))
    .withMessage('slug must be lowercase, alphanumeric and hyphen-separated'),
  body('title').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('description').optional().isString(),
  body('runtimeMinutes').optional().isInt({ min: 1, max: 1000 }).toInt(),
  body('releaseDate')
    .optional()
    .isString()
    .custom((v) => isoOrMysqlDatetime(v))
    .withMessage('releaseDate must be ISO/MYSQL datetime'),
  body('state')
    .optional()
    .isString()
    .customSanitizer(toUpper)
    .isIn(MOVIE_STATE_ENUM as string[]),

  body('posterUrl').optional().isURL().isLength({ max: 500 }),
  body('trailerUrl').optional().isURL().isLength({ max: 500 }),

  body('genres').optional().customSanitizer(toStringArray).isArray(),
  body('directors').optional().customSanitizer(toStringArray).isArray(),
  body('cast')
    .optional()
    .isArray()
    .custom((arr: unknown[]) => {
      if (!Array.isArray(arr)) return false;
      return arr.every((item) => {
        if (!item || typeof item !== 'object') return false;
        const castItem = item as Record<string, unknown>;
        return (
          typeof castItem.name === 'string' &&
          castItem.name.trim().length > 0 &&
          (castItem.role === undefined || typeof castItem.role === 'string')
        );
      });
    }),

  body('ratingCode').optional().isString().trim().isLength({ min: 1, max: 10 }),
  body('originalLanguage')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 5 }),
];

export const validateSlugParam = [
  param('slug').isString().trim().isLength({ min: 1 }),
];

export const validateCinemaListQuery = [
  query('city').optional().isString().trim().isLength({ min: 1, max: 100 }),
  query('isActive').optional().isBoolean().toBoolean(),
  query('q').optional().isString().trim().isLength({ min: 1, max: 100 }),
];

export const validateCinemaCreate = [
  body('name').isString().trim().isLength({ min: 1, max: 255 }),
  body('address').isString().trim().isLength({ min: 1 }),
  body('city').isString().trim().isLength({ min: 1, max: 100 }),
  body('phone').optional().isString().trim().isLength({ max: 20 }),
  body('email').optional().isEmail().isLength({ max: 255 }),
];

export const validateCinemaUpdate = [
  body('name').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('address').optional().isString().trim().isLength({ min: 1 }),
  body('city').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('phone').optional().isString().trim().isLength({ max: 20 }),
  body('email').optional().isEmail().isLength({ max: 255 }),
];

export const validateSeatListQuery = [
  query('roomId').optional().isUUID().withMessage('roomId must be UUID'),
  query('q').optional().isString().trim().isLength({ min: 1, max: 10 }),
  query('type')
    .optional()
    .isString()
    .customSanitizer(toUpper)
    .isIn(SEAT_TYPES as string[]),
  query('isActive').optional().isBoolean().toBoolean(),
];

export const validateSeatMapQuery = [
  query('showtimeId').optional().isUUID(),
  query('roomId').optional().isUUID(),
  query().custom((value) => {
    if (!value.showtimeId && !value.roomId) {
      throw new Error('Either showtimeId or roomId is required');
    }
    return true;
  }),
];

export const validateSeatIdParam = [
  param('id').isUUID().withMessage('Invalid id'),
];

export const validateSeatCreate = [
  body('roomId').isUUID().withMessage('roomId is required and must be UUID'),
  body('seatNumber').isString().trim().isLength({ min: 1, max: 10 }),
  body('row').isString().trim().isLength({ min: 1, max: 5 }),
  body('column').isInt({ min: 1, max: 1000 }).toInt(),
  body('type')
    .optional()
    .isString()
    .customSanitizer(toUpper)
    .isIn(SEAT_TYPES as string[]),
  body('price')
    .custom((v) => typeof v === 'string' || typeof v === 'number')
    .withMessage('price must be string or number'),
  body('isActive').optional().isBoolean().toBoolean(),
];

type OverrideItem = {
  seatNumber: string;
  type?: string;
  price?: string | number;
  isActive?: boolean;
};
const isOverrideItem = (x: unknown): x is OverrideItem => {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  if (typeof r.seatNumber !== 'string' || r.seatNumber.trim() === '')
    return false;
  if (r.type !== undefined && typeof r.type !== 'string') return false;
  if (
    r.price !== undefined &&
    typeof r.price !== 'string' &&
    typeof r.price !== 'number'
  )
    return false;
  if (r.isActive !== undefined && typeof r.isActive !== 'boolean') return false;
  return true;
};

export const validateSeatLayoutPreview = [
  body('roomId').isUUID(),
  body('startRow').isString().trim().isLength({ min: 1, max: 5 }),
  body('rowCount').isInt({ min: 1, max: 200 }).toInt(),
  body('startColumn').isInt({ min: 1, max: 1000 }).toInt(),
  body('columnCount').isInt({ min: 1, max: 1000 }).toInt(),
  body('defaultType')
    .optional()
    .isString()
    .customSanitizer(toUpper)
    .isIn(SEAT_TYPES as string[]),
  body('defaultPrice')
    .optional()
    .custom((v) => typeof v === 'string' || typeof v === 'number'),
  body('isActive').optional().isBoolean().toBoolean(),
  body('skip').optional().customSanitizer(toStringArray).isArray(),
  body('overrides')
    .optional()
    .isArray()
    .custom((arr: unknown[]) => arr.every(isOverrideItem)),
];

export const validateSeatLayoutApply = [...validateSeatLayoutPreview];

export const validateSeatUpdate = [
  body('roomId').optional().isUUID(),
  body('seatNumber').optional().isString().trim().isLength({ min: 1, max: 10 }),
  body('row').optional().isString().trim().isLength({ min: 1, max: 5 }),
  body('column').optional().isInt({ min: 1, max: 1000 }).toInt(),
  body('type')
    .optional()
    .isString()
    .customSanitizer(toUpper)
    .isIn(SEAT_TYPES as string[]),
  body('price')
    .optional()
    .custom((v) => typeof v === 'string' || typeof v === 'number')
    .withMessage('price must be string or number'),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const validateIdParam = [param('id').isUUID().withMessage('Invalid id')];

const isDateLike = (s: unknown) =>
  typeof s === 'string' &&
  (/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?)?(?:Z)?$/.test(s) ||
    !Number.isNaN(Date.parse(s)));

export const validateShowtimeListQuery = [
  query('movieId').optional().isUUID(),
  query('cinemaId').optional().isUUID(),
  query('roomId').optional().isUUID(),
  query('from')
    .optional()
    .custom(isDateLike)
    .withMessage('from must be ISO/MySQL datetime'),
  query('to')
    .optional()
    .custom(isDateLike)
    .withMessage('to must be ISO/MySQL datetime'),
  query('priceMin').optional().isFloat({ min: 0 }).toFloat(),
  query('priceMax').optional().isFloat({ min: 0 }).toFloat(),
  query('isActive').optional().isBoolean().toBoolean(),
];

export const validateShowtimeCreate = [
  body('movieId').isUUID(),
  body('cinemaId').isUUID(),
  body('roomId').isUUID(),
  body('startsAt')
    .custom(isDateLike)
    .withMessage('startsAt must be ISO/MySQL datetime'),
  body('price')
    .custom((v) => typeof v === 'string' || typeof v === 'number')
    .withMessage('price must be string/number'),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const validateShowtimeUpdate = [
  body('movieId').optional().isUUID(),
  body('cinemaId').optional().isUUID(),
  body('roomId').optional().isUUID(),
  body('startsAt').optional().custom(isDateLike),
  body('price')
    .optional()
    .custom((v) => typeof v === 'string' || typeof v === 'number'),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const validateUserListQuery = [
  query('q').optional().isString().trim().isLength({ min: 1, max: 100 }),
  query('role').optional().isString().trim().customSanitizer(toUpper),
  query('isActive').optional().isBoolean().toBoolean(),
];

export const validateUserCreate = [
  body('name').isString().trim().isLength({ min: 1, max: 100 }),
  body('email').isEmail().isLength({ max: 255 }),
  body('password').isString().isLength({ min: 6, max: 255 }),
  body('role')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 20 })
    .customSanitizer(toUpper),
  body('isActive').optional().isBoolean().toBoolean(),
  body('phone').optional().isString().trim().isLength({ min: 3, max: 30 }),
  body('avatarUrl').optional().isURL(),
];

export const validateUserUpdate = [
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('email').optional().isEmail().isLength({ max: 255 }),
  body('password').optional().isString().isLength({ min: 6, max: 255 }),
  body('role')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 20 })
    .customSanitizer(toUpper),
  body('isActive').optional().isBoolean().toBoolean(),
  body('phone').optional().isString().trim().isLength({ min: 3, max: 30 }),
  body('avatarUrl').optional().isURL(),
];

export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 200 }).toInt(),
];

export const validateRoomListQuery = [
  query('cinemaId').optional().isUUID(),
  query('isActive').optional().isBoolean().toBoolean(),
  query('q').optional().isString().trim().isLength({ min: 1, max: 100 }),
];

export const validateRoomCreate = [
  body('cinemaId').isUUID().withMessage('cinemaId must be UUID'),
  body('name').isString().trim().isLength({ min: 1, max: 100 }),
  body('capacity').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  body('seatingMap')
    .optional()
    .custom((v) => typeof v === 'object' && v !== null),
];

export const validateRoomUpdate = [
  body('cinemaId').optional().isUUID(),
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('capacity').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  body('seatingMap')
    .optional()
    .custom((v) => typeof v === 'object' || v === null),
];

export const validateBookingListQuery = [
  query('showtimeId').optional().isUUID(),
  query('userId').optional().isUUID(),
  query('status')
    .optional()
    .isString()
    .isIn([
      'PENDING',
      'AWAITING_PAYMENT',
      'PAID',
      'CONFIRMED',
      'CANCELLED',
      'EXPIRED',
      'REFUNDED',
    ]),
  query('paymentStatus')
    .optional()
    .isString()
    .isIn(['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED']),
];

export const validateBookingHold = [
  body('showtimeId').isUUID().withMessage('showtimeId must be UUID'),
  body('sessionId')
    .isString()
    .trim()
    .isLength({ min: 8, max: 64 })
    .withMessage('sessionId 8..64 chars'),
  body('userId').optional().isUUID(),
  body('bookingId').optional().isUUID(),
  body('seatIds')
    .isArray({ min: 1 })
    .withMessage('seatIds must be a non-empty array')
    .bail()
    .custom((arr: unknown) => {
      if (!Array.isArray(arr)) return false;
      return arr.every((x): x is string => typeof x === 'string');
    })
    .withMessage('seatIds must be array of strings')
    .bail()
    .custom((arr: unknown) => {
      if (!Array.isArray(arr)) return false;
      return arr.every(
        (x): x is string =>
          typeof x === 'string' && /^[0-9a-fA-F-]{36}$/.test(x),
      );
    })
    .withMessage('each seatId must be a UUID'),
];

export const validateBookingCancel = [
  body('reason').optional().isString().trim().isLength({ max: 500 }),
];

export const validateBookingPaymentWebhook = [
  body('transactionId').isString().trim().isLength({ min: 3, max: 100 }),
  body('bookingId').isUUID(),
  body('status').isString().isIn(['PROCESSING', 'PAID', 'FAILED', 'REFUNDED']),
  body('amount')
    .optional()
    .custom((v) => typeof v === 'string' || typeof v === 'number'),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }),
  body('method')
    .optional()
    .isString()
    .isIn([...paymentMethodEnum] as string[]),
  body('gatewayResponse').optional().isString(),
  body('processedAt').optional().isISO8601().toDate(),
];

export const validatePaymentListQuery = [
  query('bookingId').optional().isUUID(),
  query('status')
    .optional()
    .isString()
    .isIn(['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED']),
  query('method')
    .optional()
    .isString()
    .isIn([...paymentMethodEnum] as string[]),
  query('currency').optional().isString().isLength({ min: 3, max: 3 }),
];

export const validatePaymentCreate = [
  body('bookingId').isUUID(),
  body('amount').custom((v) => typeof v === 'string' || typeof v === 'number'),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }),
  body('method')
    .optional()
    .isString()
    .isIn([...paymentMethodEnum] as string[]),
  body('transactionId').optional().isString().isLength({ min: 3, max: 100 }),
  body('status')
    .optional()
    .isString()
    .isIn([...paymentStatusEnum] as string[]),
  body('gatewayResponse').optional().isString(),
];

export const validatePaymentWebhook = [
  body('transactionId').isString().isLength({ min: 3, max: 100 }),
  body('bookingId').isUUID(),
  body('status').isString().isIn(['PROCESSING', 'PAID', 'FAILED', 'REFUNDED']),
  body('amount')
    .optional()
    .custom((v) => typeof v === 'string' || typeof v === 'number'),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }),
  body('method')
    .optional()
    .isString()
    .isIn([...paymentMethodEnum] as string[]),
  body('gatewayResponse').optional().isString(),
  body('processedAt').optional().isISO8601().toDate(),
];
export const validateTicketListQuery = [
  query('bookingId').optional().isUUID(),
  query('showtimeId').optional().isUUID(),
  query('seatId').optional().isUUID(),
  query('status')
    .optional()
    .isIn(['ISSUED', 'CHECKED_IN', 'VOIDED', 'REFUNDED']),
];

export const validateTicketIssueForBooking = [
  body('bookingId').isUUID(),
  body('regenerateIfExists').optional().isBoolean().toBoolean(),
];

export const validateTicketReissue = [
  body('reason').optional().isString().trim().isLength({ max: 500 }),
];

export const validateTicketCheckIn = [
  body('gate').optional().isString().trim().isLength({ min: 1, max: 50 }),
];

export const validateTicketVoid = [
  body('reason').optional().isString().trim().isLength({ max: 500 }),
];

export const validateTicketRefund = [
  body('reason').optional().isString().trim().isLength({ max: 500 }),
];

export const validateTicketVerifyQr = [
  body('qrToken').isString().trim().isLength({ min: 10, max: 64 }),
];

export const validateBookingIdParam = [
  param('bookingId').isUUID().withMessage('Invalid bookingId'),
];

export const validateTicketScan = [
  body('qrToken').isString().notEmpty().withMessage('qrToken is required'),
  body('gate').optional().isString().withMessage('gate must be a string'),
];
