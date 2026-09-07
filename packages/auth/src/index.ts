/**
 * Better Auth para Astrolegia (docs/technology/07-authentication.md y
 * 08-better-auth.md): Google SSO único, sesiones en PostgreSQL vía Prisma,
 * montado en la API unificada bajo /v1/auth/*.
 *
 * Variables de entorno (apps/api/.env.example):
 *   BETTER_AUTH_SECRET        obligatoria en producción (firma de sesiones)
 *   BETTER_AUTH_URL           URL pública de la API (p. ej. http://localhost:3000)
 *   GOOGLE_CLIENT_ID/SECRET   OAuth client de Google Cloud Console
 *   WEB_URL, ADMIN_URL, CLIENT_URL, AUTH_TRUSTED_ORIGINS  orígenes confiables
 *   AUTH_CROSS_SITE_COOKIES   "true" si la web vive en otro sitio (p. ej. *.vercel.app)
 */
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer } from 'better-auth/plugins';
import { prisma } from '@astrolegia/database';

export const AUTH_BASE_PATH = '/v1/auth';

/** Ruta del callback de Google que hay que registrar en Google Cloud Console. */
export function googleCallbackUrl(apiBaseUrl: string): string {
    return `${apiBaseUrl.replace(/\/$/, '')}${AUTH_BASE_PATH}/callback/google`;
}

function csv(value: string | undefined): string[] {
    return (value ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

export function trustedOriginsFromEnv(env: NodeJS.ProcessEnv = process.env): string[] {
    const origins = [
        env.WEB_URL,
        env.ADMIN_URL,
        env.CLIENT_URL,
        ...csv(env.AUTH_TRUSTED_ORIGINS),
        // Esquema de desarrollo de Expo Go (doc 08).
        'exp://*',
    ].filter((o): o is string => !!o);
    return Array.from(new Set(origins));
}

export function createAuth(env: NodeJS.ProcessEnv = process.env) {
    const isProduction = env.NODE_ENV === 'production';
    const crossSiteCookies = env.AUTH_CROSS_SITE_COOKIES === 'true';
    const googleConfigured = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

    if (isProduction && !env.BETTER_AUTH_SECRET) {
        throw new Error('BETTER_AUTH_SECRET es obligatoria en producción');
    }
    if (!googleConfigured) {
        console.warn('[auth] GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET no configurados: el login con Google no va a funcionar.');
    }

    return betterAuth({
        appName: 'Astrolegia',
        baseURL: env.BETTER_AUTH_URL ?? env.API_URL ?? 'http://localhost:3000',
        basePath: AUTH_BASE_PATH,
        secret: env.BETTER_AUTH_SECRET,
        database: prismaAdapter(prisma, { provider: 'postgresql' }),
        socialProviders: googleConfigured
            ? {
                google: {
                    clientId: env.GOOGLE_CLIENT_ID as string,
                    clientSecret: env.GOOGLE_CLIENT_SECRET as string,
                },
            }
            : {},
        user: {
            additionalFields: {
                // Rol de RBAC (enum UserRole de Prisma). Nunca lo setea el cliente.
                role: { type: 'string', required: false, defaultValue: 'user', input: false },
            },
        },
        session: {
            expiresIn: 60 * 60 * 24 * 30, // 30 días (doc 07)
            updateAge: 60 * 60 * 24, // renovación con actividad, cada 24 h
            cookieCache: { enabled: true, maxAge: 60 * 5 },
        },
        account: {
            // Los super admins se cargan por seed antes de su primer login: al
            // entrar con Google se vincula la cuenta al User existente por email.
            accountLinking: { enabled: true, trustedProviders: ['google'] },
        },
        trustedOrigins: trustedOriginsFromEnv(env),
        // Bearer token además de cookie: la app móvil (Expo) guarda el token en
        // expo-secure-store y lo manda en Authorization (doc 07).
        plugins: [bearer()],
        rateLimit: {
            // Doc 15: 10 peticiones / minuto en /v1/auth/*.
            enabled: isProduction,
            window: 60,
            max: 10,
        },
        advanced: {
            // Los ids los genera PostgreSQL (uuid), igual que el resto de las tablas.
            database: { generateId: false },
            ...(crossSiteCookies
                ? { defaultCookieAttributes: { sameSite: 'none' as const, secure: true, partitioned: true } }
                : {}),
        },
    });
}

export const auth = createAuth();

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Auth['$Infer']['Session'];
export type SessionUser = AuthSession['user'];
