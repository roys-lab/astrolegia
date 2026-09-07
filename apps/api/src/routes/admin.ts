import { Router } from 'express';
import { prisma, type UserRole } from '@astrolegia/database';
import { AssignRoleSchema } from '@astrolegia/contracts';
import { asyncHandler, parse, sendData } from '../http';
import { requireAdmin, requireSuperAdmin } from '../middleware/auth';

/**
 * Microsistema de administración (RBAC, doc 03). Se monta bajo /v1/admin y
 * exige un rol administrativo verificado en PostgreSQL; asignar roles es
 * exclusivo de super_admin. Toda mutación queda en AdminAudit.
 */
export const adminRouter = Router();

adminRouter.use(requireAdmin);

const userSelect = {
    id: true,
    email: true,
    name: true,
    image: true,
    emailVerified: true,
    role: true,
    createdAt: true,
    updatedAt: true,
} as const;

// Listar usuarios con sus roles
adminRouter.get('/users', asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: userSelect,
    });
    sendData(req, res, users);
}));

// Asignar rol a usuario por email (crea el usuario si no existe todavía; al
// entrar con Google se vincula por email)
adminRouter.post('/users/assign-role', requireSuperAdmin, asyncHandler(async (req, res) => {
    const { email, role } = parse(AssignRoleSchema, req.body);
    const actor = req.user!;

    const user = await prisma.user.upsert({
        where: { email },
        update: { role: role as UserRole },
        create: {
            email,
            role: role as UserRole,
            name: email.split('@')[0],
        },
        select: userSelect,
    });

    await prisma.adminAudit.create({
        data: {
            actorId: actor.id,
            action: 'user.role.assign',
            entityType: 'User',
            entityId: user.id,
            payload: { email, assignedRole: role },
            ipAddress: req.ip ?? null,
        },
    });

    sendData(req, res, user);
}));
