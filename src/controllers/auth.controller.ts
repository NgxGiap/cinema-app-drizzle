import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/auth.service';

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { name, email, password, role } = req.body;
    const user = await svc.register({ name, email, password, role });
    return res.ok(user, 'Register success', 201);
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await svc.login(email, password);
    return res.ok(result, 'Login success');
  } catch (error) {
    next(error);
  }
}
