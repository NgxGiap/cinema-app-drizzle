import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/booking.service';
import { makePagination } from '../utils/http';

export async function createBooking(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const {
      showtimeId,
      seatIds,
      customerName,
      customerEmail,
      customerPhone,
      notes,
    } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.fail('Authentication required', 401);
    }

    if (!showtimeId || !seatIds || !customerName || !customerEmail) {
      return res.fail(
        'Missing required fields: showtimeId, seatIds, customerName, customerEmail',
        400,
      );
    }

    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      return res.fail('seatIds must be a non-empty array', 400);
    }

    const booking = await svc.createBooking({
      userId: String(userId),
      showtimeId,
      seatIds,
      customerName,
      customerEmail,
      customerPhone,
      notes,
    });

    return res.ok(booking, 'Booking created successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function getBooking(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const booking = await svc.getBookingById(id);

    // Check if user can access this booking
    if (
      req.user?.role !== 'admin' &&
      req.user?.role !== 'manager' &&
      req.user?.role !== 'staff'
    ) {
      if (booking.userId !== req.user?.id) {
        return res.fail('You can only access your own bookings', 403);
      }
    }

    return res.ok(booking, 'Booking details');
  } catch (error) {
    next(error);
  }
}

export async function getBookingByNumber(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { bookingNumber } = req.params;
    const booking = await svc.getBookingByNumber(bookingNumber);

    // Check if user can access this booking
    if (
      req.user?.role !== 'admin' &&
      req.user?.role !== 'manager' &&
      req.user?.role !== 'staff'
    ) {
      if (booking.userId !== req.user?.id) {
        return res.fail('You can only access your own bookings', 403);
      }
    }

    return res.ok(booking, 'Booking details');
  } catch (error) {
    next(error);
  }
}

export async function listBookings(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);

    const filters: svc.BookingFilters = {};

    // Only admins/managers/staff can see all bookings
    if (
      req.user?.role === 'admin' ||
      req.user?.role === 'manager' ||
      req.user?.role === 'staff'
    ) {
      if (req.query.userId) filters.userId = String(req.query.userId);
      if (req.query.showtimeId)
        filters.showtimeId = String(req.query.showtimeId);
      if (req.query.movieId) filters.movieId = String(req.query.movieId);
      if (req.query.cinemaId) filters.cinemaId = String(req.query.cinemaId);
      if (req.query.status)
        filters.status = req.query.status as svc.BookingStatus;
      if (req.query.paymentStatus)
        filters.paymentStatus = req.query.paymentStatus as svc.PaymentStatus;
      if (req.query.fromDate) filters.fromDate = String(req.query.fromDate);
      if (req.query.toDate) filters.toDate = String(req.query.toDate);
      if (req.query.bookingNumber)
        filters.bookingNumber = String(req.query.bookingNumber);
    } else {
      // Regular users can only see their own bookings
      filters.userId = String(req.user?.id);
    }

    const { items, total } = await svc.listBookings(page, pageSize, filters);

    return res.ok(
      { items, total, pagination: makePagination(page, pageSize, total) },
      'Bookings fetched',
    );
  } catch (error) {
    next(error);
  }
}

export async function getUserBookings(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Number(req.query.pageSize) || 10);
    const userId = req.user?.id;

    if (!userId) {
      return res.fail('Authentication required', 401);
    }

    const { items, total } = await svc.getUserBookings(
      String(userId),
      page,
      pageSize,
    );

    return res.ok(
      { items, total, pagination: makePagination(page, pageSize, total) },
      'User bookings fetched',
    );
  } catch (error) {
    next(error);
  }
}

export async function confirmBooking(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;

    // First get the booking to check ownership
    const booking = await svc.getBookingById(id);

    // Check if user can confirm this booking
    if (
      req.user?.role !== 'admin' &&
      req.user?.role !== 'manager' &&
      req.user?.role !== 'staff'
    ) {
      if (booking.userId !== req.user?.id) {
        return res.fail('You can only confirm your own bookings', 403);
      }
    }

    const updatedBooking = await svc.confirmBooking(id, paymentMethod);
    return res.ok(updatedBooking, 'Booking confirmed successfully');
  } catch (error) {
    next(error);
  }
}

export async function cancelBooking(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // First get the booking to check ownership
    const booking = await svc.getBookingById(id);

    // Check if user can cancel this booking
    if (
      req.user?.role !== 'admin' &&
      req.user?.role !== 'manager' &&
      req.user?.role !== 'staff'
    ) {
      if (booking.userId !== req.user?.id) {
        return res.fail('You can only cancel your own bookings', 403);
      }
    }

    const updatedBooking = await svc.cancelBooking(id, reason);
    return res.ok(updatedBooking, 'Booking cancelled successfully');
  } catch (error) {
    next(error);
  }
}

export async function getSeatAvailability(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { showtimeId } = req.params;
    const availability = await svc.getBookingSeatAvailability(showtimeId);
    return res.ok(availability, 'Seat availability fetched');
  } catch (error) {
    next(error);
  }
}

export async function updatePaymentStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const { paymentStatus, transactionId } = req.body;

    if (
      !paymentStatus ||
      !['pending', 'paid', 'failed', 'refunded'].includes(paymentStatus)
    ) {
      return res.fail('Invalid payment status', 400);
    }

    // Only staff and above can update payment status
    if (
      req.user?.role !== 'admin' &&
      req.user?.role !== 'manager' &&
      req.user?.role !== 'staff'
    ) {
      return res.fail('Insufficient permissions', 403);
    }

    const updatedBooking = await svc.updateBookingPaymentStatus(
      id,
      paymentStatus as svc.PaymentStatus,
      transactionId,
    );

    return res.ok(updatedBooking, 'Payment status updated');
  } catch (error) {
    next(error);
  }
}

export async function expireBookings(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // Only admins can manually expire bookings
    if (req.user?.role !== 'admin') {
      return res.fail('Admin access required', 403);
    }

    const result = await svc.expireBookings();
    return res.ok(result, `${result.expired} bookings expired`);
  } catch (error) {
    next(error);
  }
}

export async function getBookingStats(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // Only managers and admins can view stats
    if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
      return res.fail('Insufficient permissions', 403);
    }

    const fromDate = req.query.fromDate
      ? String(req.query.fromDate)
      : undefined;
    const toDate = req.query.toDate ? String(req.query.toDate) : undefined;

    const stats = await svc.getBookingStats(fromDate, toDate);
    return res.ok(stats, 'Booking statistics');
  } catch (error) {
    next(error);
  }
}

// Webhook endpoint for payment gateway callbacks
export async function paymentWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // This would handle payment gateway webhooks
    // Implementation depends on the specific payment provider
    const { bookingId, status, transactionId } = req.body;

    // TODO: Verify webhook signature
    // TODO: Validate payment status with gateway

    if (status === 'success') {
      await svc.updateBookingPaymentStatus(bookingId, 'paid', transactionId);
    } else if (status === 'failed') {
      await svc.updateBookingPaymentStatus(bookingId, 'failed', transactionId);
    }

    return res.ok({ received: true }, 'Webhook processed');
  } catch (error) {
    next(error);
  }
}
