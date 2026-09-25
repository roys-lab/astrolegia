import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { sendError } from '../http';

/**
 * Rate limiting básico (doc 15). Better Auth limita /v1/auth/* por su cuenta.
 *   lectura estándar        100 peticiones / minuto por IP
 *   cálculo (cartas, IA)     10 peticiones / minuto por usuario
 */

const byUserOrIp = (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? '');

export const generalLimiter = rateLimit({
    windowMs: 60_000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => sendError(req, res, 429, 'RATE_LIMITED', 'Demasiadas peticiones. Esperá un minuto.'),
});

export const computeLimiter = rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: byUserOrIp,
    handler: (req, res) => sendError(req, res, 429, 'RATE_LIMITED', 'Demasiados cálculos seguidos. Esperá un minuto.'),
});
