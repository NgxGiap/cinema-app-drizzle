import { Request, Response } from 'express';
import { db } from '../db';
import { users } from '../db/schema';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
