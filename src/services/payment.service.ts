import { randomUUID } from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { bookings, payments } from '../db/schema';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../utils/errors/base';
import * as bookingSvc from './booking.service';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED';

export type PaymentMethod =
  | 'CARD'
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'VNPAY'
  | 'MOMO'
  | 'STRIPE'
  | 'PAYPAL';

export type CreateIntentInput = {
  bookingId: string;
  amount?: string;
  currency?: string;
  method: PaymentMethod;
  transactionId?: string;
  metadata?: unknown;
};

export type PaymentItem = {
  id: string;
  bookingId: string;
  amount: string;
  currency: string;
  method: string;
  status: PaymentStatus;
  transactionId: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WebhookUpdateInput = {
  transactionId?: string;
  bookingId?: string;
  status: PaymentStatus;
  gatewayResponse?: unknown;
  failedReason?: string;
  processedAt?: Date;
};

/* -------- helpers -------- */

function validateAmountString(s: string): void {
  if (!/^\d+(\.\d{1,2})?$/.test(s))
    throw new ValidationError('Invalid amount format');
}

async function getBookingOrThrow(id: string) {
  const [b] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);
  if (!b) throw new NotFoundError('Booking not found');
  return b;
}

/* -------- services -------- */

/** Tạo payment intent (PENDING/PROCESSING) gắn với 1 booking.
 *  Idempotency theo transactionId (nếu cung cấp).
 */
export async function createIntent(
  input: CreateIntentInput,
): Promise<PaymentItem> {
  const b = await getBookingOrThrow(input.bookingId);
  if (b.status === 'CANCELLED' || b.status === 'EXPIRED') {
    throw new ConflictError('Booking is not payable');
  }
  if (b.paymentStatus === 'PAID') {
    throw new ConflictError('Booking already PAID');
  }

  const amount = input.amount ?? String(b.totalAmount);
  validateAmountString(amount);
  const currency = input.currency ?? b.currency ?? 'VND';

  // Nếu đã có transactionId, kiểm tra trùng
  if (input.transactionId) {
    const [exist] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.transactionId, input.transactionId))
      .limit(1);
    if (exist) throw new ConflictError('Transaction already exists');
  }

  const id = randomUUID();
  const now = new Date();

  await db.insert(payments).values({
    id,
    bookingId: input.bookingId,
    amount,
    currency,
    method: input.method,
    status: 'PENDING',
    transactionId: input.transactionId ?? null,
    gatewayResponse: input.metadata ? JSON.stringify(input.metadata) : null,
    processedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  const item: PaymentItem = {
    id,
    bookingId: input.bookingId,
    amount,
    currency,
    method: input.method,
    status: 'PENDING',
    transactionId: input.transactionId ?? null,
    processedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  return item;
}

/** Cập nhật payment theo webhook/return từ cổng.
 *  - Ưu tiên locate theo transactionId; nếu không có, lấy payment mới nhất của bookingId.
 *  - Khi status = PAID ⇒ cập nhật bookings + issue tickets (idempotent).
 */
export async function updateByWebhook(
  input: WebhookUpdateInput,
): Promise<void> {
  if (!input.transactionId && !input.bookingId) {
    throw new ValidationError('transactionId or bookingId is required');
  }

  // 1) Locate payment
  let paymentRow:
    | { id: string; bookingId: string; status: PaymentStatus }
    | undefined;

  if (input.transactionId) {
    const [p] = await db
      .select({
        id: payments.id,
        bookingId: payments.bookingId,
        status: payments.status,
      })
      .from(payments)
      .where(eq(payments.transactionId, input.transactionId))
      .limit(1);

    if (p)
      paymentRow = {
        id: p.id,
        bookingId: p.bookingId,
        status: p.status as PaymentStatus,
      }; // ✅ cast hẹp
  } else {
    const [p] = await db
      .select({
        id: payments.id,
        bookingId: payments.bookingId,
        status: payments.status,
      })
      .from(payments)
      .where(eq(payments.bookingId, String(input.bookingId)))
      .orderBy(desc(payments.createdAt))
      .limit(1);

    if (p)
      paymentRow = {
        id: p.id,
        bookingId: p.bookingId,
        status: p.status as PaymentStatus,
      }; // ✅ cast hẹp
  }

  if (!paymentRow) throw new NotFoundError('Payment not found');

  // 2) Update payment row
  const updates: Partial<typeof payments.$inferInsert> = {};
  updates.status = input.status;
  if (typeof input.failedReason === 'string')
    updates.failedReason = input.failedReason;
  if (typeof input.gatewayResponse !== 'undefined') {
    updates.gatewayResponse =
      typeof input.gatewayResponse === 'string'
        ? input.gatewayResponse
        : JSON.stringify(input.gatewayResponse);
  }
  if (input.processedAt instanceof Date && !Number.isNaN(+input.processedAt)) {
    updates.processedAt = input.processedAt;
  } else if (
    input.status === 'PAID' ||
    input.status === 'FAILED' ||
    input.status === 'REFUNDED'
  ) {
    updates.processedAt = new Date();
  }

  await db.update(payments).set(updates).where(eq(payments.id, paymentRow.id));

  // 3) Side-effects theo status
  if (input.status === 'PAID') {
    await bookingSvc.markPaidAndIssueTickets(paymentRow.bookingId);
  } else if (input.status === 'FAILED') {
    // Optional: mark booking.paymentStatus FAILED
    await db
      .update(bookings)
      .set({ paymentStatus: 'FAILED' })
      .where(eq(bookings.id, paymentRow.bookingId));
  } else if (input.status === 'REFUNDED') {
    await db
      .update(bookings)
      .set({ paymentStatus: 'REFUNDED' })
      .where(eq(bookings.id, paymentRow.bookingId));
  }
}

export async function getById(id: string): Promise<PaymentItem> {
  const [p] = await db
    .select({
      id: payments.id,
      bookingId: payments.bookingId,
      amount: payments.amount,
      currency: payments.currency,
      method: payments.method,
      status: payments.status,
      transactionId: payments.transactionId,
      processedAt: payments.processedAt,
      createdAt: payments.createdAt,
      updatedAt: payments.updatedAt,
    })
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1);

  if (!p) throw new NotFoundError('Payment not found');

  return {
    id: p.id,
    bookingId: p.bookingId,
    amount: String(p.amount),
    currency: p.currency,
    method: p.method ?? 'CARD',
    status: p.status as PaymentStatus,
    transactionId: p.transactionId,
    processedAt: p.processedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
