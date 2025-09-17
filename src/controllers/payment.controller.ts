import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/payment.service';

/** POST /payments/intent */
export async function createIntent(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const created = await svc.createIntent(req.body); // ✅ input đã validate ở middleware
    return res.ok(created, 'Payment intent created');
  } catch (err) {
    next(err);
  }
}

/** POST /payments/webhook */
export async function webhook(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.updateByWebhook(req.body); // ✅ input đã validate ở middleware
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
    return res.ok(p, 'Payment detail');
  } catch (err) {
    next(err);
  }
}
