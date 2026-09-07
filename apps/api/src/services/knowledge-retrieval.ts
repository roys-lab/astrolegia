/**
 * KNOWLEDGE RETRIEVAL — Lado de consulta del pipeline RAG.
 *
 * Carga perezosa de src/data/knowledge-base.json (fs en runtime de servidor,
 * NUNCA import estático: el JSON pesa varios MB y no debe entrar al bundle),
 * embeddings de consulta con el mismo modelo con el que se construyó la base,
 * ranking por similitud coseno con filtro opcional de topic, y formateo del
 * bloque de contexto para inyectar en prompts.
 *
 * Regla de oro: retrieve() NUNCA lanza — si la base está vacía, el archivo no
 * existe o la API de embeddings falla, devuelve [] y loguea el motivo. El
 * análisis del usuario jamás se rompe por el RAG.
 */

import { promises as fs } from 'fs';
import path from 'path';

// ==================== TIPOS ====================

export type KnowledgeTopic =
    | 'diseno-humano'
    | 'constelaciones'
    | 'maya'
    | 'tarot'
    | 'astrologia'
    | 'numerologia';

export interface KnowledgeChunk {
    id: string;
    /** Nombre legible del libro/documento de origen. */
    source: string;
    topic: KnowledgeTopic | string;
    chunkIndex: number;
    text: string;
    embedding: number[];
}

export interface KnowledgeBase {
    version: number;
    model: string;
    dimensions: number;
    indexedFiles: Record<string, { chunks: number; indexedAt: string }>;
    chunks: KnowledgeChunk[];
}

export interface RetrieveOptions {
    /** Cantidad de chunks a devolver. Default 4. */
    k?: number;
    /** Filtrar por topic (diseno-humano | constelaciones | maya | tarot | astrologia | numerologia). */
    topic?: string;
}

export type ScoredChunk = KnowledgeChunk & { score: number };

// ==================== CARGA PEREZOSA ====================

// Ruta configurable (KNOWLEDGE_BASE_PATH); por defecto apps/api/data/knowledge-base.json.
// El JSON (11 MB) no está en el repo: sin él, retrieve() devuelve [] y la lectura sigue.
const KB_PATH = process.env.KNOWLEDGE_BASE_PATH || path.join(process.cwd(), 'data', 'knowledge-base.json');
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_EMBED_MODEL = 'gemini-embedding-001';
const DEFAULT_DIMENSIONS = 768;

let cachedBase: KnowledgeBase | null = null;
let cacheLoaded = false;

/**
 * Carga la base desde disco una sola vez (cache en memoria del proceso).
 * Devuelve null si el archivo no existe, es inválido o tiene formato legacy.
 */
export async function loadKnowledgeBase(): Promise<KnowledgeBase | null> {
    if (cacheLoaded) return cachedBase;
    try {
        const raw = await fs.readFile(KB_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.chunks)) {
            cachedBase = parsed as KnowledgeBase;
        } else {
            cachedBase = null; // legacy ({} / []) o formato desconocido
        }
    } catch {
        cachedBase = null;
    }
    cacheLoaded = true;
    return cachedBase;
}

/** SOLO PARA TESTS: inyecta una base (o null); undefined resetea el cache. */
export function _setKnowledgeBaseForTests(base?: KnowledgeBase | null): void {
    if (base === undefined) {
        cachedBase = null;
        cacheLoaded = false;
    } else {
        cachedBase = base;
        cacheLoaded = true;
    }
}

// ==================== SIMILITUD ====================

/** Similitud coseno. Devuelve 0 ante vectores incompatibles o de norma cero. */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length === 0 || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Ranking puro (sin red ni fs): filtra por topic, ordena por similitud coseno
 * descendente y devuelve los top-k. Exportada para tests.
 */
export function rankChunks(
    queryEmbedding: number[],
    chunks: KnowledgeChunk[],
    opts: RetrieveOptions = {}
): ScoredChunk[] {
    const { k = 4, topic } = opts;
    const candidates = topic ? chunks.filter(c => c.topic === topic) : chunks;
    return candidates
        .map(c => ({ ...c, score: cosineSimilarity(queryEmbedding, c.embedding) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
}

// ==================== EMBEDDING DE CONSULTA ====================

/**
 * Genera el embedding de una consulta con el mismo modelo de la base.
 * Lanza Error si no hay API key o la llamada falla (retrieve lo captura).
 */
export async function embedQuery(
    text: string,
    opts: { model?: string; dimensions?: number; apiKey?: string } = {}
): Promise<number[]> {
    const apiKey = opts.apiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY no configurada para embeddings de consulta.');

    const model = opts.model || DEFAULT_EMBED_MODEL;
    const res = await fetch(`${API_BASE}/models/${model}:embedContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
            content: { parts: [{ text }] },
            taskType: 'RETRIEVAL_QUERY',
            outputDimensionality: opts.dimensions ?? DEFAULT_DIMENSIONS,
        }),
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`embedContent (${model}) falló — HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json() as { embedding?: { values?: number[] } };
    const values = data.embedding?.values;
    if (!values?.length) throw new Error('embedContent devolvió un embedding vacío.');
    return values;
}

// ==================== RETRIEVE ====================

/**
 * Recupera los top-k chunks más similares a la consulta.
 * NUNCA lanza: ante base vacía/inexistente o fallo de embeddings devuelve []
 * y loguea el motivo, para que el prompt siga sin contexto RAG.
 */
export async function retrieve(query: string, opts: RetrieveOptions = {}): Promise<ScoredChunk[]> {
    try {
        const base = await loadKnowledgeBase();
        if (!base || base.chunks.length === 0) {
            console.warn('[RAG] Base de conocimiento vacía o inexistente — prompt sin contexto.');
            return [];
        }

        const candidates = opts.topic ? base.chunks.filter(c => c.topic === opts.topic) : base.chunks;
        if (candidates.length === 0) {
            console.warn(`[RAG] Sin chunks para el topic "${opts.topic}" — prompt sin contexto.`);
            return [];
        }

        const queryEmbedding = await embedQuery(query, {
            model: base.model,
            dimensions: base.dimensions,
        });
        return rankChunks(queryEmbedding, candidates, { k: opts.k ?? 4 });
    } catch (e) {
        console.warn(`[RAG] retrieve falló (${e instanceof Error ? e.message : String(e)}) — prompt sin contexto.`);
        return [];
    }
}

// ==================== FORMATEO PARA PROMPT ====================

/**
 * Arma el bloque de contexto para inyectar en un prompt.
 * Devuelve '' si no hay chunks (el prompt queda igual que sin RAG).
 */
export function formatContext(chunks: KnowledgeChunk[]): string {
    if (!chunks || chunks.length === 0) return '';
    const entries = chunks
        .map((c, i) => `[${i + 1}] (${c.source}, fragmento ${c.chunkIndex}): ${c.text}`)
        .join('\n');
    return `FUENTES DE LA BIBLIOTECA:\n${entries}\n\nCuando uses un concepto de estas fuentes citalo como [Fuente: titulo].`;
}

/**
 * Conveniencia para las rutas: retrieve + formatContext en un paso, jamás lanza.
 * Devuelve '' si no hay contexto disponible.
 */
export async function retrieveContext(query: string, opts: RetrieveOptions = {}): Promise<string> {
    const chunks = await retrieve(query, opts);
    return formatContext(chunks);
}
