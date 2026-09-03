import { z } from 'zod';

// Roles disponibles en Astrolegia
export const UserRoleSchema = z.enum(['user', 'viewer', 'editor', 'super_admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// DTO para asignar rol a un usuario por email
export const AssignRoleSchema = z.object({
  email: z.string().email({ message: 'El correo electrónico no es válido' }),
  role: UserRoleSchema,
});
export type AssignRoleDTO = z.infer<typeof AssignRoleSchema>;

// DTO del usuario persistido (debe coincidir exactamente con el schema de Prisma)
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
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

// DTO de perfil natal astrológico
export const NatalProfileSchema = z.object({
  name: z.string().min(2),
  birthDate: z.string(),
  birthTime: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  city: z.string(),
  country: z.string(),
});
export type NatalProfileDTO = z.infer<typeof NatalProfileSchema>;
