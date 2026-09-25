import { z } from 'zod';

// Roles disponibles en Astrolegia (enum UserRole de Prisma)
export const UserRoleSchema = z.enum(['user', 'viewer', 'editor', 'super_admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

/** Roles con acceso a /v1/admin/*. */
export const ADMIN_ROLES: readonly UserRole[] = ['viewer', 'editor', 'super_admin'];

// DTO para asignar rol a un usuario por email
export const AssignRoleSchema = z.object({
  email: z.string().email({ message: 'El correo electrónico no es válido' }),
  role: UserRoleSchema,
});
export type AssignRoleDTO = z.infer<typeof AssignRoleSchema>;

// DTO del usuario persistido (mismos campos que el modelo User de Prisma;
// nunca se exponen tokens ni sesiones)
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  emailVerified: z.boolean().optional(),
  image: z.string().nullable().optional(),
  role: UserRoleSchema,
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});
export type UserDTO = z.infer<typeof UserSchema>;

// DTO de capacidades de la API
export const CapabilitiesSchema = z.object({
  apiVersion: z.string(),
  minSupportedBuild: z.number(),
  latestBuild: z.number(),
  features: z.record(z.boolean()),
});
export type CapabilitiesDTO = z.infer<typeof CapabilitiesSchema>;
