import { Router } from 'express';
import * as c from '../controllers/user.controller';
const r = Router();
r.get('/', c.listUsers);
r.get('/:id', c.getUser);
r.post('/', c.createUser);
r.delete('/:id', c.deleteUser);
export default r;
