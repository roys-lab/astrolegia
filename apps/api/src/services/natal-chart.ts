import { prisma, Prisma, type ChartCalculation, type NatalProfile } from '@astrolegia/database';
import { ENGINE_VERSIONS } from '@astrolegia/contracts';
import { env } from '../env';
import { HttpError } from '../http';
import { GeocodingError, getBirthChart, type BirthChartParams } from './astrologer';
import { deriveNatalFields, parseBirthTime, profileInputHash, ymd } from './natal-profiles';

/**
 * Calcula la carta natal de un perfil con el proveedor de efemérides
 * (Astrologer API v5 en RapidAPI, Placidus / Tropical), la cachea en
 * ChartCalculation y devuelve carta + perfil. Portado de
 * generateAndSaveNatalChart + /api/astrology/chart de Astrolegia v1:
 *  - hora desconocida => 12:00 y la hora NO entra en el hash
 *  - si el perfil no tenía coordenadas y el proveedor las resolvió,
 *    se guardan en el perfil (lat/lng/timezone reales)
 */
export async function computeNatalChart(profile: NatalProfile): Promise<{ chart: ChartCalculation; profile: NatalProfile }> {
    if (!env.RAPIDAPI_KEY || !env.RAPIDAPI_HOST) {
        throw new HttpError(500, 'CONFIGURATION_ERROR', 'El cálculo de cartas natales no está configurado (faltan RAPIDAPI_KEY / RAPIDAPI_HOST)');
    }

    const city = profile.city?.trim() ?? '';
    const hasCoords = Number.isFinite(profile.latitude) && Number.isFinite(profile.longitude);
    if (!city && !hasCoords) {
        throw new HttpError(422, 'VALIDATION_ERROR', 'Esta persona no tiene ciudad ni coordenadas de nacimiento. Editá sus datos primero.');
    }

    const time = profile.birthTimeKnown ? parseBirthTime(profile.birthTime) : undefined;
    const { year, month, day } = ymd(profile.birthDate);
    const params: BirthChartParams = {
        name: profile.name,
        year,
        month,
        day,
        hour: time?.hour ?? 12,
        minute: time?.minute ?? 0,
        city: city || 'Desconocida',
        nation: profile.country ?? undefined,
        ...(hasCoords
            ? {
                latitude: profile.latitude as number,
                longitude: profile.longitude as number,
                ...(profile.timezone ? { timezone: profile.timezone } : {}),
            }
            : {}),
        theme: 'dark',
        language: 'ES',
    };

    let result: Awaited<ReturnType<typeof getBirthChart>>;
    try {
        result = await getBirthChart(params);
    } catch (err) {
        // Ciudad irresoluble -> 422 con mensaje claro (nunca coordenadas por defecto)
        if (err instanceof GeocodingError) throw new HttpError(422, 'VALIDATION_ERROR', err.message);
        throw new HttpError(502, 'UPSTREAM_ERROR', 'Error al comunicarse con el proveedor de efemérides', err instanceof Error ? err.message : String(err));
    }

    // Enriquecer el perfil con las coordenadas realmente usadas
    let current = profile;
    const dbg = result._debug as { latitude?: unknown; longitude?: unknown; timezone?: unknown } | undefined;
    if (!hasCoords && dbg && Number.isFinite(dbg.latitude) && Number.isFinite(dbg.longitude)) {
        current = await prisma.natalProfile.update({
            where: { id: profile.id },
            data: {
                latitude: dbg.latitude as number,
                longitude: dbg.longitude as number,
                ...(typeof dbg.timezone === 'string' && dbg.timezone ? { timezone: dbg.timezone } : {}),
            },
        });
    }

    const derived = deriveNatalFields(result);
    const engineVersion = ENGINE_VERSIONS.natal as string;
    const inputHash = profileInputHash(current, 'natal');
    const payload = result as unknown as Prisma.InputJsonValue;
    const json = (v: unknown) => (v === null || v === undefined ? Prisma.JsonNull : (v as Prisma.InputJsonValue));
    const fields = {
        engineVersion,
        inputHash,
        payload,
        planetaryPositions: json(derived.planetaryPositions),
        houseCusps: json(derived.houseCusps),
        planetaryAspects: json(derived.planetaryAspects),
        ascendantSign: derived.ascendantSign,
    };

    const chart = await prisma.chartCalculation.upsert({
        where: { profileId_type: { profileId: current.id, type: 'natal' } },
        create: { profileId: current.id, type: 'natal', ...fields },
        update: { ...fields, calculatedAt: new Date() },
    });

    return { chart, profile: current };
}
