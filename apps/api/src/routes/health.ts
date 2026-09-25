import { Router } from 'express';
import { prisma } from '@astrolegia/database';
import { asyncHandler, sendData } from '../http';

export const healthRouter = Router();

// Hello World raíz (se mantiene de las foundations)
healthRouter.get('/', (req, res) => {
    sendData(req, res, {
        name: 'Astrolegia Backend API',
        status: 'online',
        version: '1.0.0',
        message: 'Hello World from Astrolegia unified API backend!',
    });
});

/** Healthcheck para Railway: 200 si la API responde y la base contesta, 503 si no. */
healthRouter.get('/health', asyncHandler(async (req, res) => {
    let database: 'ok' | 'error' = 'ok';
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
        database = 'error';
        console.error(`[${req.requestId}] Healthcheck: PostgreSQL no responde`, err);
    }
    sendData(req, res, { status: database === 'ok' ? 'ok' : 'degraded', database, uptime: Math.round(process.uptime()) }, database === 'ok' ? 200 : 503);
}));
