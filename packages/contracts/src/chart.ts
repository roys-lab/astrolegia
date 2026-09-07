import { z } from 'zod';
import { NatalProfileSchema } from './natal-profile';

/**
 * ChartCalculation: carta calculada y cacheada por perfil y tipo (modelo
 * ChartCalculation de Prisma). Patrón engineVersion/inputHash: la carta está
 * vigente solo si ambos coinciden con el motor actual y con los datos de
 * nacimiento actuales del perfil.
 */

export const ChartTypeSchema = z.enum(['natal', 'numerology', 'humanDesign', 'mayanKin']);
export type ChartType = z.infer<typeof ChartTypeSchema>;

/**
 * Versión vigente de cada motor. Cambiarla invalida todas las cartas cacheadas
 * de ese tipo (status = stale-engine). Los tipos sin motor en el repo no figuran.
 */
export const ENGINE_VERSIONS: Partial<Record<ChartType, string>> = {
  natal: 'kerykeion-api-v5/pipeline-2',
  numerology: 'hitchcock-1',
};

/**
 * Estado de una carta cacheada frente a los datos actuales del perfil.
 *   missing       sin carta guardada
 *   stale-engine  calculada con una versión anterior del motor
 *   stale-data    los datos de nacimiento cambiaron desde el cálculo
 *   current       vigente
 */
export const ChartStatusSchema = z.enum(['missing', 'stale-engine', 'stale-data', 'current']);
export type ChartStatus = z.infer<typeof ChartStatusSchema>;

export const ChartCalculationSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  type: ChartTypeSchema,
  engineVersion: z.string(),
  inputHash: z.string(),
  /** Respuesta completa del motor. Para natal: { chart: <svg>, chart_data: { subject, aspects, … } }. */
  payload: z.unknown(),
  planetaryPositions: z.unknown().nullable().optional(),
  houseCusps: z.unknown().nullable().optional(),
  planetaryAspects: z.unknown().nullable().optional(),
  ascendantSign: z.string().nullable().optional(),
  calculatedAt: z.string(),
  updatedAt: z.string(),
  /** Calculado por la API contra los datos actuales del perfil. */
  status: ChartStatusSchema,
});
export type ChartCalculationDTO = z.infer<typeof ChartCalculationSchema>;

/** Resumen sin payload, para listados. */
export const ChartSummarySchema = z.object({
  type: ChartTypeSchema,
  engineVersion: z.string(),
  inputHash: z.string(),
  status: ChartStatusSchema,
  calculatedAt: z.string(),
  /** Signos en español (solo natal), derivados del payload. */
  sunSign: z.string().nullable(),
  moonSign: z.string().nullable(),
  ascendantSign: z.string().nullable(),
});
export type ChartSummaryDTO = z.infer<typeof ChartSummarySchema>;

/** Perfil con el resumen de sus cartas (GET /v1/client/people y /:id). */
export const NatalProfileWithChartsSchema = NatalProfileSchema.extend({
  charts: z.array(ChartSummarySchema),
});
export type NatalProfileWithChartsDTO = z.infer<typeof NatalProfileWithChartsSchema>;

/**
 * Guardar una carta calculada en el cliente (p. ej. numerología, que corre
 * con @astrolegia/core en el navegador). PUT /v1/client/people/:id/charts/:type
 * Si no viene inputHash, la API lo calcula con los datos actuales del perfil.
 */
export const SaveChartSchema = z.object({
  engineVersion: z.string().min(1).max(120),
  inputHash: z.string().min(1).max(64).optional(),
  payload: z.unknown(),
});
export type SaveChartDTO = z.infer<typeof SaveChartSchema>;

/** Respuesta de POST /v1/client/people/:id/charts/natal (calcula, guarda y devuelve). */
export const NatalChartResultSchema = z.object({
  chart: ChartCalculationSchema,
  /** El perfil, posiblemente enriquecido con lat/lng/timezone resueltos por geocoding. */
  profile: NatalProfileWithChartsSchema,
});
export type NatalChartResultDTO = z.infer<typeof NatalChartResultSchema>;
