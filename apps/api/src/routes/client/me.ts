import { Router } from 'express';
import { prisma } from '@astrolegia/database';
import { CreateNatalProfileSchema } from '@astrolegia/contracts';
import { asyncHandler, parse, sendData } from '../../http';
import { roleOf } from '../../middleware/auth';
import { profileDataFromCreate, profileDataFromUpdate, toProfileWithChartsDTO } from '../../services/natal-profiles';

/**
 * El usuario autenticado y su perfil natal propio (NatalProfile con isSelf).
 * Reemplaza a users/{uid} + profile/main de Astrolegia v1.
 */
export const meRouter = Router();

meRouter.get('/', asyncHandler(async (req, res) => {
    const user = req.user!;
    const profile = await prisma.natalProfile.findFirst({
        where: { userId: user.id, isSelf: true },
        include: { calculations: true },
    });
    sendData(req, res, {
        user: { id: user.id, email: user.email, name: user.name, image: user.image ?? null, role: roleOf(user) },
        profile: profile ? toProfileWithChartsDTO(profile) : null,
    });
}));

/** Crea o actualiza el perfil propio (a lo sumo uno por usuario). */
meRouter.put('/profile', asyncHandler(async (req, res) => {
    const user = req.user!;
    const input = parse(CreateNatalProfileSchema, req.body);
    const existing = await prisma.natalProfile.findFirst({ where: { userId: user.id, isSelf: true } });
    const profile = existing
        ? await prisma.natalProfile.update({
            where: { id: existing.id },
            data: profileDataFromUpdate(input, existing),
            include: { calculations: true },
        })
        : await prisma.natalProfile.create({
            data: { ...profileDataFromCreate(input, user.id), isSelf: true },
            include: { calculations: true },
        });
    sendData(req, res, toProfileWithChartsDTO(profile), existing ? 200 : 201);
}));
