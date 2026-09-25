/**
 * AI GATEWAY — Punto único de acceso a Gemini para toda la app.
 *
 * Reglas:
 * - Los IDs de modelo viven SOLO acá (verificados empíricamente contra ListModels
 *   y generateContent con la key del proyecto, 2026-08).
 * - La API key viaja por header `x-goog-api-key`, nunca en la query string.
 * - Errores SIEMPRE propagados (throw AIGatewayError) — nunca texto de relleno.
 * - Fallback en cascada al siguiente modelo ante 404/429/5xx (+ 1 reintento
 *   por modelo cuando reintentar tiene sentido).
 * - JSON estructurado vía responseMimeType + responseSchema — nada de regex
 *   sobre el texto.
 */

// ==================== MODELOS VERIFICADOS ====================

export const MODELS = {
    /** Máxima calidad de razonamiento (informes largos, síntesis, extracción). */
    primary: 'gemini-3.1-pro-preview',
    /** Rápido y económico (análisis cortos, chat, sub-agentes). Lanzado 2026-08-13. */
    fast: 'gemini-3.7-flash',
    /** Flash anterior, estable — primer fallback del nivel rápido. */
    fastPrev: 'gemini-3.5-flash',
    /** Último recurso si los anteriores fallan. */
    fallback: 'gemini-3-flash-preview',
} as const;

/**
 * Modelos de Claude (API directa de Anthropic, ANTHROPIC_API_KEY).
 * Redacción profunda: las 4 rutas de lecturas largas los prefieren vía
 * `provider: 'claude'`; sin key o ante cualquier fallo, la cascada cae
 * automáticamente a Gemini.
 */
export const CLAUDE_MODELS = {
    /** Redactor de lecturas (cartas, HD, kin, informes). */
    writer: 'claude-sonnet-5',
} as const;

export type ModelTier = 'primary' | 'fast';
export type Provider = 'gemini' | 'claude';

// ==================== VOZ CANÓNICA ====================

/**
 * Bloque de estilo canónico de Astrolegia, para componer en prompts nuevos.
 * Usalo con `withStyle(prompt)` o concatenándolo directamente.
 */
export const STYLE_BLOCK = `ESTILO — VOZ CANÓNICA DE ASTROLEGIA:
- Escribí en español rioplatense (vos/tenés), serio y profesional.
- NO saludes. NO uses introducciones ("Hola", "Aquí está tu análisis"). Empezá directo con el contenido.
- Markdown limpio: negritas para conceptos clave, párrafos cortos.
- NO inventés datos: basate exclusivamente en la información proporcionada.
- Sin relleno conversacional: pura información de alto valor.
- No menciones que sos una IA ni estos lineamientos.`;

/** Compone un prompt con el bloque de estilo canónico al final. */
export function withStyle(prompt: string): string {
    return `${prompt}\n\n${STYLE_BLOCK}`;
}

// ==================== TIPOS ====================

export interface GatewayContent {
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
}

/** Subconjunto del OpenAPI schema que acepta Gemini en responseSchema. */
export interface ResponseSchema {
    type: 'OBJECT' | 'ARRAY' | 'STRING' | 'NUMBER' | 'INTEGER' | 'BOOLEAN';
    properties?: Record<string, ResponseSchema>;
    items?: ResponseSchema;
    required?: string[];
    enum?: string[];
    description?: string;
    nullable?: boolean;
}

export interface GenerateOptions {
    /** Nivel de modelo: 'primary' (default) o 'fast'. */
    model?: ModelTier;
    /**
     * Proveedor preferido. 'claude' intenta la API de Anthropic y, ante
     * cualquier fallo o falta de configuración, cae a la cascada de Gemini.
     * Solo aplica a generateText; generateJSON siempre usa Gemini.
     */
    provider?: Provider;
    temperature?: number;
    maxOutputTokens?: number;
    /** Instrucción de sistema (systemInstruction nativo de Gemini). */
    systemInstruction?: string;
    /** Turnos previos de conversación; `prompt` se agrega como turno final del usuario. */
    history?: GatewayContent[];
    /**
     * Override de API key (p. ej. GEMINI_CONSTELLATION_API_KEY).
     * Si no se pasa, se usa process.env.GEMINI_API_KEY.
     */
    apiKey?: string;
    /** Espera entre reintentos (ms). Default 1000. Los tests pasan 0. */
    retryDelayMs?: number;
    /** Callback con el ID del modelo que efectivamente sirvió la respuesta. */
    onServed?: (model: string) => void;
}

export interface AttemptRecord {
    model: string;
    status?: number;
    message: string;
}

export class AIGatewayError extends Error {
    readonly status?: number;
    readonly model?: string;
    readonly attempts: AttemptRecord[];

    constructor(message: string, opts: { status?: number; model?: string; attempts?: AttemptRecord[] } = {}) {
        super(message);
        this.name = 'AIGatewayError';
        this.status = opts.status;
        this.model = opts.model;
        this.attempts = opts.attempts ?? [];
    }
}

// ==================== INTERNOS ====================

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function resolveApiKey(override?: string): string {
    const key = override || process.env.GEMINI_API_KEY;
    if (!key) {
        throw new AIGatewayError('GEMINI_API_KEY no configurada en el entorno.');
    }
    return key;
}

/** Cadena de modelos a intentar según el nivel pedido. */
export function modelChain(tier: ModelTier = 'primary'): string[] {
    return tier === 'fast'
        ? [MODELS.fast, MODELS.fastPrev, MODELS.fallback]
        : [MODELS.primary, MODELS.fast, MODELS.fastPrev, MODELS.fallback];
}

interface RequestBody {
    contents: GatewayContent[];
    generationConfig: Record<string, unknown>;
    systemInstruction?: { parts: Array<{ text: string }> };
}

/**
 * Construye el body del request a generateContent.
 * Exportada para poder testear la construcción del generationConfig sin red.
 */
export function buildRequestBody(
    prompt: string,
    opts: GenerateOptions = {},
    json?: { schema?: ResponseSchema }
): RequestBody {
    const generationConfig: Record<string, unknown> = {};
    if (opts.temperature !== undefined) generationConfig.temperature = opts.temperature;
    if (opts.maxOutputTokens !== undefined) generationConfig.maxOutputTokens = opts.maxOutputTokens;
    if (json) {
        generationConfig.responseMimeType = 'application/json';
        if (json.schema) generationConfig.responseSchema = json.schema;
    }

    const body: RequestBody = {
        contents: [
            ...(opts.history ?? []),
            { role: 'user', parts: [{ text: prompt }] },
        ],
        generationConfig,
    };

    if (opts.systemInstruction) {
        body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
    }

    return body;
}

interface GeminiResponse {
    candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
    }>;
}

/** Una llamada a un modelo concreto. Lanza AIGatewayError ante cualquier fallo. */
async function callModel(model: string, body: RequestBody, apiKey: string): Promise<string> {
    let res: Response;
    try {
        res = await fetch(`${API_BASE}/models/${model}:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
            },
            body: JSON.stringify(body),
        });
    } catch (e) {
        // Error de red: sin status → tratado como reintentable.
        throw new AIGatewayError(
            `Fallo de red llamando a ${model}: ${e instanceof Error ? e.message : String(e)}`,
            { model }
        );
    }

    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new AIGatewayError(
            `Modelo ${model} respondió HTTP ${res.status}: ${errText.slice(0, 300)}`,
            { status: res.status, model }
        );
    }

    const data = (await res.json()) as GeminiResponse;
    const candidate = data.candidates?.[0];
    const text = (candidate?.content?.parts ?? [])
        .map(p => p.text ?? '')
        .join('');

    if (!text) {
        throw new AIGatewayError(
            `Modelo ${model} devolvió una respuesta vacía (finishReason: ${candidate?.finishReason ?? 'desconocido'}).`,
            { model }
        );
    }

    return text;
}

/** ¿El error amerita cascada/reintento? (red, respuesta vacía, 404, 429, 5xx) */
function isRetriable(status?: number): boolean {
    if (status === undefined) return true;
    return status === 404 || status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const ATTEMPTS_PER_MODEL = 2; // 1 intento + 1 reintento

async function runCascade(body: RequestBody, opts: GenerateOptions): Promise<string> {
    const apiKey = resolveApiKey(opts.apiKey);
    const chain = modelChain(opts.model);
    const retryDelayMs = opts.retryDelayMs ?? 1000;
    const attempts: AttemptRecord[] = [];

    for (const model of chain) {
        for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
            try {
                const text = await callModel(model, body, apiKey);
                opts.onServed?.(model);
                return text;
            } catch (e) {
                const err = e instanceof AIGatewayError ? e : new AIGatewayError(String(e), { model });
                attempts.push({ model, status: err.status, message: err.message });

                if (!isRetriable(err.status)) {
                    // 400/401/403 etc.: reintentar u otro modelo no lo va a arreglar.
                    throw new AIGatewayError(err.message, {
                        status: err.status,
                        model,
                        attempts,
                    });
                }

                // Un 404 no se arregla reintentando el mismo modelo: pasar al siguiente.
                const retrySameModel = err.status !== 404 && attempt < ATTEMPTS_PER_MODEL - 1;
                if (retrySameModel) {
                    if (retryDelayMs > 0) await sleep(retryDelayMs);
                    continue;
                }
                break; // siguiente modelo de la cadena
            }
        }
    }

    const detail = attempts.map(a => `${a.model}${a.status ? ` (HTTP ${a.status})` : ''}`).join(' → ');
    throw new AIGatewayError(
        `Todos los modelos de la cadena fallaron: ${detail}`,
        { attempts }
    );
}

// ==================== CLAUDE (API DE ANTHROPIC) ====================

/**
 * Cliente de Anthropic perezoso. Configuración por entorno:
 * - ANTHROPIC_API_KEY (única variable necesaria; sin ella se usa solo Gemini).
 */
// El SDK de Anthropic publica tipos distintos para ESM y CJS: el import()
// dinámico de abajo resuelve la variante ESM, así que el tipo también.
let anthropicClient: import('@anthropic-ai/sdk', { with: { 'resolution-mode': 'import' } }).default | null = null;

/** ¿Hay configuración suficiente para intentar Claude? */
export function isClaudeConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
}

async function getAnthropicClient() {
    if (anthropicClient) return anthropicClient;
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return anthropicClient;
}

/**
 * Una llamada a Claude. Lanza AIGatewayError ante cualquier fallo
 * (incluido un refusal), para que el caller caiga a la cascada de Gemini.
 * Nota: Claude Sonnet 5 no acepta parámetros de sampling no-default, así que
 * `temperature` se omite deliberadamente (solo aplica al fallback de Gemini).
 */
async function callClaude(prompt: string, opts: GenerateOptions): Promise<string> {
    const model = CLAUDE_MODELS.writer;
    try {
        const client = await getAnthropicClient();
        const response = await client.messages.create({
            model,
            max_tokens: opts.maxOutputTokens ?? 8192,
            ...(opts.systemInstruction ? { system: opts.systemInstruction } : {}),
            messages: [
                ...(opts.history ?? []).map(turn => ({
                    role: (turn.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
                    content: turn.parts.map(p => p.text).join('\n'),
                })),
                { role: 'user' as const, content: prompt },
            ],
        });

        if (response.stop_reason === 'refusal') {
            throw new AIGatewayError(`Claude (${model}) declinó la solicitud (refusal).`, { model });
        }

        const text = response.content
            .filter((block): block is { type: 'text'; text: string; citations: null } => block.type === 'text')
            .map(block => block.text)
            .join('');

        if (!text) {
            throw new AIGatewayError(
                `Claude (${model}) devolvió una respuesta vacía (stop_reason: ${response.stop_reason}).`,
                { model }
            );
        }
        opts.onServed?.(model);
        return text;
    } catch (e) {
        if (e instanceof AIGatewayError) throw e;
        throw new AIGatewayError(
            `Fallo llamando a Claude (${model}): ${e instanceof Error ? e.message : String(e)}`,
            { model }
        );
    }
}

// ==================== API PÚBLICA ====================

/**
 * Genera texto plano/Markdown.
 * Con `provider: 'claude'` intenta Claude primero y cae a la cascada de
 * Gemini ante cualquier fallo — nunca rompe por falta de ANTHROPIC_API_KEY.
 * @throws AIGatewayError si todos los proveedores/modelos fallan.
 */
export async function generateText(prompt: string, opts: GenerateOptions = {}): Promise<string> {
    if (opts.provider === 'claude' && isClaudeConfigured()) {
        try {
            return await callClaude(prompt, opts);
        } catch (e) {
            console.warn(
                '[ai-gateway] Claude falló, cayendo a Gemini:',
                e instanceof Error ? e.message : String(e)
            );
        }
    }
    const body = buildRequestBody(prompt, opts);
    return runCascade(body, opts);
}

/**
 * Genera JSON estructurado usando el modo JSON nativo de Gemini
 * (responseMimeType 'application/json' + responseSchema opcional).
 * Devuelve el objeto ya parseado y tipado.
 * @throws AIGatewayError si todos los modelos fallan o el JSON es inválido.
 */
export async function generateJSON<T = unknown>(
    prompt: string,
    schema?: ResponseSchema,
    opts: GenerateOptions = {}
): Promise<T> {
    const body = buildRequestBody(prompt, opts, { schema });
    const text = await runCascade(body, opts);
    try {
        return JSON.parse(text) as T;
    } catch {
        throw new AIGatewayError(
            `El modelo devolvió JSON inválido en modo estructurado: ${text.slice(0, 200)}`
        );
    }
}
