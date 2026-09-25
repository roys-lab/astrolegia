/**
 * Helpers de presentación para personas y cartas natales (lado cliente).
 * El estado de vigencia de una carta (missing / stale-engine / stale-data /
 * current) lo calcula la API y viaja en `chart.status` y en `charts[].status`.
 */

import type { ChartCalculationDTO, ChartStatus, NatalProfileDTO, NatalProfileWithChartsDTO } from '@astrolegia/contracts';
import { extractChartBodies, translateSign } from '@astrolegia/core/astrology';

/** Mensaje legible de un error atrapado (catch de tipo unknown). */
export function errorMessage(err: unknown, fallback: string): string {
    return err instanceof Error && err.message ? err.message : fallback;
}

/** '1991-03-14' -> '14/03/1991' */
export function formatPersonBirthDate(p: Pick<NatalProfileDTO, 'birthDate'>): string {
    const [year, month, day] = p.birthDate.split('-');
    return `${day}/${month}/${year}`;
}

/** '14:30' o null si la hora es desconocida. */
export function formatPersonBirthTime(p: Pick<NatalProfileDTO, 'birthTime' | 'birthTimeKnown'>): string | null {
    return p.birthTimeKnown && p.birthTime ? p.birthTime : null;
}

/** Primer tramo de la ciudad ('Buenos Aires, Argentina' -> 'Buenos Aires') o null. */
export function cityLabel(p: Pick<NatalProfileDTO, 'city'>): string | null {
    return p.city ? p.city.split(',')[0] : null;
}

/** Resumen de la carta natal de un perfil, si la tiene. */
export function natalSummary(p: NatalProfileWithChartsDTO) {
    return p.charts.find((c) => c.type === 'natal') ?? null;
}

export function natalStatus(p: NatalProfileWithChartsDTO): ChartStatus {
    return natalSummary(p)?.status ?? 'missing';
}

export interface NatalPayload {
    chart?: string;
    chart_data?: { subject?: unknown; aspects?: unknown };
}

export function natalPayload(chart: ChartCalculationDTO | null | undefined): NatalPayload | null {
    const payload = chart?.payload;
    return payload && typeof payload === 'object' ? (payload as NatalPayload) : null;
}

/** Signo solar en español desde una carta cacheada ('Géminis') o null. */
export function sunSignFromChart(chart: ChartCalculationDTO | null | undefined): string | null {
    const subject = natalPayload(chart)?.chart_data?.subject;
    if (!subject) return null;
    return extractChartBodies(subject).find((b) => b.id === 'sun')?.signLabel ?? null;
}

/** Signo ascendente en español desde una carta cacheada, o null. */
export function risingSignFromChart(chart: ChartCalculationDTO | null | undefined): string | null {
    const subject = natalPayload(chart)?.chart_data?.subject as { first_house?: { sign?: unknown } } | undefined;
    return translateSign(subject?.first_house?.sign);
}
