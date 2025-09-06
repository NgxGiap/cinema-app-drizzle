import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/payment.service';

/** POST /payments/intent
 *  - Tạo bản ghi payments PENDING (và transactionId nếu có)
 *  - Trả về thông tin để FE redirect sang cổng (tuỳ bạn nối vào gateway thật)
 */
export async function createIntent(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const created = await svc.createIntent({
      bookingId: String(req.body.bookingId),
      amount: typeof req.body.amount === 'string' ? req.body.amount : undefined,
      currency:
        typeof req.body.currency === 'string' ? req.body.currency : undefined,
      method: String(req.body.method).toUpperCase() as svc.PaymentMethod,
      transactionId:
        typeof req.body.transactionId === 'string'
          ? req.body.transactionId
          : undefined,
      metadata:
        typeof req.body.metadata !== 'undefined'
          ? req.body.metadata
          : undefined,
    });
    return res.ok(created, 'Payment intent created');
  } catch (err) {
    next(err);
  }
}

/** POST /payments/webhook
 *  - Gateway gọi vào: transactionId (ưu tiên) + status
 */
export async function webhook(req: Request, res: Response, next: NextFunction) {
  try {
    const payload: svc.WebhookUpdateInput = {
      status: String(req.body.status).toUpperCase() as svc.PaymentStatus,
    };
    if (typeof req.body.transactionId === 'string' && req.body.transactionId)
      payload.transactionId = req.body.transactionId;
    if (typeof req.body.bookingId === 'string' && req.body.bookingId)
      payload.bookingId = req.body.bookingId;
    if (typeof req.body.failedReason === 'string')
      payload.failedReason = req.body.failedReason;
    if (typeof req.body.gatewayResponse !== 'undefined')
      payload.gatewayResponse = req.body.gatewayResponse;
    if (
      typeof req.body.processedAt === 'string' &&
      !Number.isNaN(+new Date(req.body.processedAt))
    ) {
      payload.processedAt = new Date(req.body.processedAt);
    }

    await svc.updateByWebhook(payload);
    return res.ok({ ok: true }, 'Webhook processed');
  } catch (err) {
    next(err);
  }
}

/** GET /payments/:id */
export async function getPayment(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const p = await svc.getById(req.params.id);
    return res.ok(p);
  } catch (err) {
    next(err);
  }
}
