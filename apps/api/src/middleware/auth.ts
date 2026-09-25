import type { RequestHandler } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '@astrolegia/auth';
import { ADMIN_ROLES, type UserRole } from '@astrolegia/contracts';
import { asyncHandler, sendError } from '../http';

/**
 * Resuelve la sesión de Better Auth (cookie o bearer) en cada petición y la
 * deja en req.user / req.session. No rechaza: eso lo hacen requireUser y
 * requireRole según la ruta.
 */
export const attachSession = asyncHandler(async (req, _res, next) => {
    const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    req.user = result?.user ?? null;
    req.session = result?.session ?? null;
    next();
});

export const requireUser: RequestHandler = (req, res, next) => {
    if (!req.user) {
        return sendError(req, res, 401, 'UNAUTHENTICATED', 'Iniciá sesión para continuar');
    }
    next();
};

export function roleOf(user: { role?: string | null } | null | undefined): UserRole {
    const role = user?.role;
    return (role === 'viewer' || role === 'editor' || role === 'super_admin') ? role : 'user';
}

/** RBAC (doc 03): el rol vive en PostgreSQL (User.role) y llega en la sesión. */
export function requireRole(roles: readonly UserRole[]): RequestHandler {
    return (req, res, next) => {
        if (!req.user) {
            return sendError(req, res, 401, 'UNAUTHENTICATED', 'Iniciá sesión para continuar');
        }
        if (!roles.includes(roleOf(req.user))) {
            return sendError(req, res, 403, 'FORBIDDEN', 'No tenés permisos para esta operación');
        }
        next();
    };
}

export const requireAdmin = requireRole(ADMIN_ROLES);
export const requireSuperAdmin = requireRole(['super_admin']);
