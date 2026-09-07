import { describe, it, expect } from 'vitest';
import { Body } from 'astronomy-engine';
import { getPlanetaryPositions, isBodyRetrograde, getZodiacSign } from './astrology';

/**
 * Regression anchors verified against JPL Horizons (apparent, ecliptic-of-date,
 * geocentric) during the August 2026 audit. If any of these drift, the engine
 * or its reference frame changed — investigate before trusting any chart.
 */

function positionOf(body: string, date: Date): number {
    const pos = getPlanetaryPositions(date).find(p => p.body === body);
    if (!pos) throw new Error(`Body ${body} not found`);
    return pos.longitude;
}

describe('ephemeris regression anchors (JPL Horizons)', () => {
    const J2000 = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));
    const CASE_B = new Date(Date.UTC(1990, 5, 15, 12, 0, 0));

    it('Sun 2000-01-01 00:00 UT = 279.859°', () => {
        expect(positionOf('Sun', J2000)).toBeCloseTo(279.859, 2);
    });

    it('Mars 2000-01-01 00:00 UT = 327.576°', () => {
        expect(positionOf('Mars', J2000)).toBeCloseTo(327.576, 2);
    });

    it('Saturn 1990-06-15 12:00 UT = 294.032°', () => {
        expect(positionOf('Saturn', CASE_B)).toBeCloseTo(294.032, 2);
    });

    it('Sun 1990-06-15 12:00 UT = 84.130°', () => {
        expect(positionOf('Sun', CASE_B)).toBeCloseTo(84.130, 2);
    });

    it('Saturn was retrograde on 1990-06-15', () => {
        expect(isBodyRetrograde(Body.Saturn, CASE_B)).toBe(true);
    });

    it('Mercury was direct on 2000-01-01', () => {
        expect(isBodyRetrograde(Body.Mercury, J2000)).toBe(false);
    });
});

describe('zodiac sign from ecliptic longitude', () => {
    it('maps longitudes to signs at boundaries', () => {
        expect(getZodiacSign(0).sign).toBe('Aries');
        expect(getZodiacSign(29.99).sign).toBe('Aries');
        expect(getZodiacSign(30).sign).toBe('Taurus');
        expect(getZodiacSign(279.859).sign).toBe('Capricorn');
        expect(getZodiacSign(359.99).sign).toBe('Pisces');
        expect(getZodiacSign(360).sign).toBe('Aries');
        expect(getZodiacSign(-1).sign).toBe('Pisces');
    });
});
