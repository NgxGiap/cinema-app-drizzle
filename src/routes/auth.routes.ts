import { Router } from 'express';
import * as c from '../controllers/auth.controller';
import {
  handleValidationErrors,
  validateAuthRegister,
  validateAuthLogin,
} from '../middlewares/validation';

const r = Router();

r.post('/register', validateAuthRegister, handleValidationErrors, c.register);

r.post('/login', validateAuthLogin, handleValidationErrors, c.login);

export default r;
