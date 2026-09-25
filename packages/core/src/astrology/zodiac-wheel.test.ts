import { describe, it, expect } from 'vitest';
import {
    polarToCartesian,
    chartAngle,
    pointOnWheel,
    angularDistance,
    annularSectorPath,
    SIGNS,
    signArcs,
    elementOfAbsPos,
    placeBodies,
    extractHouseCusps,
    houseMidpoints,
    ROMAN_NUMERALS,
    classifyAspectAngle,
    aspectNature,
    aspectOpacity,
    extractWheelAspects,
    PLANET_GLYPHS,
} from './zodiac-wheel';

// ==================== GEOMETRÍA BÁSICA ====================

describe('polarToCartesian', () => {
    it('mapea la orientación matemática vista en pantalla (SVG, Y hacia abajo)', () => {
        const right = polarToCartesian(0, 0, 100, 0);
        expect(right.x).toBeCloseTo(100);
        expect(right.y).toBeCloseTo(0);

        const top = polarToCartesian(0, 0, 100, 90);
        expect(top.x).toBeCloseTo(0);
        expect(top.y).toBeCloseTo(-100); // arriba = Y negativa en SVG

        const left = polarToCartesian(0, 0, 100, 180);
        expect(left.x).toBeCloseTo(-100);
        expect(left.y).toBeCloseTo(0);

        const bottom = polarToCartesian(0, 0, 100, 270);
        expect(bottom.x).toBeCloseTo(0);
        expect(bottom.y).toBeCloseTo(100); // abajo = Y positiva en SVG
    });

    it('respeta el centro', () => {
        const p = polarToCartesian(300, 300, 50, 180);
        expect(p.x).toBeCloseTo(250);
        expect(p.y).toBeCloseTo(300);
    });
});

describe('chartAngle / pointOnWheel — convención astrológica', () => {
    it('pone 0° Aries a la izquierda (oeste) sin rotación', () => {
        expect(chartAngle(0)).toBe(180);
        const p = pointOnWheel(0, 0, 100, 0);
        expect(p.x).toBeCloseTo(-100);
        expect(p.y).toBeCloseTo(0);
    });

    it('el zodíaco crece antihorario: 0° Cáncer abajo, 0° Libra derecha, 0° Capricornio arriba', () => {
        expect(chartAngle(90)).toBe(270);
        expect(pointOnWheel(0, 0, 100, 90).y).toBeCloseTo(100); // abajo

        expect(chartAngle(180)).toBe(0);
        expect(pointOnWheel(0, 0, 100, 180).x).toBeCloseTo(100); // derecha

        expect(chartAngle(270)).toBe(90);
        expect(pointOnWheel(0, 0, 100, 270).y).toBeCloseTo(-100); // arriba
    });

    it('con rotación = ASC, el Ascendente queda exactamente al oeste', () => {
        const asc = 89.78728885504322; // ASC real de la carta de validación (29° Gem)
        expect(chartAngle(asc, asc)).toBe(180);
        const p = pointOnWheel(0, 0, 100, asc, asc);
        expect(p.x).toBeCloseTo(-100);
        expect(p.y).toBeCloseTo(0);
    });

    it('normaliza a [0, 360)', () => {
        expect(chartAngle(200)).toBe(20);
        expect(chartAngle(-10)).toBe(170);
    });
});

describe('angularDistance', () => {
    it('devuelve la separación mínima cruzando 0°', () => {
        expect(angularDistance(350, 10)).toBe(20);
        expect(angularDistance(10, 350)).toBe(20);
    });

    it('está acotada a [0, 180]', () => {
        expect(angularDistance(0, 180)).toBe(180);
        expect(angularDistance(0, 190)).toBe(170);
        expect(angularDistance(42, 42)).toBe(0);
    });
});

describe('annularSectorPath', () => {
    it('genera un path cerrado con dos arcos', () => {
        const d = annularSectorPath(300, 300, 292, 252, 180, 210);
        expect(d.startsWith('M ')).toBe(true);
        expect(d.match(/A /g)?.length).toBe(2);
        expect(d.endsWith('Z')).toBe(true);
    });
});

// ==================== SIGNOS ====================

describe('SIGNS / signArcs', () => {
    it('define los 12 signos con glifo y elemento cíclico fuego-tierra-aire-agua', () => {
        expect(SIGNS).toHaveLength(12);
        expect(SIGNS[0]).toMatchObject({ name: 'Aries', glyph: '♈', element: 'fire' });
        expect(SIGNS[1].element).toBe('earth');
        expect(SIGNS[2].element).toBe('air');
        expect(SIGNS[3].element).toBe('water');
        expect(SIGNS[4].element).toBe('fire'); // Leo
        expect(SIGNS[11]).toMatchObject({ name: 'Piscis', glyph: '♓', element: 'water' });
    });

    it('sin rotación, Aries arranca a la izquierda y cada arco mide 30°', () => {
        const arcs = signArcs();
        expect(arcs).toHaveLength(12);
        expect(arcs[0].startAngle).toBe(180);
        expect(arcs[0].endAngle).toBe(210);
        expect(arcs[0].midAngle).toBe(195);
        for (const arc of arcs) {
            expect(arc.endAngle - arc.startAngle).toBeCloseTo(30);
        }
    });

    it('la rotación desplaza los arcos: con ASC en 90, Cáncer arranca al oeste', () => {
        const arcs = signArcs(90);
        expect(arcs[3].name).toBe('Cáncer');
        expect(arcs[3].startAngle).toBe(180);
    });

    it('elementOfAbsPos deriva el elemento del signo que contiene la longitud', () => {
        expect(elementOfAbsPos(15)).toBe('fire');    // Aries
        expect(elementOfAbsPos(354.87)).toBe('water'); // Piscis
        expect(elementOfAbsPos(360 + 45)).toBe('earth'); // normaliza (Tauro)
    });
});

// ==================== ANTI-COLISIÓN ====================

describe('placeBodies (anti-colisión angular)', () => {
    const body = (id: string, absPos: number | null) => ({ id, absPos });

    it('cuerpos separados quedan todos en nivel 0', () => {
        const placed = placeBodies([body('a', 0), body('b', 40), body('c', 200)]);
        expect(placed.map(p => p.level)).toEqual([0, 0, 0]);
    });

    it('dos cuerpos a menos de 6° se escalonan radialmente', () => {
        const placed = placeBodies([body('a', 10), body('b', 12)]);
        expect(placed.map(p => p.level)).toEqual([0, 1]);
    });

    it('a exactamente 6° no hay colisión', () => {
        const placed = placeBodies([body('a', 10), body('b', 16)]);
        expect(placed.map(p => p.level)).toEqual([0, 0]);
    });

    it('encadena colisiones transitivas (0°, 5°, 10° forman un cluster de 3)', () => {
        const placed = placeBodies([body('a', 0), body('b', 5), body('c', 10)]);
        expect(placed.map(p => p.level)).toEqual([0, 1, 2]);
    });

    it('detecta colisiones cruzando 0° Aries', () => {
        const placed = placeBodies([body('a', 358), body('b', 2)]);
        const levels = placed.map(p => p.level).sort();
        expect(levels).toEqual([0, 1]);
    });

    it('cicla los niveles cuando el cluster supera maxLevels', () => {
        const placed = placeBodies(
            [body('a', 0), body('b', 4), body('c', 8), body('d', 12)],
            6, 3,
        );
        expect(placed.map(p => p.level)).toEqual([0, 1, 2, 0]);
    });

    it('descarta cuerpos sin posición y preserva el resto de los campos', () => {
        const placed = placeBodies([
            { id: 'sun', label: 'Sol', absPos: 84.13 },
            { id: 'moon', label: 'Luna', absPos: null },
        ]);
        expect(placed).toHaveLength(1);
        expect(placed[0]).toMatchObject({ id: 'sun', label: 'Sol', level: 0 });
    });
});

// ==================== CASAS ====================

describe('extractHouseCusps / houseMidpoints', () => {
    // Cúspides reales de la carta de validación (Buenos Aires, Placidus)
    const subject = {
        name: 'Validacion BA', // escalar: debe ignorarse
        first_house: { abs_pos: 89.78728885504322 },
        second_house: { abs_pos: 125.72831535963046 },
        third_house: { abs_pos: 164.54894315434905 },
        fourth_house: { abs_pos: 198.61880499907278 },
        fifth_house: { abs_pos: 225.7010190833858 },
        sixth_house: { abs_pos: 248.30405723340075 },
        seventh_house: { abs_pos: 269.78728885504324 },
        eighth_house: { abs_pos: 305.72831535963047 },
        ninth_house: { abs_pos: 344.54894315434905 },
        tenth_house: { abs_pos: 18.61880499907277 },
        eleventh_house: { abs_pos: 45.70101908338581 },
        twelfth_house: { abs_pos: 68.30405723340075 },
    };

    it('lee las claves first_house..twelfth_house de la API real', () => {
        const cusps = extractHouseCusps(subject);
        expect(cusps).toHaveLength(12);
        expect(cusps![0]).toBeCloseTo(89.787, 3);   // ASC
        expect(cusps![9]).toBeCloseTo(18.619, 3);   // MC
    });

    it('acepta el formato array (objetos o números)', () => {
        const asObjects = { houses: Array.from({ length: 12 }, (_, i) => ({ abs_pos: i * 30 })) };
        expect(extractHouseCusps(asObjects)).toEqual([0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]);

        const asNumbers = { houses: Array.from({ length: 12 }, (_, i) => i * 30 + 5) };
        expect(extractHouseCusps(asNumbers)![0]).toBe(5);
    });

    it('devuelve null si falta alguna cúspide o el subject es inválido', () => {
        expect(extractHouseCusps({ first_house: { abs_pos: 10 } })).toBeNull();
        expect(extractHouseCusps({ houses: [0, 30] })).toBeNull();
        expect(extractHouseCusps(null)).toBeNull();
        expect(extractHouseCusps('subject')).toBeNull();
    });

    it('houseMidpoints ubica el medio de cada casa, incluso cruzando 0°', () => {
        const equal = Array.from({ length: 12 }, (_, i) => i * 30);
        expect(houseMidpoints(equal)[0]).toBe(15);
        expect(houseMidpoints(equal)[11]).toBe(345);

        const wrapped = [350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320];
        expect(houseMidpoints(wrapped)[0]).toBe(5); // 350 → 20 pasa por 0°
    });

    it('hay un numeral romano por casa', () => {
        expect(ROMAN_NUMERALS).toHaveLength(12);
        expect(ROMAN_NUMERALS[0]).toBe('I');
        expect(ROMAN_NUMERALS[9]).toBe('X');
    });
});

// ==================== ASPECTOS ====================

describe('classifyAspectAngle', () => {
    it('clasifica los 5 aspectos mayores con su orbe', () => {
        expect(classifyAspectAngle(0)).toEqual({ type: 'conjunction', orb: 0 });
        expect(classifyAspectAngle(3.2)?.type).toBe('conjunction');
        expect(classifyAspectAngle(61.5)).toEqual({ type: 'sextile', orb: 1.5 });
        expect(classifyAspectAngle(92)).toEqual({ type: 'square', orb: 2 });
        expect(classifyAspectAngle(127.25)?.type).toBe('trine');
        expect(classifyAspectAngle(172.17)?.type).toBe('opposition');
    });

    it('rechaza separaciones fuera de orbe y aspectos menores (quintil 72°)', () => {
        expect(classifyAspectAngle(72)).toBeNull();
        expect(classifyAspectAngle(45)).toBeNull();
        expect(classifyAspectAngle(15)).toBeNull();
        expect(classifyAspectAngle(70)).toBeNull(); // 10° de sextil, 20° de cuadratura
    });

    it('mapea la naturaleza: armónicos, tensos y conjunción neutra', () => {
        expect(aspectNature('trine')).toBe('harmonic');
        expect(aspectNature('sextile')).toBe('harmonic');
        expect(aspectNature('square')).toBe('tense');
        expect(aspectNature('opposition')).toBe('tense');
        expect(aspectNature('conjunction')).toBe('neutral');
    });
});

describe('aspectOpacity', () => {
    it('más exacto = más visible, acotado a [0.15, 0.8]', () => {
        expect(aspectOpacity(0)).toBeCloseTo(0.8);
        expect(aspectOpacity(10)).toBeCloseTo(0.15);
        expect(aspectOpacity(15)).toBeCloseTo(0.15); // clamp por encima del orbe máximo
        const exact = aspectOpacity(1);
        const wide = aspectOpacity(7);
        expect(exact).toBeGreaterThan(wide);
    });

    it('degrada con gracia ante entradas inválidas', () => {
        expect(aspectOpacity(NaN)).toBe(0.15);
        expect(aspectOpacity(3, 0)).toBe(0.15);
    });
});

describe('extractWheelAspects', () => {
    // Entradas reales de chart_data.aspects (carta de validación BA)
    const realAspects = [
        { p1_name: 'Sun', p2_name: 'Mercury', p1_abs_pos: 354.86800565083144, p2_abs_pos: 351.65621935415794, aspect: 'conjunction', orbit: 3.2117862966734947 },
        { p1_name: 'Sun', p2_name: 'Pluto', p1_abs_pos: 354.86800565083144, p2_abs_pos: 227.6142783559898, aspect: 'trine', orbit: 7.253727294841639 },
        { p1_name: 'Mercury', p2_name: 'Uranus', p1_abs_pos: 351.65621935415794, p2_abs_pos: 279.2253126358601, aspect: 'quintile', orbit: 0.4309067182978197 },
        { p1_name: 'Jupiter', p2_name: 'Uranus', p1_abs_pos: 91.39299829743103, p2_abs_pos: 279.2253126358601, aspect: 'opposition', orbit: 7.832314338429086 },
        { p1_name: 'Saturn', p2_name: 'Pluto', p1_abs_pos: 293.3530043996809, p2_abs_pos: 227.6142783559898, aspect: 'sextile', orbit: 5.738726043691116 },
        { p1_name: 'Moon', p2_name: 'Venus', p1_abs_pos: 222.47474461510512, p2_abs_pos: 309.33379546021325, aspect: 'square', orbit: 3.140949154891871 },
    ];

    it('clasifica los aspectos mayores igual que la API y descarta el quintil', () => {
        const extracted = extractWheelAspects(realAspects);
        expect(extracted.map(a => a.type)).toEqual([
            'conjunction', 'trine', 'opposition', 'sextile', 'square',
        ]);
        const sunPluto = extracted[1];
        expect(sunPluto.orb).toBeCloseTo(7.2537, 3);
        expect(sunPluto.nature).toBe('harmonic');
    });

    it('la opacidad refleja la exactitud del orbe', () => {
        const extracted = extractWheelAspects(realAspects);
        const conj = extracted.find(a => a.type === 'conjunction')!;   // orbe 3.21 / 10
        const trine = extracted.find(a => a.type === 'trine')!;        // orbe 7.25 / 8
        expect(conj.opacity).toBeGreaterThan(trine.opacity);
        expect(trine.opacity).toBeGreaterThanOrEqual(0.15);
        expect(conj.opacity).toBeLessThanOrEqual(0.8);
    });

    it('filtra por nombres permitidos (case-insensitive, ambos extremos)', () => {
        const allowed = ['sun', 'mercury', 'pluto'];
        const extracted = extractWheelAspects(realAspects, allowed);
        expect(extracted.map(a => `${a.p1Name}-${a.p2Name}`)).toEqual(['Sun-Mercury', 'Sun-Pluto']);
    });

    it('matchea nombres largos de la API contra claves del subject', () => {
        const nodeAspect = [{
            p1_name: 'Moon', p2_name: 'True_North_Lunar_Node',
            p1_abs_pos: 222.47474461510512, p2_abs_pos: 315.737727873722,
        }];
        const extracted = extractWheelAspects(nodeAspect, ['moon', 'true_north_lunar_node']);
        expect(extracted).toHaveLength(1);
        expect(extracted[0].type).toBe('square');
    });

    it('tolera basura sin romper', () => {
        expect(extractWheelAspects(undefined)).toEqual([]);
        expect(extractWheelAspects('aspects')).toEqual([]);
        expect(extractWheelAspects([null, 42, { p1_name: 'Sun' }])).toEqual([]);
    });
});

// ==================== GLIFOS ====================

describe('PLANET_GLYPHS', () => {
    it('cubre los 10 planetas + Quirón, Nodos y Lilith', () => {
        expect(Object.keys(PLANET_GLYPHS)).toHaveLength(14);
        expect(PLANET_GLYPHS.sun).toBe('☉');
        expect(PLANET_GLYPHS.moon).toBe('☽');
        expect(PLANET_GLYPHS.chiron).toBe('⚷');
        expect(PLANET_GLYPHS.north_node).toBe('☊');
        expect(PLANET_GLYPHS.south_node).toBe('☋');
        expect(PLANET_GLYPHS.lilith).toBe('⚸');
    });
});
