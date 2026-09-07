import { randomUUID } from 'node:crypto';
import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodType } from 'zod';
import type { ApiErrorCode, ApiMeta } from '@astrolegia/contracts';

/**
 * Envelope estándar (doc 13):
 *   éxito  { data, meta: { requestId, timestamp } }
 *   error  { error: { code, message, details? }, meta }
 */

export class HttpError extends Error {
    constructor(
        public readonly status: number,
        public readonly code: ApiErrorCode,
        message: string,
        public readonly details?: unknown,
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

export function metaOf(req: Request): ApiMeta {
    return { requestId: req.requestId, timestamp: new Date().toISOString() };
}

export function sendData<T>(req: Request, res: Response, data: T, status = 200): void {
    res.status(status).json({ data, meta: metaOf(req) });
}

export function sendError(
    req: Request,
    res: Response,
    status: number,
    code: ApiErrorCode,
    message: string,
    details?: unknown,
): void {
    res.status(status).json({
        error: { code, message, ...(details !== undefined ? { details } : {}) },
        meta: metaOf(req),
    });
}

/** Valida con Zod y lanza ZodError (lo traduce errorHandler a 400 VALIDATION_ERROR). */
export function parse<T>(schema: ZodType<T>, value: unknown): T {
    return schema.parse(value);
}

/** Id de petición: respeta X-Request-Id entrante (p. ej. del proxy) o genera uno. */
export const requestId: RequestHandler = (req, res, next) => {
    const incoming = req.get('x-request-id');
    req.requestId = (incoming && /^[\w.-]{1,80}$/.test(incoming) ? incoming : `req_${randomUUID()}`);
    res.setHeader('X-Request-Id', req.requestId);
    next();
};

/** Express 4 no captura rechazos de handlers async: este wrapper los manda a next(). */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}

export const notFound: RequestHandler = (req, res) => {
    sendError(req, res, 404, 'NOT_FOUND', `Ruta no encontrada: ${req.method} ${req.path}`);
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err instanceof ZodError) {
        return sendError(
            req,
            res,
            400,
            'VALIDATION_ERROR',
            'Datos inválidos',
            err.issues.map((i) => ({ field: i.path.join('.'), issue: i.message })),
        );
    }
    if (err instanceof HttpError) {
        return sendError(req, res, err.status, err.code, err.message, err.details);
    }
    const anyErr = err as { type?: string; status?: number; message?: string };
    if (anyErr?.type === 'entity.parse.failed') {
        return sendError(req, res, 400, 'VALIDATION_ERROR', 'El cuerpo de la petición no es JSON válido');
    }
    if (anyErr?.type === 'entity.too.large') {
        return sendError(req, res, 413, 'VALIDATION_ERROR', 'El cuerpo de la petición es demasiado grande');
    }

    console.error(`[${req.requestId}] Error no controlado:`, err);
    sendError(req, res, 500, 'INTERNAL_ERROR', 'Error interno del servidor');
};
