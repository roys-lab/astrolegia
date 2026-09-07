import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';

/**
 * Cliente de Better Auth para el panel (doc 08): la sesión vive en una cookie
 * HttpOnly emitida por la API en /v1/auth/*; el rol llega en session.user.role
 * y la API lo vuelve a verificar en cada petición a /v1/admin/*.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const authClient = createAuthClient({
    baseURL: `${API_BASE_URL}/v1/auth`,
    plugins: [
        inferAdditionalFields({
            user: { role: { type: 'string', required: false } },
        }),
    ],
});

export function signInWithGoogle() {
    return authClient.signIn.social({
        provider: 'google',
        callbackURL: window.location.origin,
    });
}

export function signOut() {
    return authClient.signOut();
}

/** fetch a la API con la cookie de sesión. */
export function apiFetch(path: string, init: RequestInit = {}) {
    return fetch(`${API_BASE_URL}${path}`, { credentials: 'include', ...init });
}
