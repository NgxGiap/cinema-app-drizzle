import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/ticket.service';

export async function getTicket(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const t = await svc.getById(req.params.id);
    return res.ok(t);
  } catch (err) {
    next(err);
  }
}

export async function listByBooking(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const items = await svc.listByBooking(req.params.bookingId);
    return res.ok({ items });
  } catch (err) {
    next(err);
  }
}

/** Quầy soát vé dùng endpoint này để scan */
export async function scan(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.scanByQrToken(
      String(req.body.qrToken),
      typeof req.body.gate === 'string' ? req.body.gate : undefined,
    );
    return res.ok(
      result,
      result.firstScan ? 'Checked-in' : 'Already checked-in',
    );
  } catch (err) {
    next(err);
  }
}

export async function reissue(req: Request, res: Response, next: NextFunction) {
  try {
    const out = await svc.reissue(req.params.id);
    return res.ok(out, 'Ticket reissued');
  } catch (err) {
    next(err);
  }
}

export async function voidTicket(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await svc.voidTicket(req.params.id);
    return res.ok({ ok: true }, 'Ticket voided');
  } catch (err) {
    next(err);
  }
}
