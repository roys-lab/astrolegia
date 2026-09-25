import { z } from 'zod';
import { UserRoleSchema } from './user';
import { NatalProfileWithChartsSchema } from './chart';

/**
 * GET /v1/client/me — el usuario autenticado y su perfil natal propio
 * (NatalProfile con isSelf, con el resumen de sus cartas), si ya lo cargó.
 */
export const MeSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    image: z.string().nullable().optional(),
    role: UserRoleSchema,
  }),
  profile: NatalProfileWithChartsSchema.nullable(),
});
export type MeDTO = z.infer<typeof MeSchema>;
