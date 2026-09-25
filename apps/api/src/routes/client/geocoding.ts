import { Router } from 'express';
import { GeocodingQuerySchema } from '@astrolegia/contracts';
import { asyncHandler, parse, sendData } from '../../http';
import { searchPlaces } from '../../services/geocoding';

/** GET /v1/client/geocoding?q=<ciudad> — sugerencias para el lugar de nacimiento. */
export const geocodingRouter = Router();

geocodingRouter.get('/', asyncHandler(async (req, res) => {
    const { q } = parse(GeocodingQuerySchema, { q: req.query.q });
    const results = await searchPlaces(q);
    sendData(req, res, { results });
}));
