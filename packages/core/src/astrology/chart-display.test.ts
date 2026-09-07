import { describe, it, expect } from 'vitest';
import {
    parseHouseNumber,
    formatPosition,
    formatDegreeMinute,
    signFromAbsPos,
    southNodeAbsPos,
    translateSign,
    getAbsolutePosition,
    extractChartBodies,
    buildPlanetsPromptLines
} from './chart-display';

describe('parseHouseNumber', () => {
    it("maps Kerykeion word format: 'First_House' -> 1", () => {
        expect(parseHouseNumber('First_House')).toBe(1);
    });

    it('keeps direct numbers: 7 -> 7', () => {
        expect(parseHouseNumber(7)).toBe(7);
    });

    it('maps every word house from First to Twelfth', () => {
        const words = [
            'First_House', 'Second_House', 'Third_House', 'Fourth_House',
            'Fifth_House', 'Sixth_House', 'Seventh_House', 'Eighth_House',
            'Ninth_House', 'Tenth_House', 'Eleventh_House', 'Twelfth_House'
        ];
        expect(words.map(parseHouseNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('accepts numeric strings', () => {
        expect(parseHouseNumber('10')).toBe(10);
    });

    it('rejects garbage without producing NaN', () => {
        expect(parseHouseNumber(undefined)).toBeNull();
        expect(parseHouseNumber(null)).toBeNull();
        expect(parseHouseNumber('')).toBeNull();
        expect(parseHouseNumber('Thirteenth_House')).toBeNull();
        expect(parseHouseNumber(0)).toBeNull();
        expect(parseHouseNumber(13)).toBeNull();
    });
});

describe('formatPosition / formatDegreeMinute', () => {
    it("formats 84.13° as 24°08′ Géminis", () => {
        // 84.13 - 60 = 24.13° in Gemini; 0.13° * 60 = 7.8′ ≈ 8′
        expect(formatPosition(84.13)).toBe('24°08′ Géminis');
    });

    it('pads minutes to two digits', () => {
        expect(formatDegreeMinute(84.13)).toBe('24°08′');
        expect(formatDegreeMinute(0)).toBe('0°00′');
    });

    it('carries rounded minutes across the sign boundary', () => {
        // 29.9999° Aries -> 30°00′ would be invalid; must become 0°00′ Tauro
        expect(formatPosition(29.9999)).toBe('0°00′ Tauro');
    });

    it('normalizes values outside 0-360', () => {
        expect(formatPosition(444.13)).toBe('24°08′ Géminis'); // 444.13 - 360
        expect(signFromAbsPos(-30)).toBe('Piscis'); // -30 -> 330
    });
});

describe('southNodeAbsPos', () => {
    it('derives 125.07° -> 305.07° (Acuario)', () => {
        expect(southNodeAbsPos(125.07)).toBeCloseTo(305.07, 10);
        expect(signFromAbsPos(southNodeAbsPos(125.07))).toBe('Acuario');
    });

    it('wraps around 360', () => {
        expect(southNodeAbsPos(315.74)).toBeCloseTo(135.74, 10);
    });
});

describe('translateSign', () => {
    it('translates Kerykeion abbreviations and full names', () => {
        expect(translateSign('Gem')).toBe('Géminis');
        expect(translateSign('Pis')).toBe('Piscis');
        expect(translateSign('Scorpio')).toBe('Escorpio');
    });

    it('returns null for non-strings', () => {
        expect(translateSign(undefined)).toBeNull();
        expect(translateSign(1990)).toBeNull();
    });
});

describe('getAbsolutePosition', () => {
    it('prefers abs_pos', () => {
        expect(getAbsolutePosition({ abs_pos: 84.13, position: 24.13 })).toBeCloseTo(84.13, 10);
    });

    it('rebuilds from sign_num + position when abs_pos is missing', () => {
        expect(getAbsolutePosition({ sign_num: 2, position: 24.13 })).toBeCloseTo(84.13, 10);
    });

    it('returns null for scalars and empty objects', () => {
        expect(getAbsolutePosition(1990)).toBeNull();
        expect(getAbsolutePosition({})).toBeNull();
        expect(getAbsolutePosition(null)).toBeNull();
    });
});

// Minimal Kerykeion-style subject helpers
const body = (sign: string, absPos: number, house: unknown, retrograde = false) => ({
    name: sign, sign, position: absPos % 30, abs_pos: absPos, house, retrograde
});

describe('extractChartBodies', () => {
    it('filters scalar subject fields (year: 1990 does not pass)', () => {
        const subject = {
            name: 'Santos', year: 1990, month: 3, city: 'Buenos Aires',
            sun: body('Pis', 354.868, 'Ninth_House')
        };
        const bodies = extractChartBodies(subject);
        expect(bodies).toHaveLength(1);
        expect(bodies[0].id).toBe('sun');
        expect(bodies.some(b => b.sourceKey === 'year' || b.label.includes('undefined'))).toBe(false);
    });

    it('prefers the true node over the mean node', () => {
        const subject = {
            true_north_lunar_node: body('Aqu', 315.737, 'Eighth_House', true),
            mean_north_lunar_node: body('Aqu', 314.5, 'Eighth_House', true)
        };
        const north = extractChartBodies(subject).find(b => b.id === 'north_node');
        expect(north?.sourceKey).toBe('true_north_lunar_node');
        expect(north?.absPos).toBeCloseTo(315.737, 3);
        expect(north?.retrograde).toBe(true);
    });

    it('supports legacy true_node/mean_node keys', () => {
        const subject = {
            true_node: body('Aqu', 315.737, 8),
            mean_node: body('Aqu', 314.5, 8)
        };
        expect(extractChartBodies(subject).find(b => b.id === 'north_node')?.sourceKey).toBe('true_node');
    });

    it('uses the API-provided south node when present (with its house)', () => {
        const subject = {
            true_north_lunar_node: body('Aqu', 315.737, 'Eighth_House', true),
            true_south_lunar_node: body('Leo', 135.737, 'Second_House', true)
        };
        const south = extractChartBodies(subject).find(b => b.id === 'south_node');
        expect(south?.sourceKey).toBe('true_south_lunar_node');
        expect(south?.derived).toBe(false);
        expect(south?.house).toBe(2);
    });

    it('derives the south node (+180°, opposite sign) when the API omits it', () => {
        const subject = { true_north_lunar_node: body('Leo', 125.07, 'Second_House', true) };
        const bodies = extractChartBodies(subject);
        const south = bodies.find(b => b.id === 'south_node');
        expect(south?.derived).toBe(true);
        expect(south?.absPos).toBeCloseTo(305.07, 10);
        expect(south?.signLabel).toBe('Acuario');
        expect(south?.house).toBeNull();
        // Inserted right after the north node
        expect(bodies.findIndex(b => b.id === 'south_node'))
            .toBe(bodies.findIndex(b => b.id === 'north_node') + 1);
    });

    it('skips null bodies without emitting undefined (defensive)', () => {
        const subject = {
            sun: body('Pis', 354.868, 'Ninth_House'),
            mean_lilith: null, // API key present but empty
            chiron: undefined
        };
        const bodies = extractChartBodies(subject);
        expect(bodies.map(b => b.id)).toEqual(['sun']);
    });

    it('keeps canonical order and parses word houses', () => {
        const subject = {
            moon: body('Gem', 84.13, 'Tenth_House'),
            sun: body('Pis', 354.868, 'Ninth_House'),
            mean_lilith: body('Sco', 224.669, 'Fourth_House'),
            chiron: body('Can', 100.567, 'First_House')
        };
        const bodies = extractChartBodies(subject);
        expect(bodies.map(b => b.id)).toEqual(['sun', 'moon', 'chiron', 'lilith']);
        expect(bodies.map(b => b.house)).toEqual([9, 10, 1, 4]);
    });
});

describe('buildPlanetsPromptLines', () => {
    it('builds rich Spanish lines with degrees, house and retrogradation', () => {
        const subject = {
            name: 'Santos', year: 1990, // scalars must never leak into the prompt
            sun: body('Gem', 84.0667, 'Tenth_House'), // 24°04′ Géminis
            saturn: body('Cap', 280.5, 'Fifth_House', true),
            first_house: body('Gem', 89.787, null)
        };
        const lines = buildPlanetsPromptLines(subject);
        expect(lines).toContain('Sol: 24°04′ Géminis, Casa 10');
        expect(lines).toContain('Saturno: 10°30′ Capricornio, Casa 5, Retrógrado');
        expect(lines).toContain('Ascendente: 29°47′ Géminis');
        expect(lines.join('\n')).not.toMatch(/undefined|null|year|1990/);
    });

    it('returns an empty list for a missing subject', () => {
        expect(buildPlanetsPromptLines(undefined)).toEqual([]);
        expect(buildPlanetsPromptLines(null)).toEqual([]);
    });
});
