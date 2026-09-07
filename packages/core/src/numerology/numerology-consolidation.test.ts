import { describe, it, expect } from 'vitest';
import { auditName } from './numerology';
import { calculateDestinyNumber, reduceNumber } from './numerology-api';
import { NumerologyHitchcock } from './hitchcock';

/**
 * Tests de consolidación de los motores de numerología.
 *
 * Motor canónico: NumerologyHitchcock (src/services/numerology-hitchcock.ts),
 * método del libro de Helyn Hitchcock "Numerología, portal del destino":
 * - cada nombre se reduce POR SEPARADO y se suman los reducidos (p. 48, JFK);
 * - maestros 11/22/33 (el 44 NO es maestro);
 * - Y es vocal solo si su palabra no contiene otra vocal (p. 30, WYNN;
 *   contraejemplo del propio libro: KENNEDY, donde la Y es consonante);
 * - W siempre consonante ("No uso W como vocal", p. 30);
 * - Ñ = 5 (práctica estándar en español) y los acentos se pliegan.
 */

describe('(a) coherencia: las tres vías públicas dan los mismos números', () => {
    const names = [
        'John Fitzgerald Kennedy',
        'Juan Perez',
        'María José García',
        'Lynn Peña',
        'Omar John'
    ];

    it.each(names)('"%s" -> auditName === calculateDestinyNumber === NumerologyHitchcock', (name) => {
        const audit = auditName(name);
        expect(audit.expression).toBe(NumerologyHitchcock.calculateDestiny(name));
        expect(audit.expression).toBe(calculateDestinyNumber(name));
        expect(audit.soulUrge).toBe(NumerologyHitchcock.calculateSoulUrge(name));
        expect(audit.personality).toBe(NumerologyHitchcock.calculatePersonality(name));
    });

    it('reproduce el ejemplo resuelto del libro (p. 48): John Fitzgerald Kennedy', () => {
        // Libro: vocales 6+6+1 = 13 -> 4; consonantes 5+3+5 = 13 -> 4;
        // destino 11 + 9 + 6 = 26 -> 8 (el 11 de John se preserva por-nombre).
        const audit = auditName('John Fitzgerald Kennedy');
        expect(audit.soulUrge).toBe(4);
        expect(audit.personality).toBe(4);
        expect(audit.expression).toBe(8);
    });
});

describe('(b) reducción por nombre vs suma global: gana el método del libro', () => {
    it('"Isa Ha": partes que reducen a 2 y 9 -> Expresión 11 (maestro) por-nombre', () => {
        // Isa: vocales I+A = 10 -> 1; consonantes S = 1; destino 1+1 = 2.
        // Ha:  vocales A = 1;      consonantes H = 8; destino 1+8 = 9.
        // Método del libro: 2 + 9 = 11 (maestro, se preserva).
        expect(NumerologyHitchcock.calculateDestiny('Isa Ha')).toBe(11);

        const audit = auditName('Isa Ha');
        expect(audit.expression).toBe(11);
        expect(audit.isMasterExpression).toBe(true);

        // La suma global de todas las letras (método viejo) habría dado
        // 9+1+1+8+1 = 20 -> 2 y perdía el maestro. "Nunca sumamos las
        // vocales y consonantes [en conjunto]... podemos perder un once
        // o un veintidós" (Hitchcock, p. 48).
        expect(audit.rawExpression).toBe(20);
        expect(reduceNumber(audit.rawExpression)).toBe(2);
        expect(audit.expression).not.toBe(reduceNumber(audit.rawExpression));
    });
});

describe('(c) regla de la Y (libro p. 30 + ejemplo Kennedy p. 48)', () => {
    it('Lynn: sin otra vocal en la palabra -> Y es VOCAL', () => {
        expect(NumerologyHitchcock.calculateSoulUrge('Lynn')).toBe(7); // Y = 7
        expect(NumerologyHitchcock.calculatePersonality('Lynn')).toBe(4); // L+N+N = 13 -> 4

        const audit = auditName('Lynn');
        expect(audit.vowelBreakdown).toEqual([{ char: 'Y', value: 7 }]);
    });

    it('Kennedy: la palabra tiene E -> Y es CONSONANTE (como en el libro)', () => {
        // Libro p. 48: vocales de Kennedy E+E = 10 -> 1; consonantes
        // K+N+N+D+Y = 23 -> 5.
        expect(NumerologyHitchcock.calculateSoulUrge('Kennedy')).toBe(1);
        expect(NumerologyHitchcock.calculatePersonality('Kennedy')).toBe(5);

        const audit = auditName('Kennedy');
        expect(audit.consonantBreakdown.some(c => c.char === 'Y')).toBe(true);
        expect(audit.vowelBreakdown.some(v => v.char === 'Y')).toBe(false);
    });

    it('Wynn (ejemplo del libro): Y es la vocal; la W es consonante', () => {
        // "Y es una vocal cuando no [hay] otra vocal... Ejemplo: en el nombre
        // WYNN, la Y es la [vocal]" y "No uso W como vocal" (p. 30).
        expect(NumerologyHitchcock.calculateSoulUrge('Wynn')).toBe(7); // Y = 7
        expect(NumerologyHitchcock.calculatePersonality('Wynn')).toBe(6); // W+N+N = 15 -> 6

        const audit = auditName('Wynn');
        expect(audit.vowelBreakdown).toEqual([{ char: 'Y', value: 7 }]);
        expect(audit.consonantBreakdown.some(c => c.char === 'W')).toBe(true);
    });
});

describe('(d) Ñ = 5 y acentos plegados', () => {
    it('María === Maria en los tres números', () => {
        const conAcento = auditName('María');
        const sinAcento = auditName('Maria');
        expect(conAcento.expression).toBe(sinAcento.expression);
        expect(conAcento.soulUrge).toBe(sinAcento.soulUrge);
        expect(conAcento.personality).toBe(sinAcento.personality);
        // Vocales de María: A+I+A = 1+9+1 = 11 (maestro preservado)
        expect(conAcento.soulUrge).toBe(11);
    });

    it('Peña === Pena (Ñ = 5, como la N) y la Ñ no se descarta', () => {
        expect(calculateDestinyNumber('Peña')).toBe(calculateDestinyNumber('Pena'));
        // Peña: vocales E+A = 6; consonantes P(7)+Ñ(5) = 12 -> 3; destino 9.
        // (Si la Ñ se descartara, las consonantes serían 7 y el destino 4.)
        expect(calculateDestinyNumber('Peña')).toBe(9);
        expect(NumerologyHitchcock.getLetterValue('Ñ')).toBe(5);
    });

    it('la normalización preserva la Ñ y pliega los acentos', () => {
        expect(NumerologyHitchcock.getNameParts('María José')).toEqual(['MARIA', 'JOSE']);
        expect(NumerologyHitchcock.getNameParts('Ñandú')).toEqual(['ÑANDU']);
    });
});

describe('(e) números maestros: 11/22/33 preservados, 44 ya no es maestro', () => {
    it('reduceNumber preserva 11/22/33 en cada iteración', () => {
        expect(reduceNumber(29)).toBe(11);
        expect(reduceNumber(1984)).toBe(22);
        expect(reduceNumber(33)).toBe(33);
        expect(reduceNumber(39)).toBe(3);
    });

    it('44 se colapsa: reduceNumber(44) === 8', () => {
        expect(reduceNumber(44)).toBe(8);
    });

    it('Expresión 22: "Omar John" (11 + 11 por-nombre)', () => {
        const audit = auditName('Omar John');
        expect(audit.expression).toBe(22);
        expect(audit.isMasterExpression).toBe(true);
        expect(audit.masterType).toBe('Marca Arquitecta');
    });

    it('Expresión 33: "Omar John Omar" (11 + 11 + 11 por-nombre)', () => {
        const audit = auditName('Omar John Omar');
        expect(audit.expression).toBe(33);
        expect(audit.isMasterExpression).toBe(true);
    });

    it('la suma por-nombre 44 ya NO se trata como maestro (44 -> 8)', () => {
        // Omar John Omar John: 11 + 11 + 11 + 11 = 44 -> 8
        const audit = auditName('Omar John Omar John');
        expect(audit.expression).toBe(8);
        expect(audit.isMasterExpression).toBe(false);
        expect(audit.masterType).toBeNull();
    });
});
