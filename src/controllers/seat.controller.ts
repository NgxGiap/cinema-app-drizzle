import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/seat.service';
import { makePagination } from '../utils/http';

type SeatType = 'regular' | 'vip' | 'couple' | 'disabled';

type SeatFilters = {
  cinemaId?: string;
  type?: SeatType;
  row?: string;
  isActive?: boolean;
};

export async function listSeats(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);

    const filters: SeatFilters = {};

    if (
      typeof req.query.cinemaId === 'string' &&
      req.query.cinemaId.trim() !== ''
    ) {
      filters.cinemaId = req.query.cinemaId.trim();
    }
    if (typeof req.query.type === 'string' && req.query.type.trim() !== '') {
      const t = req.query.type.trim();
      if (['regular', 'vip', 'couple', 'disabled'].includes(t)) {
        filters.type = t as SeatType;
      }
    }
    if (typeof req.query.row === 'string' && req.query.row.trim() !== '') {
      filters.row = req.query.row.trim();
    }
    if (typeof req.query.isActive === 'string') {
      filters.isActive = req.query.isActive === 'true';
    }

    const where = Object.keys(filters).length > 0 ? filters : undefined;
    const { items, total } = await svc.list(page, pageSize, where);

    return res.ok(
      { items, total, pagination: makePagination(page, pageSize, total) },
      'Seats fetched',
    );
  } catch (error) {
    next(error);
  }
}

export async function createSeat(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { cinemaId, seatNumber, row, column, type, price, isActive } =
      req.body;

    if (!cinemaId || !seatNumber || !row || !column || !price) {
      return res.fail(
        'Missing required fields: cinemaId, seatNumber, row, column, price',
        400,
      );
    }

    const created = await svc.createOne({
      cinemaId: String(cinemaId),
      seatNumber: String(seatNumber),
      row: String(row),
      column: Number(column),
      type: (type as SeatType) || 'regular',
      price: String(Number(price)),
      isActive: typeof isActive === 'boolean' ? isActive : true,
    });

    return res.ok(created, 'Seat created', 201);
  } catch (error) {
    next(error);
  }
}

export async function bulkCreateSeats(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return res.fail('Request body must be a non-empty array', 400);
    }

    const inputs = req.body.map((s: svc.NewSeat) => {
      if (
        !s.cinemaId ||
        !s.seatNumber ||
        !s.row ||
        s.column === undefined ||
        !s.price
      ) {
        throw new Error(
          'Each seat must have cinemaId, seatNumber, row, column, and price',
        );
      }

      return {
        cinemaId: String(s.cinemaId),
        seatNumber: String(s.seatNumber),
        row: String(s.row),
        column: Number(s.column),
        type: (s.type as SeatType) || 'regular',
        price: String(Number(s.price)),
        isActive: typeof s.isActive === 'boolean' ? s.isActive : true,
      };
    });

    const result = await svc.bulkCreate(inputs);
    return res.ok(result, 'Seats created in bulk', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateSeat(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const patch = req.body as Partial<{
      seatNumber: string;
      row: string;
      column: number | string;
      type: SeatType;
      price: number | string;
      isActive: boolean;
    }>;

    const normalized: Partial<{
      seatNumber: string;
      row: string;
      column: number;
      type: SeatType;
      price: string;
      isActive: boolean;
    }> = {};

    if (typeof patch.seatNumber === 'string')
      normalized.seatNumber = patch.seatNumber;
    if (typeof patch.row === 'string') normalized.row = patch.row;
    if (typeof patch.column !== 'undefined')
      normalized.column = Number(patch.column);
    if (typeof patch.type === 'string')
      normalized.type = patch.type as SeatType;
    if (typeof patch.price !== 'undefined')
      normalized.price = String(Number(patch.price));
    if (typeof patch.isActive === 'boolean')
      normalized.isActive = patch.isActive;

    const result = await svc.updateById(id, normalized);
    return res.ok(result, 'Seat updated');
  } catch (error) {
    next(error);
  }
}

export async function deleteSeat(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    await svc.removeById(id);
    return res.ok(null, 'Seat deleted');
  } catch (error) {
    next(error);
  }
}

export const createMultipleSeats = bulkCreateSeats;

export async function deleteMultipleSeats(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as string[]) : [];
    if (ids.length === 0) {
      return res.fail('ids required', 400);
    }

    let deleted = 0;
    for (const id of ids) {
      try {
        await svc.removeById(id);
        deleted++;
      } catch (error) {
        // Continue with other deletions even if one fails
        console.warn(`Failed to delete seat ${id}:`, error);
      }
    }

    return res.ok({ deleted }, `${deleted} seats deleted`);
  } catch (error) {
    next(error);
  }
}

export async function getSeat(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const row = await svc.getById(id);
    return res.ok(row, 'Seat detail');
  } catch (error) {
    next(error);
  }
}

export async function getSeatsByCinema(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(1000, Number(req.query.pageSize) || 200);
    const cinemaId = String(req.params.cinemaId);

    const { items, total } = await svc.list(page, pageSize, { cinemaId });

    return res.ok(
      { items, total, pagination: makePagination(page, pageSize, total) },
      'Cinema seats fetched',
    );
  } catch (error) {
    next(error);
  }
}

export async function getSeatMap(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const cinemaId = String(req.params.cinemaId);
    const { items } = await svc.list(1, 10000, { cinemaId });

    // Group by row to build simple map
    const map: Record<string, typeof items> = {};
    for (const seat of items) {
      const key = seat.row || 'UNKNOWN';
      if (!map[key]) map[key] = [];
      map[key].push(seat);
    }

    // Sort within each row by column
    for (const rowKey of Object.keys(map)) {
      map[rowKey].sort((a, b) => (a.column || 0) - (b.column || 0));
    }

    return res.ok({ cinemaId, rows: map }, 'Seat map fetched');
  } catch (error) {
    next(error);
  }
}
