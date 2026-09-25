import { z } from 'zod';

/**
 * Envelope estándar de la API (docs/technology/13-api-design.md).
 *   éxito: { data, meta }
 *   error: { error: { code, message, details? }, meta }
 */

export const ApiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'UPSTREAM_ERROR',
  'CONFIGURATION_ERROR',
  'INTERNAL_ERROR',
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiMetaSchema = z.object({
  requestId: z.string(),
  timestamp: z.string(),
});
export type ApiMeta = z.infer<typeof ApiMetaSchema>;

export const ApiErrorBodySchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
  meta: ApiMetaSchema,
});
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;

export interface ApiSuccess<T> {
  data: T;
  meta: ApiMeta;
}

/** Cabeceras de versionamiento que envían los clientes (doc 02). */
export const APP_HEADERS = {
  platform: 'X-App-Platform',
  version: 'X-App-Version',
  build: 'X-App-Build',
  apiVersion: 'X-Api-Version',
} as const;
