import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { makePagination } from '../utils/http';

export async function listUsers(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Number(req.query.pageSize) || 10);
  const { items, total } = await userService.list(page, pageSize);
  return res.ok(
    { items, total, pagination: makePagination(page, pageSize, total) },
    'Users fetched',
  );
}

export async function getUser(req: Request, res: Response) {
  const user = await userService.getById(req.params.id);
  return user ? res.ok(user, 'User detail') : res.fail('User not found', 404);
}

export async function createUser(req: Request, res: Response) {
  const created = await userService.create(req.body);
  return res.ok(created, 'User created', 201);
}

export async function deleteUser(req: Request, res: Response) {
  await userService.remove(req.params.id);
  return res.ok(true, 'User deleted');
}
