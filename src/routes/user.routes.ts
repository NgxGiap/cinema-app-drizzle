import { Router } from 'express';
import { getAllUsers } from '../controllers/user.controller';
import { authMiddleware, isAdmin } from '../middlewares/auth';

const router = Router();

router.get('/', authMiddleware, isAdmin, getAllUsers);

export default router;
