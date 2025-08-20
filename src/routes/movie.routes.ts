import { Router } from 'express';
import * as c from '../controllers/movie.controller';
const r = Router();
r.get('/', c.listMovies);
r.post('/', c.createMovie);
r.get('/:id', c.getMovie);
export default r;
