import type { AuthSession, SessionUser } from '@astrolegia/auth';

declare global {
    namespace Express {
        interface Request {
            /** Id de la petición (cabecera X-Request-Id). */
            requestId: string;
            /** Usuario autenticado por Better Auth, o null. */
            user: SessionUser | null;
            /** Sesión activa, o null. */
            session: AuthSession['session'] | null;
        }
    }
}

export {};
