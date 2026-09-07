import { z } from 'zod';

/**
 * Variables de entorno de la API, validadas al arrancar. Las opcionales
 * desactivan features (login con Google, cartas por RapidAPI, IA) con un aviso
 * en consola en vez de romper el arranque. Lista completa en .env.example.
 */
const EnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),

    // Identidad (Better Auth)
    BETTER_AUTH_URL: z.string().url().optional(),
    BETTER_AUTH_SECRET: z.string().min(16).optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    AUTH_TRUSTED_ORIGINS: z.string().optional(),
    AUTH_CROSS_SITE_COOKIES: z.enum(['true', 'false']).optional(),

    // Orígenes de los frontends (CORS + Better Auth)
    WEB_URL: z.string().url().optional(),
    ADMIN_URL: z.string().url().optional(),
    CLIENT_URL: z.string().url().optional(),

    // Proveedores externos
    RAPIDAPI_KEY: z.string().optional(),
    RAPIDAPI_HOST: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    /** Ruta al knowledge-base.json del RAG (opcional; sin él el RAG devuelve vacío). */
    KNOWLEDGE_BASE_PATH: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
    const parsed = EnvSchema.safeParse(source);
    if (!parsed.success) {
        const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
        throw new Error(`Variables de entorno inválidas: ${detail}`);
    }
    return parsed.data;
}

export const env = loadEnv();

function csv(value: string | undefined): string[] {
    return (value ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

/** Orígenes de navegador permitidos por CORS (los mismos que confía Better Auth). */
export function corsOrigins(e: Env = env): string[] {
    const list = [e.WEB_URL, e.ADMIN_URL, e.CLIENT_URL, ...csv(e.AUTH_TRUSTED_ORIGINS)]
        .filter((o): o is string => !!o)
        .map((o) => o.replace(/\/$/, ''));
    return Array.from(new Set(list));
}

export function warnMissingFeatures(e: Env = env): void {
    const missing: string[] = [];
    if (!e.RAPIDAPI_KEY || !e.RAPIDAPI_HOST) missing.push('RAPIDAPI_KEY/RAPIDAPI_HOST (cartas natales)');
    if (!e.GEMINI_API_KEY) missing.push('GEMINI_API_KEY (interpretación con IA)');
    if (!e.WEB_URL && !e.ADMIN_URL && !e.CLIENT_URL) missing.push('WEB_URL/ADMIN_URL/CLIENT_URL (CORS)');
    for (const m of missing) console.warn(`[env] Falta ${m}: la feature queda deshabilitada.`);
}
