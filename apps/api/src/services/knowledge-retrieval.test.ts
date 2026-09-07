import { describe, it, expect, afterEach } from 'vitest';
import {
    cosineSimilarity,
    rankChunks,
    formatContext,
    retrieve,
    _setKnowledgeBaseForTests,
    type KnowledgeChunk,
    type KnowledgeBase,
} from './knowledge-retrieval';

function chunk(partial: Partial<KnowledgeChunk>): KnowledgeChunk {
    return {
        id: 'test#0',
        source: 'Libro de Prueba',
        topic: 'maya',
        chunkIndex: 0,
        text: 'texto de prueba',
        embedding: [1, 0, 0],
        ...partial,
    };
}

function baseWith(chunks: KnowledgeChunk[]): KnowledgeBase {
    return {
        version: 1,
        model: 'gemini-embedding-001',
        dimensions: 3,
        indexedFiles: {},
        chunks,
    };
}

afterEach(() => {
    _setKnowledgeBaseForTests(undefined); // resetea el cache
});

// ==================== SIMILITUD COSENO ====================

describe('cosineSimilarity', () => {
    it('vectores idénticos dan 1', () => {
        expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
    });

    it('vectores ortogonales dan 0', () => {
        expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
    });

    it('vectores opuestos dan -1', () => {
        expect(cosineSimilarity([2, 0, 0], [-3, 0, 0])).toBeCloseTo(-1, 6);
    });

    it('la escala no afecta el resultado', () => {
        expect(cosineSimilarity([1, 1], [10, 10])).toBeCloseTo(1, 6);
    });

    it('caso conocido: cos(45°) ≈ 0.7071', () => {
        expect(cosineSimilarity([1, 0], [1, 1])).toBeCloseTo(Math.SQRT1_2, 4);
    });

    it('longitudes distintas o vector cero devuelven 0', () => {
        expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
        expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
        expect(cosineSimilarity([], [])).toBe(0);
    });
});

// ==================== RANKING + FILTRO DE TOPIC ====================

describe('rankChunks', () => {
    const chunks: KnowledgeChunk[] = [
        chunk({ id: 'a', topic: 'maya', embedding: [1, 0, 0], text: 'sellos mayas' }),
        chunk({ id: 'b', topic: 'maya', embedding: [0.9, 0.1, 0], text: 'tonos galácticos' }),
        chunk({ id: 'c', topic: 'tarot', embedding: [1, 0, 0], text: 'arcanos mayores' }),
        chunk({ id: 'd', topic: 'maya', embedding: [0, 1, 0], text: 'otra cosa' }),
    ];

    it('ordena por similitud descendente y respeta k', () => {
        const result = rankChunks([1, 0, 0], chunks, { k: 2 });
        expect(result).toHaveLength(2);
        expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
        // 'a' y 'c' empatan en score 1; el tercero sería 'b'
        expect(result.map(r => r.id)).not.toContain('d');
    });

    it('filtra por topic antes de rankear', () => {
        const result = rankChunks([1, 0, 0], chunks, { k: 10, topic: 'maya' });
        expect(result.map(r => r.id).sort()).toEqual(['a', 'b', 'd']);
        expect(result.every(r => r.topic === 'maya')).toBe(true);
        expect(result[0].id).toBe('a'); // el más similar del topic
    });

    it('topic sin chunks devuelve []', () => {
        expect(rankChunks([1, 0, 0], chunks, { topic: 'numerologia' })).toEqual([]);
    });

    it('default k=4', () => {
        const many = Array.from({ length: 8 }, (_, i) => chunk({ id: `m${i}`, embedding: [1, 0, i / 10] }));
        expect(rankChunks([1, 0, 0], many)).toHaveLength(4);
    });
});

// ==================== FORMAT CONTEXT ====================

describe('formatContext', () => {
    it('arma el bloque con encabezado, fuentes numeradas y la instrucción de cita', () => {
        const result = formatContext([
            chunk({ source: 'Manual Kin Maya', chunkIndex: 7, text: 'El tono 8 es la armonía galáctica.' }),
            chunk({ source: 'El Tzolkin', chunkIndex: 2, text: 'Los 20 sellos solares.' }),
        ]);

        expect(result).toContain('FUENTES DE LA BIBLIOTECA:');
        expect(result).toContain('[1] (Manual Kin Maya, fragmento 7): El tono 8 es la armonía galáctica.');
        expect(result).toContain('[2] (El Tzolkin, fragmento 2): Los 20 sellos solares.');
        expect(result).toContain('citalo como [Fuente: titulo]');
        // El encabezado va primero
        expect(result.startsWith('FUENTES DE LA BIBLIOTECA:')).toBe(true);
    });

    it('devuelve cadena vacía sin chunks', () => {
        expect(formatContext([])).toBe('');
    });
});

// ==================== RETRIEVE CON BASE VACÍA ====================

describe('retrieve (comportamiento seguro)', () => {
    it('base vacía → devuelve [] sin tirar y sin llamar a la red', async () => {
        _setKnowledgeBaseForTests(baseWith([]));
        await expect(retrieve('¿qué significa la puerta 41?')).resolves.toEqual([]);
    });

    it('base inexistente (null) → devuelve [] sin tirar', async () => {
        _setKnowledgeBaseForTests(null);
        await expect(retrieve('tono galáctico 8')).resolves.toEqual([]);
    });

    it('topic sin candidatos → devuelve [] sin llamar a la red', async () => {
        _setKnowledgeBaseForTests(baseWith([chunk({ topic: 'maya' })]));
        await expect(retrieve('arcanos', { topic: 'tarot' })).resolves.toEqual([]);
    });
});
