import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { toNodeHandler } from 'better-auth/node';
import { auth, AUTH_BASE_PATH } from '@astrolegia/auth';
import { corsOrigins } from './env';
import { errorHandler, notFound, requestId } from './http';
import { attachSession } from './middleware/auth';
import { generalLimiter } from './middleware/rate-limit';
import { healthRouter } from './routes/health';
import { capabilitiesRouter } from './routes/capabilities';
import { adminRouter } from './routes/admin';
import { pdfRouter } from './routes/pdf';
import { clientRouter } from './routes/client';

/**
 * Única API backend de Astrolegia (docs 01, 13, 15).
 *   /v1/auth/*        Better Auth (Google SSO, sesiones)
 *   /v1/capabilities  negociación de versión/features
 *   /v1/client/*      consultantes (sesión obligatoria)
 *   /v1/admin/*       operadores (rol administrativo obligatorio)
 *   /health           healthcheck para Railway
 */
export function createApp() {
    const app = express();

    // Railway/Vercel terminan TLS en un proxy: sin esto req.ip y las cookies
    // "secure" no funcionan.
    app.set('trust proxy', 1);
    app.disable('x-powered-by');

    app.use(helmet({
        // Los PDFs y respuestas se consumen desde otros orígenes (web, admin).
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));

    const allowedOrigins = new Set(corsOrigins());
    app.use(cors({
        origin(origin, callback) {
            // Sin cabecera Origin: clientes no-navegador (Expo, curl, healthchecks).
            if (!origin || allowedOrigins.has(origin)) return callback(null, true);
            return callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-App-Platform', 'X-App-Version', 'X-App-Build', 'X-Api-Version'],
        exposedHeaders: ['X-Request-Id'],
    }));

    app.use(requestId);
    app.use(generalLimiter);

    // Better Auth maneja su propio body: va ANTES de express.json().
    app.all(`${AUTH_BASE_PATH}/*`, toNodeHandler(auth));

    app.use(express.json({ limit: '1mb' }));
    app.use(attachSession);

    app.use(healthRouter);
    app.use(capabilitiesRouter);
    app.use(pdfRouter);
    app.use('/v1/client', clientRouter);
    app.use('/v1/admin', adminRouter);

    app.use(notFound);
    app.use(errorHandler);

    return app;
}
