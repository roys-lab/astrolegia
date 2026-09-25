/**
 * Cliente HTTP de la web hacia la única API backend (docs 02 y 13).
 *
 * - `credentials: 'include'`: la cookie de sesión de Better Auth viaja sola.
 * - Cabeceras de versionamiento X-App-* en cada petición.
 * - Desenvuelve `{ data, meta }` y convierte `{ error }` en ApiError.
 *
 * NEXT_PUBLIC_API_URL apunta a la API (local: http://localhost:3000).
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0';

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        public readonly code: string,
        message: string,
        public readonly details?: unknown,
        public readonly requestId?: string,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export interface ApiRequestInit {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    /** Cuerpo JSON (se serializa y se setea Content-Type). */
    json?: unknown;
    signal?: AbortSignal;
}

interface ErrorBody {
    error?: { code?: string; message?: string; details?: unknown };
    meta?: { requestId?: string };
}

export async function api<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
    const headers = new Headers({
        'X-App-Platform': 'web',
        'X-App-Version': APP_VERSION,
        'X-Api-Version': 'v1',
    });
    if (init.json !== undefined) headers.set('Content-Type', 'application/json');

    let res: Response;
    try {
        res = await fetch(`${API_URL}${path}`, {
            method: init.method ?? 'GET',
            headers,
            credentials: 'include',
            body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
            signal: init.signal,
        });
    } catch (err) {
        throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con la API. Revisá tu conexión.', err instanceof Error ? err.message : String(err));
    }

    const body = (await res.json().catch(() => null)) as (ErrorBody & { data?: T }) | null;
    if (!res.ok) {
        throw new ApiError(
            res.status,
            body?.error?.code ?? 'INTERNAL_ERROR',
            body?.error?.message ?? `La API respondió ${res.status}`,
            body?.error?.details,
            body?.meta?.requestId,
        );
    }
    return body?.data as T;
}

/** Como api(), pero un 404 devuelve null en vez de lanzar. */
export async function apiOrNull<T>(path: string, init: ApiRequestInit = {}): Promise<T | null> {
    try {
        return await api<T>(path, init);
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
    }
}
