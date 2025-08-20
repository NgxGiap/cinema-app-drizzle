import { Request, Response } from 'express';
import * as svc from '../services/auth.service';

export async function register(req: Request, res: Response) {
  const { name, email, password, role } = req.body;
  const user = await svc.register({ name, email, password, role });
  return res.ok(user, 'Register success', 201);
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const result = await svc.login(email, password);
  return result
    ? res.ok(result, 'Login success')
    : res.fail('Invalid credentials', 401);
}
