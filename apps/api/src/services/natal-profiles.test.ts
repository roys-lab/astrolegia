import { describe, it, expect } from 'vitest';
import { computePersonInputHash } from '@astrolegia/core/people';
import {
    chartStatus,
    dbToIsoDate,
    isoDateToDb,
    parseBirthTime,
    profileDataFromCreate,
    profileDataFromUpdate,
    profileInputHash,
    toProfileDTO,
} from './natal-profiles';

const base = {
    id: 'p1',
    userId: 'u1',
    name: 'María José García',
    birthDate: isoDateToDb('1991-03-14'),
    birthTime: '14:30',
    birthTimeKnown: true,
    city: 'Buenos Aires',
    country: 'AR',
    latitude: -34.6037,
    longitude: -58.3816,
    timezone: 'America/Argentina/Buenos_Aires',
    tags: [] as string[],
    notes: null,
    isSelf: false,
    source: 'manual' as const,
    legacyRefs: null,
    createdAt: new Date('2026-09-07T10:00:00.000Z'),
    updatedAt: new Date('2026-09-07T10:00:00.000Z'),
};

describe('fechas', () => {
    it('la fecha de nacimiento no se corre por zona horaria (ida y vuelta)', () => {
        expect(dbToIsoDate(isoDateToDb('1991-03-14'))).toBe('1991-03-14');
        expect(dbToIsoDate(isoDateToDb('2000-01-01'))).toBe('2000-01-01');
        expect(dbToIsoDate(isoDateToDb('1999-12-31'))).toBe('1999-12-31');
    });

    it('parseBirthTime acepta HH:MM y rechaza el resto', () => {
        expect(parseBirthTime('14:30')).toEqual({ hour: 14, minute: 30 });
        expect(parseBirthTime('00:05')).toEqual({ hour: 0, minute: 5 });
        expect(parseBirthTime(null)).toBeUndefined();
        expect(parseBirthTime('')).toBeUndefined();
        expect(parseBirthTime('9:5')).toBeUndefined();
    });
});

describe('profileInputHash', () => {
    it('da el mismo hash que computePersonInputHash de v1 con los mismos datos', () => {
        const expected = computePersonInputHash({
            birthDate: { year: 1991, month: 3, day: 14 },
            birthTime: { hour: 14, minute: 30 },
            birthPlace: { city: 'Buenos Aires', latitude: -34.6037, longitude: -58.3816, timezone: 'America/Argentina/Buenos_Aires' },
        });
        expect(profileInputHash(base, 'natal')).toBe(expected);
    });

    it('ignora la hora cuando birthTimeKnown es false, aunque haya un valor guardado', () => {
        const withoutTime = computePersonInputHash({
            birthDate: { year: 1991, month: 3, day: 14 },
            birthPlace: { city: 'x', latitude: -34.6037, longitude: -58.3816, timezone: 'America/Argentina/Buenos_Aires' },
        });
        expect(profileInputHash({ ...base, birthTimeKnown: false }, 'natal')).toBe(withoutTime);
        expect(profileInputHash({ ...base, birthTimeKnown: false }, 'natal')).not.toBe(profileInputHash(base, 'natal'));
    });

    it('numerología usa el mismo hash que natal (como en v1: fecha + hora + lugar)', () => {
        expect(profileInputHash(base, 'numerology')).toBe(profileInputHash(base, 'natal'));
        const dateOnly = computePersonInputHash({ birthDate: { year: 1991, month: 3, day: 14 } });
        expect(profileInputHash({ ...base, latitude: null, longitude: null, timezone: null, birthTime: null, birthTimeKnown: false }, 'numerology')).toBe(dateOnly);
    });
});

describe('chartStatus', () => {
    const natalHash = profileInputHash(base, 'natal');

    it('missing sin carta', () => {
        expect(chartStatus(null, base, 'natal')).toBe('missing');
    });

    it('current cuando motor y hash coinciden', () => {
        expect(chartStatus({ engineVersion: 'kerykeion-api-v5/pipeline-2', inputHash: natalHash }, base, 'natal')).toBe('current');
    });

    it('stale-engine si la carta es de un motor anterior', () => {
        expect(chartStatus({ engineVersion: 'kerykeion-api-v5/pipeline-1', inputHash: natalHash }, base, 'natal')).toBe('stale-engine');
    });

    it('stale-data si cambiaron los datos de nacimiento', () => {
        const moved = { ...base, latitude: -31.42, longitude: -64.19 };
        expect(chartStatus({ engineVersion: 'kerykeion-api-v5/pipeline-2', inputHash: natalHash }, moved, 'natal')).toBe('stale-data');
    });

    it('un tipo sin motor registrado no se marca stale-engine', () => {
        const hash = profileInputHash(base, 'humanDesign');
        expect(chartStatus({ engineVersion: 'lo-que-sea', inputHash: hash }, base, 'humanDesign')).toBe('current');
    });
});

describe('DTO y entradas', () => {
    it('toProfileDTO serializa fechas como strings y oculta la hora no conocida', () => {
        const dto = toProfileDTO({ ...base, birthTimeKnown: false });
        expect(dto.birthDate).toBe('1991-03-14');
        expect(dto.birthTime).toBeNull();
        expect(dto.createdAt).toBe('2026-09-07T10:00:00.000Z');
        expect(toProfileDTO(base).birthTime).toBe('14:30');
    });

    it('profileDataFromCreate infiere birthTimeKnown de la hora y normaliza nulos', () => {
        const data = profileDataFromCreate({ name: 'Ana', birthDate: '1980-05-02', birthTime: '08:15' }, 'u1');
        expect(data).toMatchObject({ userId: 'u1', name: 'Ana', birthTime: '08:15', birthTimeKnown: true, city: null, tags: [] });
        expect(dbToIsoDate(data.birthDate as Date)).toBe('1980-05-02');

        const unknown = profileDataFromCreate({ name: 'Ana', birthDate: '1980-05-02', birthTime: '08:15', birthTimeKnown: false }, 'u1');
        expect(unknown.birthTime).toBeNull();
        expect(unknown.birthTimeKnown).toBe(false);
    });

    it('profileDataFromUpdate descarta la hora al marcarla desconocida y la conserva si no se toca', () => {
        expect(profileDataFromUpdate({ birthTimeKnown: false }, base)).toMatchObject({ birthTimeKnown: false, birthTime: null });
        expect(profileDataFromUpdate({ city: 'Rosario' }, base)).toMatchObject({ city: 'Rosario', birthTimeKnown: true, birthTime: '14:30' });
        expect(profileDataFromUpdate({ birthTime: '09:00' }, { ...base, birthTimeKnown: false, birthTime: null })).toMatchObject({ birthTimeKnown: true, birthTime: '09:00' });
    });
});
