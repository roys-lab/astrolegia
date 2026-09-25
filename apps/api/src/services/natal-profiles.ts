import type { ChartCalculation, NatalProfile, Prisma } from '@astrolegia/database';
import { computePersonInputHash } from '@astrolegia/core/people';
import { extractChartBodies, extractHouseCusps, translateSign } from '@astrolegia/core/astrology';
import {
    ENGINE_VERSIONS,
    type ChartCalculationDTO,
    type ChartStatus,
    type ChartSummaryDTO,
    type ChartType,
    type CreateNatalProfileDTO,
    type NatalProfileDTO,
    type NatalProfileWithChartsDTO,
    type UpdateNatalProfileDTO,
} from '@astrolegia/contracts';

/**
 * Mapeo entre los modelos de Prisma (NatalProfile, ChartCalculation) y los
 * DTOs de @astrolegia/contracts, más el patrón engineVersion/inputHash.
 *
 * El hash se calcula con computePersonInputHash de @astrolegia/core, la misma
 * función que usaba Astrolegia v1 sobre Firestore: una carta migrada con los
 * mismos datos de nacimiento sigue dando status "current".
 */

// ------------------------------------------------------------ fechas

/** "1991-03-14" -> Date a medianoche UTC (columna date de PostgreSQL). */
export function isoDateToDb(iso: string): Date {
    return new Date(`${iso}T00:00:00.000Z`);
}

/** Date de la columna date -> "1991-03-14". */
export function dbToIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export function ymd(date: Date): { year: number; month: number; day: number } {
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/** "14:30" -> { hour: 14, minute: 30 }; null/inválido -> undefined. */
export function parseBirthTime(value: string | null | undefined): { hour: number; minute: number } | undefined {
    if (!value) return undefined;
    const m = /^(\d{2}):(\d{2})$/.exec(value);
    if (!m) return undefined;
    return { hour: Number(m[1]), minute: Number(m[2]) };
}

// ------------------------------------------------------------- hash

export type HashSource = Pick<NatalProfile, 'birthDate' | 'birthTime' | 'birthTimeKnown' | 'latitude' | 'longitude' | 'timezone'>;

/**
 * Hash de los datos de nacimiento: fecha + hora (solo si es conocida) +
 * lat/lng/timezone. Es el mismo para todos los tipos de carta, igual que en
 * v1 (numerología también hasheaba el lugar y la hora).
 */
export function profileInputHash(p: HashSource, _type: ChartType = 'natal'): string {
    const birthDate = ymd(p.birthDate);
    return computePersonInputHash({
        birthDate,
        birthTime: p.birthTimeKnown ? parseBirthTime(p.birthTime) : undefined,
        birthPlace: {
            city: '',
            latitude: p.latitude ?? undefined,
            longitude: p.longitude ?? undefined,
            timezone: p.timezone ?? undefined,
        },
    });
}

export function chartStatus(
    chart: Pick<ChartCalculation, 'engineVersion' | 'inputHash'> | null | undefined,
    p: HashSource,
    type: ChartType,
): ChartStatus {
    if (!chart) return 'missing';
    const expectedEngine = ENGINE_VERSIONS[type];
    if (expectedEngine && chart.engineVersion !== expectedEngine) return 'stale-engine';
    if (chart.inputHash !== profileInputHash(p, type)) return 'stale-data';
    return 'current';
}

// -------------------------------------------------------- derivados natal

interface NatalPayloadShape {
    chart_data?: { subject?: unknown; aspects?: unknown };
}

/** Campos de consulta derivados de la respuesta del proveedor (solo natal). */
export function deriveNatalFields(payload: unknown) {
    const chartData = (payload as NatalPayloadShape | null)?.chart_data;
    const subject = chartData?.subject;
    const subjectObj = (subject && typeof subject === 'object' ? subject : null) as { first_house?: { sign?: unknown } } | null;
    return {
        planetaryPositions: subject ? extractChartBodies(subject) : [],
        houseCusps: subject ? extractHouseCusps(subject) : null,
        planetaryAspects: chartData?.aspects ?? null,
        ascendantSign: translateSign(subjectObj?.first_house?.sign),
    };
}

/** Signo (en español) de un cuerpo de la carta natal cacheada, o null. */
export function bodySignOf(chart: Pick<ChartCalculation, 'payload'>, bodyId: 'sun' | 'moon'): string | null {
    const subject = (chart.payload as NatalPayloadShape | null)?.chart_data?.subject;
    if (!subject) return null;
    const body = extractChartBodies(subject).find((b) => b.id === bodyId);
    return body?.signLabel ?? null;
}

// --------------------------------------------------------------- DTOs

export function toProfileDTO(p: NatalProfile): NatalProfileDTO {
    return {
        id: p.id,
        userId: p.userId,
        name: p.name,
        birthDate: dbToIsoDate(p.birthDate),
        birthTime: p.birthTimeKnown ? p.birthTime : null,
        birthTimeKnown: p.birthTimeKnown,
        city: p.city,
        country: p.country,
        latitude: p.latitude,
        longitude: p.longitude,
        timezone: p.timezone,
        tags: p.tags,
        notes: p.notes,
        isSelf: p.isSelf,
        source: p.source,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
    };
}

export function toChartSummary(c: ChartCalculation, p: HashSource): ChartSummaryDTO {
    return {
        type: c.type,
        engineVersion: c.engineVersion,
        inputHash: c.inputHash,
        status: chartStatus(c, p, c.type),
        calculatedAt: c.calculatedAt.toISOString(),
        sunSign: c.type === 'natal' ? bodySignOf(c, 'sun') : null,
        moonSign: c.type === 'natal' ? bodySignOf(c, 'moon') : null,
        ascendantSign: c.ascendantSign ?? null,
    };
}

export function toChartDTO(c: ChartCalculation, p: HashSource): ChartCalculationDTO {
    return {
        id: c.id,
        profileId: c.profileId,
        type: c.type,
        engineVersion: c.engineVersion,
        inputHash: c.inputHash,
        payload: c.payload,
        planetaryPositions: c.planetaryPositions ?? null,
        houseCusps: c.houseCusps ?? null,
        planetaryAspects: c.planetaryAspects ?? null,
        ascendantSign: c.ascendantSign ?? null,
        calculatedAt: c.calculatedAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        status: chartStatus(c, p, c.type),
    };
}

export function toProfileWithChartsDTO(p: NatalProfile & { calculations: ChartCalculation[] }): NatalProfileWithChartsDTO {
    return {
        ...toProfileDTO(p),
        charts: p.calculations.map((c) => toChartSummary(c, p)),
    };
}

// ------------------------------------------------------- entrada -> Prisma

export function profileDataFromCreate(input: CreateNatalProfileDTO, userId: string): Prisma.NatalProfileUncheckedCreateInput {
    const birthTimeKnown = input.birthTimeKnown ?? !!input.birthTime;
    return {
        userId,
        name: input.name,
        birthDate: isoDateToDb(input.birthDate),
        birthTime: birthTimeKnown ? (input.birthTime ?? null) : null,
        birthTimeKnown,
        city: input.city ?? null,
        country: input.country ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        timezone: input.timezone ?? null,
        tags: input.tags ?? [],
        notes: input.notes ?? null,
    };
}

/**
 * Edición parcial. Regla de la hora: si birthTimeKnown queda en false, la hora
 * se descarta (así el hash y el cálculo la ignoran de forma consistente).
 */
export function profileDataFromUpdate(input: UpdateNatalProfileDTO, current: NatalProfile): Prisma.NatalProfileUncheckedUpdateInput {
    const data: Prisma.NatalProfileUncheckedUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.birthDate !== undefined) data.birthDate = isoDateToDb(input.birthDate);

    const birthTime = input.birthTime !== undefined ? input.birthTime : current.birthTime;
    const birthTimeKnown = input.birthTimeKnown ?? (input.birthTime !== undefined ? !!input.birthTime : current.birthTimeKnown);
    data.birthTimeKnown = birthTimeKnown;
    data.birthTime = birthTimeKnown ? (birthTime ?? null) : null;

    if (input.city !== undefined) data.city = input.city;
    if (input.country !== undefined) data.country = input.country;
    if (input.latitude !== undefined) data.latitude = input.latitude;
    if (input.longitude !== undefined) data.longitude = input.longitude;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.tags !== undefined) data.tags = input.tags;
    if (input.notes !== undefined) data.notes = input.notes;
    return data;
}
