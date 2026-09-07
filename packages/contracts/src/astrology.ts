import { z } from 'zod';
import { LatitudeSchema, LongitudeSchema } from './natal-profile';

/** GET /v1/client/geocoding?q=<ciudad> — autocompletar lugar de nacimiento. */
export const GeocodingQuerySchema = z.object({
  q: z.string().trim().min(3, 'Escribí al menos 3 letras').max(120),
});
export type GeocodingQueryDTO = z.infer<typeof GeocodingQuerySchema>;

export const GeocodingResultSchema = z.object({
  displayName: z.string(),
  city: z.string(),
  /** Código ISO de dos letras (AR, ES, …), mismo campo `country` que NatalProfile. */
  country: z.string().nullable(),
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
  /** Zona IANA derivada de las coordenadas. */
  timezone: z.string(),
});
export type GeocodingResultDTO = z.infer<typeof GeocodingResultSchema>;

export const GeocodingResponseSchema = z.object({
  results: z.array(GeocodingResultSchema),
});
export type GeocodingResponseDTO = z.infer<typeof GeocodingResponseSchema>;

/** POST /v1/client/astrology/interpret — lectura de la carta con IA (+ RAG si hay base). */
export const InterpretRequestSchema = z.object({
  planets: z.string().min(1).max(20000),
  aspects: z.string().max(20000).optional().default(''),
  userName: z.string().trim().max(120).optional(),
});
export type InterpretRequestDTO = z.infer<typeof InterpretRequestSchema>;

export const InterpretResponseSchema = z.object({
  interpretation: z.string(),
  modelUsed: z.string(),
});
export type InterpretResponseDTO = z.infer<typeof InterpretResponseSchema>;
