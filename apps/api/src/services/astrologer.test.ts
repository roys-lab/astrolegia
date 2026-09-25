import { describe, it, expect } from 'vitest';
import {
    parseHour,
    parseMinute,
    parseTimeComponent,
    toFiniteNumber,
    normalizeCityKey,
    resolveTimezone,
    geocodeCity
} from './astrologer';

describe('parseHour (midnight bug)', () => {
    it('falls back to 12 (noon) when hour is missing', () => {
        expect(parseHour(undefined)).toBe(12);
        expect(parseHour(null)).toBe(12);
        expect(parseHour('')).toBe(12);
    });

    it('keeps 0 (midnight) instead of coercing it to 12', () => {
        expect(parseHour(0)).toBe(0);
        expect(parseHour('0')).toBe(0);
    });

    it('parses regular hours', () => {
        expect(parseHour(7)).toBe(7);
        expect(parseHour('7')).toBe(7);
        expect(parseHour(23)).toBe(23);
    });

    it('falls back to 12 on NaN / invalid input', () => {
        expect(parseHour(NaN)).toBe(12);
        expect(parseHour('abc')).toBe(12);
    });
});

describe('parseMinute', () => {
    it('falls back to 0 when minute is missing or invalid', () => {
        expect(parseMinute(undefined)).toBe(0);
        expect(parseMinute(null)).toBe(0);
        expect(parseMinute('')).toBe(0);
        expect(parseMinute(NaN)).toBe(0);
    });

    it('keeps 0 and parses regular minutes', () => {
        expect(parseMinute(0)).toBe(0);
        expect(parseMinute('0')).toBe(0);
        expect(parseMinute(45)).toBe(45);
        expect(parseMinute('45')).toBe(45);
    });
});

describe('parseTimeComponent / toFiniteNumber', () => {
    it('respects an arbitrary fallback only for missing values', () => {
        expect(parseTimeComponent(undefined, 5)).toBe(5);
        expect(parseTimeComponent(0, 5)).toBe(0);
    });

    it('toFiniteNumber keeps 0 and rejects junk', () => {
        expect(toFiniteNumber(0)).toBe(0);
        expect(toFiniteNumber('0')).toBe(0);
        expect(toFiniteNumber('-58.3816')).toBeCloseTo(-58.3816);
        expect(toFiniteNumber(undefined)).toBeUndefined();
        expect(toFiniteNumber(null)).toBeUndefined();
        expect(toFiniteNumber('')).toBeUndefined();
        expect(toFiniteNumber('abc')).toBeUndefined();
    });
});

describe('normalizeCityKey', () => {
    it('keeps only the part before the first comma, lowercased', () => {
        expect(normalizeCityKey('Buenos Aires, Argentina')).toBe('buenos aires');
        expect(normalizeCityKey('New York, NY, USA')).toBe('new york');
    });

    it('strips accents', () => {
        expect(normalizeCityKey('Córdoba')).toBe('cordoba');
        expect(normalizeCityKey('São Paulo, Brasil')).toBe('sao paulo');
        expect(normalizeCityKey('Bogotá')).toBe('bogota');
    });

    it('trims whitespace', () => {
        expect(normalizeCityKey('  Buenos Aires ,Argentina')).toBe('buenos aires');
    });
});

describe('resolveTimezone (real tz by coordinates)', () => {
    it('resolves Buenos Aires', () => {
        expect(resolveTimezone(-34.6037, -58.3816)).toBe('America/Argentina/Buenos_Aires');
    });

    it('resolves Sevilla to Europe/Madrid', () => {
        expect(resolveTimezone(37.39, -5.99)).toBe('Europe/Madrid');
    });

    it('resolves Denver to America/Denver', () => {
        expect(resolveTimezone(39.74, -104.99)).toBe('America/Denver');
    });

    it('resolves lat 0 / lng 0 without falling into any default', () => {
        const tz = resolveTimezone(0, 0);
        expect(typeof tz).toBe('string');
        expect(tz.length).toBeGreaterThan(0);
        expect(tz).not.toBe('America/Argentina/Buenos_Aires');
    });
});

describe('geocodeCity with normalized known-city keys (no network)', () => {
    it("matches 'Buenos Aires, Argentina' against the 'buenos aires' entry", async () => {
        const result = await geocodeCity('Buenos Aires, Argentina');
        expect(result).not.toBeNull();
        expect(result!.latitude).toBeCloseTo(-34.6037);
        expect(result!.longitude).toBeCloseTo(-58.3816);
        expect(result!.timezone).toBe('America/Argentina/Buenos_Aires');
    });

    it("matches accented 'Córdoba' against the 'cordoba' entry", async () => {
        const result = await geocodeCity('Córdoba');
        expect(result).not.toBeNull();
        expect(result!.latitude).toBeCloseTo(-31.42);
        expect(result!.timezone).toBe('America/Argentina/Cordoba');
    });
});
