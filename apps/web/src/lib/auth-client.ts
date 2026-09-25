import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { API_URL } from './api';

/**
 * Cliente de Better Auth (doc 08). La sesión vive en una cookie HttpOnly que
 * emite la API en /v1/auth/*; el navegador la manda sola en cada fetch con
 * credentials: 'include'. El rol llega como campo adicional del usuario.
 */
export const authClient = createAuthClient({
    baseURL: `${API_URL}/v1/auth`,
    plugins: [
        inferAdditionalFields({
            user: { role: { type: 'string', required: false } },
        }),
    ],
});
