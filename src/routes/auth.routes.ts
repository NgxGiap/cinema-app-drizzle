import { Router } from 'express';
import * as c from '../controllers/auth.controller';
const r = Router();
r.post('/login', c.login);
r.post('/register', c.register);
export default r;
