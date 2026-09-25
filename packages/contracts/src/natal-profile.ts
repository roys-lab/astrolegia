import { z } from 'zod';

/**
 * NatalProfile: una persona con datos de nacimiento (modelo NatalProfile de
 * Prisma). Los nombres de campo son los de la base; las fechas viajan como
 * strings: birthDate = "YYYY-MM-DD" (sin zona), birthTime = "HH:MM" local.
 */

export const NatalProfileSourceSchema = z.enum(['manual', 'imported']);
export type NatalProfileSource = z.infer<typeof NatalProfileSourceSchema>;

export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Formato esperado: YYYY-MM-DD');

export const BirthTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato esperado: HH:MM (24 h)');

export const LatitudeSchema = z.number().min(-90).max(90);
export const LongitudeSchema = z.number().min(-180).max(180);

/** Perfil natal tal como lo devuelve la API. */
export const NatalProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  birthDate: IsoDateSchema,
  birthTime: BirthTimeSchema.nullable(),
  birthTimeKnown: z.boolean(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  latitude: LatitudeSchema.nullable(),
  longitude: LongitudeSchema.nullable(),
  timezone: z.string().nullable(),
  tags: z.array(z.string()),
  notes: z.string().nullable(),
  isSelf: z.boolean(),
  source: NatalProfileSourceSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type NatalProfileDTO = z.infer<typeof NatalProfileSchema>;

const birthTimeConsistency = (
  value: { birthTime?: string | null; birthTimeKnown?: boolean },
  ctx: z.RefinementCtx,
) => {
  if (value.birthTimeKnown === true && !value.birthTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['birthTime'],
      message: 'Si la hora es conocida, birthTime es obligatorio',
    });
  }
};

/** Alta de un perfil natal (POST /v1/client/people, PUT /v1/client/me/profile). */
export const CreateNatalProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'El nombre necesita al menos 2 caracteres').max(120),
    birthDate: IsoDateSchema,
    birthTime: BirthTimeSchema.nullable().optional(),
    birthTimeKnown: z.boolean().optional(),
    city: z.string().trim().max(200).nullable().optional(),
    country: z.string().trim().max(100).nullable().optional(),
    latitude: LatitudeSchema.nullable().optional(),
    longitude: LongitudeSchema.nullable().optional(),
    timezone: z.string().trim().max(64).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(50).optional(),
    notes: z.string().max(4000).nullable().optional(),
  })
  .superRefine(birthTimeConsistency);
export type CreateNatalProfileDTO = z.infer<typeof CreateNatalProfileSchema>;

/** Edición parcial (PATCH /v1/client/people/:id). */
export const UpdateNatalProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    birthDate: IsoDateSchema.optional(),
    birthTime: BirthTimeSchema.nullable().optional(),
    birthTimeKnown: z.boolean().optional(),
    city: z.string().trim().max(200).nullable().optional(),
    country: z.string().trim().max(100).nullable().optional(),
    latitude: LatitudeSchema.nullable().optional(),
    longitude: LongitudeSchema.nullable().optional(),
    timezone: z.string().trim().max(64).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(50).optional(),
    notes: z.string().max(4000).nullable().optional(),
  })
  .superRefine(birthTimeConsistency);
export type UpdateNatalProfileDTO = z.infer<typeof UpdateNatalProfileSchema>;
