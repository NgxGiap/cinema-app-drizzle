import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { makePagination } from '../utils/http';

export async function listUsers(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 10);
    const { items, total } = await userService.list(page, pageSize);
    return res.ok(
      { items, total, pagination: makePagination(page, pageSize, total) },
      'Users fetched',
    );
  } catch (error) {
    next(error);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getById(req.params.id);
    return user ? res.ok(user, 'User detail') : res.fail('User not found', 404);
  } catch (error) {
    next(error);
  }
}

export async function createUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const created = await userService.create(req.body);
    return res.ok(created, 'User created', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const updated = await userService.update(req.params.id, req.body);
    return res.ok(updated, 'User updated');
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await userService.remove(req.params.id);
    return res.ok(true, 'User deleted');
  } catch (error) {
    next(error);
  }
}
