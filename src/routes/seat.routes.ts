import { Router } from 'express';
import * as c from '../controllers/seat.controller';

const r = Router();

// Main CRUD routes
r.get('/', c.listSeats);
r.post('/', c.createSeat);
r.post('/bulk', c.createMultipleSeats);
r.delete('/bulk', c.deleteMultipleSeats);
r.get('/:id', c.getSeat);
r.put('/:id', c.updateSeat);
r.delete('/:id', c.deleteSeat);

// Utility routes
r.get('/cinema/:cinemaId', c.getSeatsByCinema);
r.get('/cinema/:cinemaId/map', c.getSeatMap);

export default r;
