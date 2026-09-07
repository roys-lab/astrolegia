import { describe, it, expect } from 'vitest';
import {
    normalizeFullName,
    birthDateKeyOf,
    personDedupeKey,
    isSamePerson,
    computePersonInputHash,
    isChartCurrent,
    partnerToPerson,
    individualToPerson,
    friendProfileToPerson,
    parseIsoBirthDate,
    stripUndefined,
    djb2Hash,
} from './people-core';
import type { Partner, Individual } from '../types/legacy';

/**
 * Tests de las funciones PURAS del modelo canónico de personas (people-core).
 * No tocan Firestore: importan people-core directamente para no inicializar
 * el SDK de Firebase en el entorno de test.
 */

describe('normalizeFullName', () => {
    it('pliega mayúsculas, acentos y espacios extra', () => {
        expect(normalizeFullName('  María  José   García ')).toBe('maria jose garcia');
        expect(normalizeFullName('JUAN PÉREZ')).toBe('juan perez');
    });

    it('dos escrituras distintas del mismo nombre normalizan igual', () => {
        expect(normalizeFullName('María José')).toBe(normalizeFullName('maria  jose'));
        expect(normalizeFullName('Peña')).toBe(normalizeFullName('Pena')); // ñ -> n a propósito
    });
});

describe('dedupe de personas (personDedupeKey / isSamePerson)', () => {
    const birthDate = { year: 1990, month: 5, day: 10 };

    it('mismo nombre normalizado + misma fecha => duplicado', () => {
        const a = { fullName: 'María José García', birthDate };
        const b = { fullName: '  maria jose  garcia', birthDate: { year: 1990, month: 5, day: 10 } };
        expect(isSamePerson(a, b)).toBe(true);
        expect(personDedupeKey(a.fullName, a.birthDate))
            .toBe(personDedupeKey(b.fullName, b.birthDate));
    });

    it('mismo nombre pero distinta fecha => NO duplicado', () => {
        const a = { fullName: 'María José García', birthDate };
        const b = { fullName: 'María José García', birthDate: { year: 1990, month: 5, day: 11 } };
        expect(isSamePerson(a, b)).toBe(false);
    });

    it('distinto nombre con misma fecha => NO duplicado', () => {
        const a = { fullName: 'Juan Pérez', birthDate };
        const b = { fullName: 'Pedro Pérez', birthDate };
        expect(isSamePerson(a, b)).toBe(false);
    });

    it('la clave de fecha es estable y con padding (5 => 05)', () => {
        expect(birthDateKeyOf({ year: 1990, month: 5, day: 3 })).toBe('1990-05-03');
    });
});

describe('partnerToPerson', () => {
    const basePartner: Partner = {
        name: 'Carlos Gómez',
        role: 'CTO',
        birthDay: 15,
        birthMonth: 8,
        birthYear: 1985,
    };

    it('sin birthHour => birthTimeKnown false y sin birthTime', () => {
        const p = partnerToPerson('proj1', 'part1', basePartner);
        expect(p.birthTimeKnown).toBe(false);
        expect(p.birthTime).toBeUndefined();
        expect(p.birthDate).toEqual({ year: 1985, month: 8, day: 15 });
        expect(p.source).toBe('partner');
        expect(p.legacyRefs?.partnerIds).toEqual([{ projectId: 'proj1', partnerId: 'part1' }]);
    });

    it('con birthHour 0 (medianoche) => birthTimeKnown true (el 0 no es falsy-descartable)', () => {
        const p = partnerToPerson('proj1', 'part1', {
            ...basePartner,
            birthHour: 0,
            birthMinute: 30,
        });
        expect(p.birthTimeKnown).toBe(true);
        expect(p.birthTime).toEqual({ hour: 0, minute: 30 });
    });

    it('con birthHour pero sin birthMinute => minuto 0', () => {
        const p = partnerToPerson('proj1', 'part1', { ...basePartner, birthHour: 14 });
        expect(p.birthTime).toEqual({ hour: 14, minute: 0 });
    });

    it('con birthCity => birthPlace parcial (solo ciudad, sin coords ni timezone)', () => {
        const p = partnerToPerson('proj1', 'part1', { ...basePartner, birthCity: 'Rosario' });
        expect(p.birthPlace).toEqual({ city: 'Rosario' });
        expect(p.birthPlace?.latitude).toBeUndefined();
        expect(p.birthPlace?.longitude).toBeUndefined();
        expect(p.birthPlace?.timezone).toBeUndefined();
    });

    it('sin birthCity => sin birthPlace', () => {
        const p = partnerToPerson('proj1', 'part1', basePartner);
        expect(p.birthPlace).toBeUndefined();
    });
});

describe('individualToPerson', () => {
    const baseIndividual: Individual = {
        uid: 'owner1',
        fullName: 'Ana Torres',
        birthDate: '1992-11-03T09:45:00-03:00',
        birthLocation: { city: 'Buenos Aires', lat: -34.6, lng: -58.4 },
    };

    it('ISO con hora => birthTime literal (sin conversión de zona) y timeKnown true', () => {
        const p = individualToPerson('ind1', baseIndividual);
        expect(p).not.toBeNull();
        expect(p!.birthDate).toEqual({ year: 1992, month: 11, day: 3 });
        expect(p!.birthTimeKnown).toBe(true);
        expect(p!.birthTime).toEqual({ hour: 9, minute: 45 });
        expect(p!.source).toBe('individual');
        expect(p!.legacyRefs?.individualId).toBe('ind1');
    });

    it('ISO solo-fecha => birthTimeKnown false', () => {
        const p = individualToPerson('ind1', { ...baseIndividual, birthDate: '1992-11-03' });
        expect(p!.birthTimeKnown).toBe(false);
        expect(p!.birthTime).toBeUndefined();
    });

    it('birthLocation => birthPlace con coordenadas', () => {
        const p = individualToPerson('ind1', baseIndividual);
        expect(p!.birthPlace).toEqual({
            city: 'Buenos Aires',
            latitude: -34.6,
            longitude: -58.4,
        });
    });

    it('birthDate no parseable => null (la migración lo cuenta como skipped)', () => {
        expect(individualToPerson('ind1', { ...baseIndividual, birthDate: 'no-es-fecha' })).toBeNull();
        expect(individualToPerson('ind1', { ...baseIndividual, birthDate: '' })).toBeNull();
    });
});

describe('parseIsoBirthDate', () => {
    it('toma los componentes literales, ignorando el offset de zona', () => {
        // 23:30-03:00 en UTC sería el día siguiente; acá debe quedar el valor local escrito.
        const parsed = parseIsoBirthDate('1990-12-31T23:30:00-03:00');
        expect(parsed!.birthDate).toEqual({ year: 1990, month: 12, day: 31 });
        expect(parsed!.birthTime).toEqual({ hour: 23, minute: 30 });
    });
});

describe('friendProfileToPerson', () => {
    const birthData = {
        day: 20, month: 3, year: 1988,
        hour: 6, minute: 15,
        city: 'Córdoba', nation: 'Argentina',
        lat: -31.4, lng: -64.2,
        timezone: 'America/Argentina/Cordoba',
    };

    it('perfil completo => Person con linkedAccountUid y birthPlace completo', () => {
        const p = friendProfileToPerson('uidAmigo', { displayName: 'Lucía Fernández', birthData });
        expect(p).not.toBeNull();
        expect(p!.source).toBe('friend');
        expect(p!.linkedAccountUid).toBe('uidAmigo');
        expect(p!.legacyRefs?.friendUid).toBe('uidAmigo');
        expect(p!.birthTimeKnown).toBe(true);
        expect(p!.birthPlace).toEqual({
            city: 'Córdoba',
            country: 'Argentina',
            latitude: -31.4,
            longitude: -64.2,
            timezone: 'America/Argentina/Cordoba',
        });
    });

    it('sin birthData => null (se saltea en la migración)', () => {
        expect(friendProfileToPerson('uidAmigo', { displayName: 'Lucía' })).toBeNull();
    });
});

describe('computePersonInputHash (patrón engineVersion/inputHash de Fase 1)', () => {
    const base = {
        birthDate: { year: 1990, month: 5, day: 10 },
        birthTime: { hour: 14, minute: 30 },
        birthPlace: {
            city: 'Buenos Aires',
            latitude: -34.6,
            longitude: -58.4,
            timezone: 'America/Argentina/Buenos_Aires',
        },
    };

    it('es estable: mismo input => mismo hash', () => {
        expect(computePersonInputHash(base)).toBe(computePersonInputHash({ ...base }));
    });

    it('cambia si cambia la fecha', () => {
        const other = { ...base, birthDate: { year: 1990, month: 5, day: 11 } };
        expect(computePersonInputHash(other)).not.toBe(computePersonInputHash(base));
    });

    it('cambia si cambia la hora', () => {
        const other = { ...base, birthTime: { hour: 14, minute: 31 } };
        expect(computePersonInputHash(other)).not.toBe(computePersonInputHash(base));
    });

    it('cambia si cambia la latitud', () => {
        const other = { ...base, birthPlace: { ...base.birthPlace, latitude: -34.7 } };
        expect(computePersonInputHash(other)).not.toBe(computePersonInputHash(base));
    });

    it('cambia entre hora conocida y desconocida', () => {
        const { birthTime, ...sinHora } = base;
        expect(computePersonInputHash(sinHora)).not.toBe(computePersonInputHash(base));
    });

    it('usa el mismo djb2 de la Fase 1 (hex sin signo)', () => {
        // Referencia: djb2('') = 5381 = 0x1505
        expect(djb2Hash('')).toBe('1505');
        expect(djb2Hash('a')).toBe(((5381 * 33 + 97) >>> 0).toString(16));
    });
});

describe('isChartCurrent', () => {
    const chart = { engineVersion: 'v2', inputHash: 'abc123' };

    it('vigente solo si coinciden engineVersion e inputHash', () => {
        expect(isChartCurrent(chart, 'v2', 'abc123')).toBe(true);
        expect(isChartCurrent(chart, 'v3', 'abc123')).toBe(false);
        expect(isChartCurrent(chart, 'v2', 'zzz')).toBe(false);
        expect(isChartCurrent(null, 'v2', 'abc123')).toBe(false);
    });
});

describe('stripUndefined', () => {
    it('elimina claves undefined recursivamente sin tocar null ni arrays', () => {
        const input = {
            a: 1,
            b: undefined,
            c: null,
            d: { e: undefined, f: 'x' },
            g: [{ h: undefined, i: 2 }],
        };
        expect(stripUndefined(input)).toEqual({
            a: 1,
            c: null,
            d: { f: 'x' },
            g: [{ i: 2 }],
        });
    });
});
