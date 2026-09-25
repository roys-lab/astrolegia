import { Router } from 'express';
import { prisma, type Prisma } from '@astrolegia/database';
import {
    ChartTypeSchema,
    CreateNatalProfileSchema,
    SaveChartSchema,
    UpdateNatalProfileSchema,
} from '@astrolegia/contracts';
import { z } from 'zod';
import { asyncHandler, HttpError, parse, sendData } from '../../http';
import { computeLimiter } from '../../middleware/rate-limit';
import {
    profileDataFromCreate,
    profileDataFromUpdate,
    profileInputHash,
    toChartDTO,
    toProfileWithChartsDTO,
} from '../../services/natal-profiles';
import { computeNatalChart } from '../../services/natal-chart';

/**
 * Personas (NatalProfile) del usuario autenticado y sus cartas cacheadas.
 * Equivale a users/{uid}/people/{id} y .../charts/{type} de Astrolegia v1.
 */
export const peopleRouter = Router();

const IdSchema = z.string().uuid('El id no es válido');

/** Perfil del usuario o 404. Nunca devuelve perfiles de otro usuario. */
async function ownProfile(userId: string, id: string) {
    const profile = await prisma.natalProfile.findFirst({
        where: { id: parse(IdSchema, id), userId },
        include: { calculations: true },
    });
    if (!profile) throw new HttpError(404, 'NOT_FOUND', 'Persona no encontrada');
    return profile;
}

// Listado ordenado por nombre, con resumen de cartas
peopleRouter.get('/', asyncHandler(async (req, res) => {
    const profiles = await prisma.natalProfile.findMany({
        where: { userId: req.user!.id },
        orderBy: { name: 'asc' },
        include: { calculations: true },
    });
    sendData(req, res, profiles.map(toProfileWithChartsDTO));
}));

peopleRouter.post('/', asyncHandler(async (req, res) => {
    const input = parse(CreateNatalProfileSchema, req.body);
    const created = await prisma.natalProfile.create({
        data: profileDataFromCreate(input, req.user!.id),
        include: { calculations: true },
    });
    sendData(req, res, toProfileWithChartsDTO(created), 201);
}));

peopleRouter.get('/:id', asyncHandler(async (req, res) => {
    const profile = await ownProfile(req.user!.id, String(req.params.id));
    sendData(req, res, toProfileWithChartsDTO(profile));
}));

peopleRouter.patch('/:id', asyncHandler(async (req, res) => {
    const current = await ownProfile(req.user!.id, String(req.params.id));
    const input = parse(UpdateNatalProfileSchema, req.body);
    const updated = await prisma.natalProfile.update({
        where: { id: current.id },
        data: profileDataFromUpdate(input, current),
        include: { calculations: true },
    });
    sendData(req, res, toProfileWithChartsDTO(updated));
}));

peopleRouter.delete('/:id', asyncHandler(async (req, res) => {
    const current = await ownProfile(req.user!.id, String(req.params.id));
    if (current.isSelf) {
        throw new HttpError(409, 'CONFLICT', 'El perfil propio no se borra desde acá; editalo en /v1/client/me/profile');
    }
    await prisma.natalProfile.delete({ where: { id: current.id } });
    sendData(req, res, { id: current.id, deleted: true });
}));

// ---------------------------------------------------------------- cartas

peopleRouter.get('/:id/charts/:type', asyncHandler(async (req, res) => {
    const profile = await ownProfile(req.user!.id, String(req.params.id));
    const type = parse(ChartTypeSchema, String(req.params.type));
    const chart = profile.calculations.find((c) => c.type === type);
    if (!chart) throw new HttpError(404, 'NOT_FOUND', `Esta persona no tiene carta ${type} calculada`);
    sendData(req, res, toChartDTO(chart, profile));
}));

/**
 * Guardar una carta calculada en el cliente (numerología corre con
 * @astrolegia/core en el navegador). La natal NO se guarda por acá: se calcula
 * en la API con POST /:id/charts/natal.
 */
peopleRouter.put('/:id/charts/:type', asyncHandler(async (req, res) => {
    const profile = await ownProfile(req.user!.id, String(req.params.id));
    const type = parse(ChartTypeSchema, String(req.params.type));
    if (type === 'natal') {
        throw new HttpError(409, 'CONFLICT', 'La carta natal se calcula en el servidor: usá POST /v1/client/people/:id/charts/natal');
    }
    const input = parse(SaveChartSchema, req.body);
    const inputHash = input.inputHash ?? profileInputHash(profile, type);
    const chart = await prisma.chartCalculation.upsert({
        where: { profileId_type: { profileId: profile.id, type } },
        create: { profileId: profile.id, type, engineVersion: input.engineVersion, inputHash, payload: input.payload as Prisma.InputJsonValue },
        update: { engineVersion: input.engineVersion, inputHash, payload: input.payload as Prisma.InputJsonValue, calculatedAt: new Date() },
    });
    sendData(req, res, toChartDTO(chart, profile));
}));

/** Calcula la carta natal con el proveedor de efemérides, la cachea y la devuelve. */
peopleRouter.post('/:id/charts/natal', computeLimiter, asyncHandler(async (req, res) => {
    const profile = await ownProfile(req.user!.id, String(req.params.id));
    const { chart, profile: updated } = await computeNatalChart(profile);
    const refreshed = await prisma.natalProfile.findUniqueOrThrow({
        where: { id: updated.id },
        include: { calculations: true },
    });
    sendData(req, res, { chart: toChartDTO(chart, refreshed), profile: toProfileWithChartsDTO(refreshed) });
}));

peopleRouter.delete('/:id/charts/:type', asyncHandler(async (req, res) => {
    const profile = await ownProfile(req.user!.id, String(req.params.id));
    const type = parse(ChartTypeSchema, String(req.params.type));
    await prisma.chartCalculation.deleteMany({ where: { profileId: profile.id, type } });
    sendData(req, res, { profileId: profile.id, type, deleted: true });
}));
