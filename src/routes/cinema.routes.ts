import { Router } from 'express';
import * as c from '../controllers/cinema.controller';

const r = Router();

// Main CRUD routes
r.get('/', c.listCinemas);
r.post('/', c.createCinema);
r.get('/cities', c.getCitiesList); // Must be before /:id to avoid conflict
r.get('/:id', c.getCinema);
r.put('/:id', c.updateCinema);
r.delete('/:id', c.deleteCinema);
r.patch('/:id/toggle-status', c.toggleCinemaStatus);

export default r;
