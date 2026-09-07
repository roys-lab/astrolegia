import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    MODELS,
    STYLE_BLOCK,
    withStyle,
    modelChain,
    buildRequestBody,
    generateText,
    generateJSON,
    AIGatewayError,
    ResponseSchema,
} from './ai-gateway';

// ==================== HELPERS ====================

const TEST_KEY = 'test-key-not-real';

function geminiOk(text: string): Response {
    return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
}

function geminiError(status: number, message = 'boom'): Response {
    return new Response(
        JSON.stringify({ error: { code: status, message, status: 'ERROR' } }),
        { status, headers: { 'Content-Type': 'application/json' } }
    );
}

function geminiEmpty(): Response {
    return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [] }, finishReason: 'MAX_TOKENS' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
}

function calledModel(fetchMock: ReturnType<typeof vi.fn>, callIndex: number): string {
    const url = fetchMock.mock.calls[callIndex][0] as string;
    const match = url.match(/models\/([^:]+):generateContent/);
    return match ? match[1] : '';
}

function calledBody(fetchMock: ReturnType<typeof vi.fn>, callIndex: number): any {
    return JSON.parse(fetchMock.mock.calls[callIndex][1].body as string);
}

let fetchMock: ReturnType<typeof vi.fn>;
let originalKey: string | undefined;

beforeEach(() => {
    originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = TEST_KEY;
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) {
        delete process.env.GEMINI_API_KEY;
    } else {
        process.env.GEMINI_API_KEY = originalKey;
    }
});

// ==================== MODELS / CHAIN ====================

describe('MODELS y cadena de fallback', () => {
    it('define los tres niveles con IDs de modelo no vacíos y distintos entre sí', () => {
        expect(MODELS.primary).toBeTruthy();
        expect(MODELS.fast).toBeTruthy();
        expect(MODELS.fallback).toBeTruthy();
        expect(new Set([MODELS.primary, MODELS.fast, MODELS.fastPrev, MODELS.fallback]).size).toBe(4);
    });

    it('primary encadena primary → fast → fallback', () => {
        expect(modelChain('primary')).toEqual([MODELS.primary, MODELS.fast, MODELS.fastPrev, MODELS.fallback]);
    });

    it('fast encadena fast → fallback', () => {
        expect(modelChain('fast')).toEqual([MODELS.fast, MODELS.fastPrev, MODELS.fallback]);
    });
});

// ==================== BUILD REQUEST BODY ====================

describe('buildRequestBody', () => {
    it('arma contents con el prompt como turno de usuario', () => {
        const body = buildRequestBody('hola');
        expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'hola' }] }]);
        expect(body.systemInstruction).toBeUndefined();
    });

    it('incluye temperature, maxOutputTokens y systemInstruction cuando se pasan', () => {
        const body = buildRequestBody('p', {
            temperature: 0.3,
            maxOutputTokens: 512,
            systemInstruction: 'sos un motor de análisis',
        });
        expect(body.generationConfig.temperature).toBe(0.3);
        expect(body.generationConfig.maxOutputTokens).toBe(512);
        expect(body.systemInstruction).toEqual({ parts: [{ text: 'sos un motor de análisis' }] });
    });

    it('antepone el history y agrega el prompt al final', () => {
        const body = buildRequestBody('nuevo mensaje', {
            history: [
                { role: 'user', parts: [{ text: 'primer turno' }] },
                { role: 'model', parts: [{ text: 'respuesta' }] },
            ],
        });
        expect(body.contents).toHaveLength(3);
        expect(body.contents[2]).toEqual({ role: 'user', parts: [{ text: 'nuevo mensaje' }] });
    });

    it('en modo JSON setea responseMimeType y responseSchema', () => {
        const schema: ResponseSchema = {
            type: 'OBJECT',
            properties: { score: { type: 'NUMBER' } },
            required: ['score'],
        };
        const body = buildRequestBody('p', {}, { schema });
        expect(body.generationConfig.responseMimeType).toBe('application/json');
        expect(body.generationConfig.responseSchema).toEqual(schema);
    });

    it('en modo JSON sin schema setea solo responseMimeType', () => {
        const body = buildRequestBody('p', {}, {});
        expect(body.generationConfig.responseMimeType).toBe('application/json');
        expect(body.generationConfig.responseSchema).toBeUndefined();
    });

    it('fuera de modo JSON no setea responseMimeType', () => {
        const body = buildRequestBody('p');
        expect(body.generationConfig.responseMimeType).toBeUndefined();
    });
});

// ==================== TRANSPORTE / SEGURIDAD ====================

describe('transporte', () => {
    it('manda la key por header x-goog-api-key y nunca en la URL', async () => {
        fetchMock.mockResolvedValueOnce(geminiOk('ok'));

        await generateText('p', { retryDelayMs: 0 });

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).not.toContain(TEST_KEY);
        expect(url).not.toContain('key=');
        expect(init.headers['x-goog-api-key']).toBe(TEST_KEY);
    });

    it('usa la key override de opts.apiKey cuando se pasa', async () => {
        fetchMock.mockResolvedValueOnce(geminiOk('ok'));

        await generateText('p', { apiKey: 'override-key', retryDelayMs: 0 });

        const [, init] = fetchMock.mock.calls[0];
        expect(init.headers['x-goog-api-key']).toBe('override-key');
    });

    it('lanza AIGatewayError si no hay API key configurada', async () => {
        delete process.env.GEMINI_API_KEY;
        await expect(generateText('p', { retryDelayMs: 0 })).rejects.toThrow(AIGatewayError);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

// ==================== CASCADA DE FALLBACK ====================

describe('cascada de fallback', () => {
    it('ante un 404 pasa directo al siguiente modelo sin reintentar el mismo', async () => {
        fetchMock
            .mockResolvedValueOnce(geminiError(404, 'model not found'))
            .mockResolvedValueOnce(geminiOk('respuesta del fast'));

        const text = await generateText('p', { model: 'primary', retryDelayMs: 0 });

        expect(text).toBe('respuesta del fast');
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(calledModel(fetchMock, 0)).toBe(MODELS.primary);
        expect(calledModel(fetchMock, 1)).toBe(MODELS.fast);
    });

    it('ante un 429 reintenta el mismo modelo una vez antes de caer al siguiente', async () => {
        fetchMock
            .mockResolvedValueOnce(geminiError(429, 'rate limited'))
            .mockResolvedValueOnce(geminiOk('ok tras retry'));

        const text = await generateText('p', { model: 'primary', retryDelayMs: 0 });

        expect(text).toBe('ok tras retry');
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(calledModel(fetchMock, 0)).toBe(MODELS.primary);
        expect(calledModel(fetchMock, 1)).toBe(MODELS.primary);
    });

    it('ante 429 persistente cae al siguiente modelo de la cadena', async () => {
        fetchMock
            .mockResolvedValueOnce(geminiError(429))
            .mockResolvedValueOnce(geminiError(429))
            .mockResolvedValueOnce(geminiOk('salvado por fast'));

        const text = await generateText('p', { model: 'primary', retryDelayMs: 0 });

        expect(text).toBe('salvado por fast');
        expect(calledModel(fetchMock, 0)).toBe(MODELS.primary);
        expect(calledModel(fetchMock, 1)).toBe(MODELS.primary);
        expect(calledModel(fetchMock, 2)).toBe(MODELS.fast);
    });

    it('ante un 500 reintenta y cae en cascada', async () => {
        fetchMock
            .mockResolvedValueOnce(geminiError(500))
            .mockResolvedValueOnce(geminiError(503))
            .mockResolvedValueOnce(geminiError(404))
            .mockResolvedValueOnce(geminiOk('fallback al rescate'));

        const text = await generateText('p', { model: 'primary', retryDelayMs: 0 });

        expect(text).toBe('fallback al rescate');
        expect(fetchMock).toHaveBeenCalledTimes(4);
        expect(calledModel(fetchMock, 2)).toBe(MODELS.fast);
        expect(calledModel(fetchMock, 3)).toBe(MODELS.fastPrev);
    });

    it('con model fast la cadena arranca en el modelo fast', async () => {
        fetchMock
            .mockResolvedValueOnce(geminiError(404))
            .mockResolvedValueOnce(geminiOk('ok'));

        await generateText('p', { model: 'fast', retryDelayMs: 0 });

        expect(calledModel(fetchMock, 0)).toBe(MODELS.fast);
        expect(calledModel(fetchMock, 1)).toBe(MODELS.fastPrev);
    });

    it('una respuesta vacía se trata como reintentable y cae en cascada', async () => {
        fetchMock
            .mockResolvedValueOnce(geminiEmpty())
            .mockResolvedValueOnce(geminiOk('con contenido'));

        const text = await generateText('p', { model: 'fast', retryDelayMs: 0 });
        expect(text).toBe('con contenido');
    });

    it('ante un 400 (no reintentable) lanza inmediatamente sin cascada', async () => {
        fetchMock.mockResolvedValueOnce(geminiError(400, 'bad request'));

        await expect(generateText('p', { retryDelayMs: 0 })).rejects.toThrow(AIGatewayError);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('si TODOS los modelos fallan lanza AIGatewayError con el detalle de intentos', async () => {
        // mockImplementation: una Response fresca por llamada (el body solo se puede leer una vez)
        fetchMock.mockImplementation(() => Promise.resolve(geminiError(404, 'gone')));

        try {
            await generateText('p', { model: 'primary', retryDelayMs: 0 });
            expect.unreachable('debería haber lanzado');
        } catch (e) {
            const err = e as AIGatewayError;
            expect(err.attempts.length).toBe(4); // un intento por modelo (404 no reintenta)
            expect(err.attempts.map(a => a.model)).toEqual([MODELS.primary, MODELS.fast, MODELS.fastPrev, MODELS.fallback]);
            expect(err.message).toContain('Todos los modelos');
        }
    });

    it('errores de red (fetch rechaza) también caen en cascada', async () => {
        fetchMock
            .mockRejectedValueOnce(new TypeError('fetch failed'))
            .mockRejectedValueOnce(new TypeError('fetch failed'))
            .mockResolvedValueOnce(geminiOk('resiliente'));

        const text = await generateText('p', { model: 'fast', retryDelayMs: 0 });
        expect(text).toBe('resiliente');
    });
});

// ==================== generateJSON ====================

describe('generateJSON', () => {
    const schema: ResponseSchema = {
        type: 'OBJECT',
        properties: {
            score: { type: 'NUMBER' },
            status: { type: 'STRING', enum: ['green', 'yellow', 'red'] },
        },
        required: ['score', 'status'],
    };

    it('manda generationConfig con responseMimeType + responseSchema y parsea la respuesta', async () => {
        fetchMock.mockResolvedValueOnce(geminiOk('{"score": 88, "status": "green"}'));

        const result = await generateJSON<{ score: number; status: string }>('p', schema, { retryDelayMs: 0 });

        expect(result).toEqual({ score: 88, status: 'green' });
        const body = calledBody(fetchMock, 0);
        expect(body.generationConfig.responseMimeType).toBe('application/json');
        expect(body.generationConfig.responseSchema).toEqual(schema);
    });

    it('sin schema igual usa modo JSON (responseMimeType) y parsea', async () => {
        fetchMock.mockResolvedValueOnce(geminiOk('[1, 2, 3]'));

        const result = await generateJSON<number[]>('p', undefined, { retryDelayMs: 0 });

        expect(result).toEqual([1, 2, 3]);
        const body = calledBody(fetchMock, 0);
        expect(body.generationConfig.responseMimeType).toBe('application/json');
        expect(body.generationConfig.responseSchema).toBeUndefined();
    });

    it('lanza AIGatewayError si el modelo devuelve JSON inválido (nada de regex de rescate)', async () => {
        fetchMock.mockResolvedValueOnce(geminiOk('esto no es JSON {'));

        await expect(generateJSON('p', schema, { retryDelayMs: 0 })).rejects.toThrow(AIGatewayError);
    });

    it('hereda la cascada de fallback del transporte', async () => {
        fetchMock
            .mockResolvedValueOnce(geminiError(404))
            .mockResolvedValueOnce(geminiOk('{"ok": true}'));

        const result = await generateJSON<{ ok: boolean }>('p', undefined, { model: 'primary', retryDelayMs: 0 });
        expect(result).toEqual({ ok: true });
        expect(calledModel(fetchMock, 1)).toBe(MODELS.fast);
    });
});

// ==================== STYLE_BLOCK ====================

describe('STYLE_BLOCK', () => {
    it('contiene la voz canónica: rioplatense, sin saludos, markdown limpio', () => {
        expect(STYLE_BLOCK).toContain('rioplatense');
        expect(STYLE_BLOCK).toContain('vos/tenés');
        expect(STYLE_BLOCK.toLowerCase()).toContain('no saludes');
        expect(STYLE_BLOCK).toContain('Markdown limpio');
    });

    it('withStyle compone el prompt con el STYLE_BLOCK presente', () => {
        const composed = withStyle('Analizá esta carta natal.');
        expect(composed).toContain('Analizá esta carta natal.');
        expect(composed).toContain(STYLE_BLOCK);
        // El estilo va después del contenido del prompt
        expect(composed.indexOf('Analizá')).toBeLessThan(composed.indexOf('VOZ CANÓNICA'));
    });

    it('el body enviado al modelo incluye el STYLE_BLOCK cuando se compone con withStyle', async () => {
        fetchMock.mockResolvedValueOnce(geminiOk('ok'));

        await generateText(withStyle('contenido'), { retryDelayMs: 0 });

        const body = calledBody(fetchMock, 0);
        const sentText = body.contents[0].parts[0].text;
        expect(sentText).toContain('VOZ CANÓNICA DE ASTROLEGIA');
        expect(sentText).toContain('contenido');
    });
});

// ==================== PROVEEDOR CLAUDE (ANTHROPIC API) ====================

import { isClaudeConfigured, CLAUDE_MODELS } from './ai-gateway';

describe('proveedor claude (API de Anthropic)', () => {
    it('CLAUDE_MODELS.writer es el ID canónico de Sonnet 5', () => {
        expect(CLAUDE_MODELS.writer).toBe('claude-sonnet-5');
    });

    it('sin ANTHROPIC_API_KEY, isClaudeConfigured es false y generateText cae a Gemini', async () => {
        const prev = process.env.ANTHROPIC_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        try {
            expect(isClaudeConfigured()).toBe(false);

            // provider claude sin key debe ir DIRECTO a la cascada Gemini
            fetchMock.mockResolvedValueOnce(geminiOk('desde gemini'));
            const text = await generateText('hola', {
                provider: 'claude',
                model: 'primary',
                retryDelayMs: 0,
            });
            expect(text).toBe('desde gemini');
            expect(calledModel(fetchMock, 0)).toBe(MODELS.primary);
        } finally {
            if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
        }
    });

    it('con ANTHROPIC_API_KEY presente, isClaudeConfigured es true', () => {
        const prev = process.env.ANTHROPIC_API_KEY;
        process.env.ANTHROPIC_API_KEY = 'sk-ant-test-not-real';
        try {
            expect(isClaudeConfigured()).toBe(true);
        } finally {
            if (prev === undefined) delete process.env.ANTHROPIC_API_KEY;
            else process.env.ANTHROPIC_API_KEY = prev;
        }
    });
});
