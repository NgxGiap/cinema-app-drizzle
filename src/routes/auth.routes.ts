import { Router } from 'express';
import * as c from '../controllers/auth.controller';
import { validateLogin, validateRegister } from '../middlewares/validation';

const r = Router();

r.post('/login', validateLogin, c.login);
r.post('/register', validateRegister, c.register);

export default r;
