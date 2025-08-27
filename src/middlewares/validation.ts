import { Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';

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

// Validation rules for different entities
export const validateMovieCreation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('duration')
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer'),
  body('releaseDate')
    .isISO8601()
    .withMessage('Release date must be a valid date'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description too long'),
  handleValidationErrors,
];

export const validateCinemaCreation = [
  body('name').notEmpty().withMessage('Cinema name is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('phone').optional().isString().withMessage('Phone must be a string'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  handleValidationErrors,
];

export const validateSeatCreation = [
  body('cinemaId')
    .notEmpty()
    .withMessage('Cinema ID is required')
    .isUUID()
    .withMessage('Valid cinema ID required'),
  body('seatNumber')
    .notEmpty()
    .withMessage('Seat number is required')
    .isLength({ min: 1, max: 10 })
    .withMessage('Seat number must be 1-10 characters'),
  body('row')
    .notEmpty()
    .withMessage('Row is required')
    .isLength({ min: 1, max: 5 })
    .withMessage('Row must be 1-5 characters'),
  body('column')
    .isInt({ min: 1 })
    .withMessage('Column must be a positive integer'),
  body('type')
    .optional()
    .isIn(['regular', 'vip', 'couple', 'disabled'])
    .withMessage('Invalid seat type'),
  body('price')
    .isNumeric()
    .withMessage('Price must be a number')
    .custom((value) => {
      const num = Number(value);
      if (num <= 0) {
        throw new Error('Price must be greater than 0');
      }
      return true;
    }),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  handleValidationErrors,
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
  body('movieId')
    .notEmpty()
    .withMessage('Movie ID is required')
    .isUUID()
    .withMessage('Valid movie ID required'),
  body('cinemaId')
    .notEmpty()
    .withMessage('Cinema ID is required')
    .isUUID()
    .withMessage('Valid cinema ID required'),
  body('showDate')
    .notEmpty()
    .withMessage('Show date is required')
    .isISO8601()
    .withMessage('Valid date required (YYYY-MM-DD)'),
  body('showTime')
    .notEmpty()
    .withMessage('Show time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('Valid time required (HH:MM:SS)'),
  body('price')
    .isNumeric()
    .withMessage('Price must be a number')
    .custom((value) => {
      const num = Number(value);
      if (num <= 0) {
        throw new Error('Price must be greater than 0');
      }
      return true;
    }),
  handleValidationErrors,
];

export const validateShowtimeUpdate = [
  body('movieId').optional().isUUID().withMessage('Valid movie ID required'),
  body('cinemaId').optional().isUUID().withMessage('Valid cinema ID required'),
  body('showDate')
    .optional()
    .isISO8601()
    .withMessage('Valid date required (YYYY-MM-DD)'),
  body('showTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('Valid time required (HH:MM:SS)'),
  body('price')
    .optional()
    .isNumeric()
    .withMessage('Price must be a number')
    .custom((value) => {
      if (value !== undefined) {
        const num = Number(value);
        if (num <= 0) {
          throw new Error('Price must be greater than 0');
        }
      }
      return true;
    }),
  handleValidationErrors,
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
