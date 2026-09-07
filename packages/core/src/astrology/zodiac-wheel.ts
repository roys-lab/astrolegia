/**
 * zodiac-wheel.ts — geometría y datos puros para la rueda zodiacal propia.
 *
 * Todo lo que se puede testear sin DOM vive acá: conversión polar→cartesiana,
 * arcos de los 12 signos, anti-colisión angular de planetas, cúspides de casas
 * desde chart_data.subject y clasificación de aspectos por ángulo y orbe.
 *
 * Convención de orientación (astrológica clásica, ASC al oeste):
 * - `polarToCartesian` usa orientación matemática vista en pantalla:
 *   0° = este (derecha), 90° = arriba, 180° = oeste (izquierda). El eje Y de
 *   SVG (que crece hacia abajo) ya está compensado.
 * - `chartAngle(absPos, rotation)` ubica la longitud eclíptica `rotation` en
 *   el oeste y hace crecer el zodíaco en sentido antihorario. Con rotation=0,
 *   0° Aries queda a la izquierda; con rotation=ASC, el Ascendente queda
 *   exactamente al oeste (como en las cartas impresas).
 */

import { getAbsolutePosition, normalizeDegrees, SIGN_LABELS_ES } from './chart-display';

// ==================== GEOMETRÍA BÁSICA ====================

export interface Point {
    x: number;
    y: number;
}

/**
 * Punto sobre un círculo. `angleDeg` en orientación matemática de pantalla:
 * 0° = derecha, 90° = arriba, 180° = izquierda, 270° = abajo.
 */
export function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): Point {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

/**
 * Ángulo de pantalla para una longitud eclíptica absoluta.
 * Con rotation=0, 0° Aries → 180° (izquierda/oeste). El zodíaco crece en
 * sentido antihorario (0° Cáncer abajo, 0° Libra a la derecha, 0° Capricornio
 * arriba). Pasando rotation=ASC, el Ascendente queda al oeste.
 */
export function chartAngle(absPos: number, rotationAbsPos = 0): number {
    return normalizeDegrees(180 + absPos - rotationAbsPos);
}

/** Conveniencia: punto en la rueda para una longitud absoluta. */
export function pointOnWheel(cx: number, cy: number, r: number, absPos: number, rotationAbsPos = 0): Point {
    return polarToCartesian(cx, cy, r, chartAngle(absPos, rotationAbsPos));
}

/** Separación angular mínima entre dos longitudes, en [0, 180]. */
export function angularDistance(a: number, b: number): number {
    const diff = Math.abs(normalizeDegrees(a) - normalizeDegrees(b)) % 360;
    return diff > 180 ? 360 - diff : diff;
}

/**
 * Path SVG de un sector anular (porción de anillo) entre dos ángulos de
 * pantalla. Ángulo creciente = antihorario en pantalla, por eso el arco
 * exterior usa sweep-flag 0 (SVG tiene el eje Y invertido).
 */
export function annularSectorPath(
    cx: number, cy: number,
    rOuter: number, rInner: number,
    startAngleDeg: number, endAngleDeg: number,
): string {
    const largeArc = Math.abs(endAngleDeg - startAngleDeg) > 180 ? 1 : 0;
    const oStart = polarToCartesian(cx, cy, rOuter, startAngleDeg);
    const oEnd = polarToCartesian(cx, cy, rOuter, endAngleDeg);
    const iStart = polarToCartesian(cx, cy, rInner, startAngleDeg);
    const iEnd = polarToCartesian(cx, cy, rInner, endAngleDeg);
    const f = (n: number) => Number(n.toFixed(3));
    return [
        `M ${f(oStart.x)} ${f(oStart.y)}`,
        `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${f(oEnd.x)} ${f(oEnd.y)}`,
        `L ${f(iEnd.x)} ${f(iEnd.y)}`,
        `A ${rInner} ${rInner} 0 ${largeArc} 1 ${f(iStart.x)} ${f(iStart.y)}`,
        'Z',
    ].join(' ');
}

// ==================== SIGNOS ====================

export type ZodiacElement = 'fire' | 'earth' | 'air' | 'water';

export interface SignDefinition {
    index: number;
    name: string;
    glyph: string;
    element: ZodiacElement;
}

const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'] as const;
const ELEMENT_CYCLE: ZodiacElement[] = ['fire', 'earth', 'air', 'water'];

/** Los 12 signos con glifo Unicode, nombre en español y elemento. */
export const SIGNS: SignDefinition[] = SIGN_GLYPHS.map((glyph, index) => ({
    index,
    glyph,
    name: SIGN_LABELS_ES[index],
    element: ELEMENT_CYCLE[index % 4],
}));

/** Elemento del signo que contiene una longitud absoluta. */
export function elementOfAbsPos(absPos: number): ZodiacElement {
    return SIGNS[Math.floor(normalizeDegrees(absPos) / 30) % 12].element;
}

export interface SignArc extends SignDefinition {
    startAbs: number;
    endAbs: number;
    /** Ángulos de pantalla; endAngle = startAngle + 30 (sin normalizar, para paths). */
    startAngle: number;
    endAngle: number;
    midAngle: number;
}

/** Arcos de los 12 signos, ya convertidos a ángulos de pantalla. */
export function signArcs(rotationAbsPos = 0): SignArc[] {
    return SIGNS.map(sign => {
        const startAbs = sign.index * 30;
        const startAngle = chartAngle(startAbs, rotationAbsPos);
        return {
            ...sign,
            startAbs,
            endAbs: startAbs + 30,
            startAngle,
            endAngle: startAngle + 30,
            midAngle: startAngle + 15,
        };
    });
}

// ==================== PLANETAS (ANTI-COLISIÓN) ====================

/**
 * Asigna un nivel radial (0, 1, 2...) a cada cuerpo para evitar que los
 * glifos se pisen: los cuerpos se ordenan por longitud y se encadenan en
 * clusters cuando la separación con el vecino es < thresholdDeg (incluyendo
 * el cruce por 0° Aries). Dentro de cada cluster los niveles se escalonan
 * cíclicamente (i % maxLevels). Los cuerpos sin posición se descartan.
 */
export function placeBodies<T extends { absPos: number | null }>(
    bodies: T[],
    thresholdDeg = 6,
    maxLevels = 3,
): Array<T & { absPos: number; level: number }> {
    const positioned = bodies
        .filter((b): b is T & { absPos: number } =>
            typeof b.absPos === 'number' && Number.isFinite(b.absPos))
        .map(b => ({ ...b, absPos: normalizeDegrees(b.absPos) }))
        .sort((a, b) => a.absPos - b.absPos);
    if (positioned.length === 0) return [];

    // Clusters por encadenamiento de vecinos consecutivos
    const clusters: Array<Array<T & { absPos: number }>> = [];
    let current: Array<T & { absPos: number }> = [positioned[0]];
    for (let i = 1; i < positioned.length; i++) {
        if (positioned[i].absPos - positioned[i - 1].absPos < thresholdDeg) {
            current.push(positioned[i]);
        } else {
            clusters.push(current);
            current = [positioned[i]];
        }
    }
    clusters.push(current);

    // El último y el primer cluster pueden tocarse cruzando 0° Aries
    if (clusters.length > 1) {
        const first = clusters[0];
        const last = clusters[clusters.length - 1];
        const wrapGap = first[0].absPos + 360 - last[last.length - 1].absPos;
        if (wrapGap < thresholdDeg) {
            clusters[0] = [...last, ...first];
            clusters.pop();
        }
    }

    const levels = Math.max(1, Math.floor(maxLevels));
    return clusters.flatMap(cluster =>
        cluster.map((body, i) => ({ ...body, level: cluster.length > 1 ? i % levels : 0 })),
    );
}

// ==================== CASAS ====================

const HOUSE_KEYS = [
    'first_house', 'second_house', 'third_house', 'fourth_house',
    'fifth_house', 'sixth_house', 'seventh_house', 'eighth_house',
    'ninth_house', 'tenth_house', 'eleventh_house', 'twelfth_house',
] as const;

/** Numerales romanos de las 12 casas, indexados 0-11. */
export const ROMAN_NUMERALS = [
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
] as const;

/**
 * Cúspides de las 12 casas (longitudes absolutas 0-360) desde
 * chart_data.subject. Soporta ambos formatos de la API:
 * - claves first_house..twelfth_house (objetos con abs_pos), o
 * - un array `houses` de objetos o números.
 * Devuelve null si falta alguna cúspide.
 */
export function extractHouseCusps(subject: unknown): number[] | null {
    if (!subject || typeof subject !== 'object' || Array.isArray(subject)) return null;
    const record = subject as Record<string, unknown>;

    const houses = record.houses;
    if (Array.isArray(houses)) {
        if (houses.length < 12) return null;
        const cusps: number[] = [];
        for (const entry of houses.slice(0, 12)) {
            const pos = typeof entry === 'number' && Number.isFinite(entry)
                ? normalizeDegrees(entry)
                : getAbsolutePosition(entry);
            if (pos === null) return null;
            cusps.push(pos);
        }
        return cusps;
    }

    const cusps: number[] = [];
    for (const key of HOUSE_KEYS) {
        const pos = getAbsolutePosition(record[key]);
        if (pos === null) return null;
        cusps.push(pos);
    }
    return cusps;
}

/** Punto medio angular de cada casa (para ubicar el numeral romano). */
export function houseMidpoints(cusps: number[]): number[] {
    return cusps.map((cusp, i) => {
        const next = cusps[(i + 1) % cusps.length];
        const span = normalizeDegrees(next - cusp);
        return normalizeDegrees(cusp + span / 2);
    });
}

// ==================== ASPECTOS ====================

export type AspectType = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
export type AspectNature = 'harmonic' | 'tense' | 'neutral';

export interface AspectDefinition {
    type: AspectType;
    angle: number;
    maxOrb: number;
    nature: AspectNature;
}

/** Los 5 aspectos mayores con su orbe máximo y naturaleza. */
export const ASPECT_DEFINITIONS: AspectDefinition[] = [
    { type: 'conjunction', angle: 0, maxOrb: 10, nature: 'neutral' },
    { type: 'sextile', angle: 60, maxOrb: 6, nature: 'harmonic' },
    { type: 'square', angle: 90, maxOrb: 8, nature: 'tense' },
    { type: 'trine', angle: 120, maxOrb: 8, nature: 'harmonic' },
    { type: 'opposition', angle: 180, maxOrb: 10, nature: 'tense' },
];

/**
 * Clasifica una separación angular como aspecto mayor.
 * Devuelve el aspecto de menor orbe dentro de su orbe máximo, o null si la
 * separación no corresponde a ningún aspecto mayor (quintiles, etc. quedan
 * afuera).
 */
export function classifyAspectAngle(angleDeg: number): { type: AspectType; orb: number } | null {
    const separation = angularDistance(angleDeg, 0);
    let best: { type: AspectType; orb: number } | null = null;
    for (const def of ASPECT_DEFINITIONS) {
        const orb = Math.abs(separation - def.angle);
        if (orb <= def.maxOrb && (best === null || orb < best.orb)) {
            best = { type: def.type, orb };
        }
    }
    return best;
}

/** Naturaleza de un aspecto: armónico (trígono/sextil), tenso (cuadratura/oposición) o neutro (conjunción). */
export function aspectNature(type: AspectType): AspectNature {
    return ASPECT_DEFINITIONS.find(d => d.type === type)!.nature;
}

const MIN_ASPECT_OPACITY = 0.15;
const MAX_ASPECT_OPACITY = 0.8;

/**
 * Opacidad de la cuerda según exactitud: orbe 0 → 0.8, orbe máximo → 0.15,
 * lineal entre medio y siempre acotada a [0.15, 0.8].
 */
export function aspectOpacity(orb: number, maxOrb = 10): number {
    if (!Number.isFinite(orb) || !Number.isFinite(maxOrb) || maxOrb <= 0) return MIN_ASPECT_OPACITY;
    const exactness = Math.min(1, Math.max(0, 1 - Math.abs(orb) / maxOrb));
    return MIN_ASPECT_OPACITY + (MAX_ASPECT_OPACITY - MIN_ASPECT_OPACITY) * exactness;
}

export interface WheelAspect {
    p1Name: string;
    p2Name: string;
    p1AbsPos: number;
    p2AbsPos: number;
    type: AspectType;
    nature: AspectNature;
    orb: number;
    opacity: number;
}

function toFinite(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Extrae los aspectos dibujables desde chart_data.aspects.
 * - Reclasifica cada entrada por ángulo real entre posiciones (los aspectos
 *   menores como quintiles quedan descartados).
 * - `allowedNames` (case-insensitive, ej. claves del subject como 'sun' o
 *   'true_north_lunar_node') filtra a los cuerpos realmente dibujados; ambos
 *   extremos deben estar permitidos.
 */
export function extractWheelAspects(aspects: unknown, allowedNames?: Iterable<string>): WheelAspect[] {
    if (!Array.isArray(aspects)) return [];
    const allowed = allowedNames
        ? new Set(Array.from(allowedNames, n => n.toLowerCase()))
        : null;

    const result: WheelAspect[] = [];
    for (const raw of aspects) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
        const entry = raw as Record<string, unknown>;
        const p1Name = typeof entry.p1_name === 'string' ? entry.p1_name : null;
        const p2Name = typeof entry.p2_name === 'string' ? entry.p2_name : null;
        const p1AbsPos = toFinite(entry.p1_abs_pos);
        const p2AbsPos = toFinite(entry.p2_abs_pos);
        if (!p1Name || !p2Name || p1AbsPos === null || p2AbsPos === null) continue;
        if (allowed && (!allowed.has(p1Name.toLowerCase()) || !allowed.has(p2Name.toLowerCase()))) continue;

        const classified = classifyAspectAngle(angularDistance(p1AbsPos, p2AbsPos));
        if (!classified) continue;
        const def = ASPECT_DEFINITIONS.find(d => d.type === classified.type)!;
        result.push({
            p1Name,
            p2Name,
            p1AbsPos: normalizeDegrees(p1AbsPos),
            p2AbsPos: normalizeDegrees(p2AbsPos),
            type: classified.type,
            nature: def.nature,
            orb: classified.orb,
            opacity: aspectOpacity(classified.orb, def.maxOrb),
        });
    }
    return result;
}

// ==================== GLIFOS DE PLANETAS ====================

/** Glifo Unicode por id canónico de cuerpo (ids de chart-display). */
export const PLANET_GLYPHS: Record<string, string> = {
    sun: '☉',
    moon: '☽',
    mercury: '☿',
    venus: '♀',
    mars: '♂',
    jupiter: '♃',
    saturn: '♄',
    uranus: '♅',
    neptune: '♆',
    pluto: '♇',
    chiron: '⚷',
    north_node: '☊',
    south_node: '☋',
    lilith: '⚸',
};
