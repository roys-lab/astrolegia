import { Router } from 'express';
import { requireUser } from '../../middleware/auth';
import { peopleRouter } from './people';
import { meRouter } from './me';
import { geocodingRouter } from './geocoding';
import { astrologyRouter } from './astrology';

/**
 * /v1/client/* — rutas de consultantes (doc 13). Todas exigen sesión; el
 * userId sale siempre de la sesión validada en el servidor, nunca del cliente
 * (doc 15, aislamiento por consultante).
 */
export const clientRouter = Router();

clientRouter.use(requireUser);
clientRouter.use('/me', meRouter);
clientRouter.use('/people', peopleRouter);
clientRouter.use('/geocoding', geocodingRouter);
clientRouter.use('/astrology', astrologyRouter);
