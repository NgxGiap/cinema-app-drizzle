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
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Invalid phone number'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  handleValidationErrors,
];

export const validateSeatCreation = [
  body('cinemaId').isUUID().withMessage('Valid cinema ID required'),
  body('seatNumber').notEmpty().withMessage('Seat number is required'),
  body('row').notEmpty().withMessage('Row is required'),
  body('column')
    .isInt({ min: 1 })
    .withMessage('Column must be a positive integer'),
  body('type')
    .isIn(['regular', 'vip', 'couple', 'disabled'])
    .withMessage('Invalid seat type'),
  body('price').isNumeric().withMessage('Price must be a number'),
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
