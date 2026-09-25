/**
 * Prueba de humo de la API contra una base PostgreSQL real (local o staging).
 *
 *   pnpm --filter @astrolegia/api smoke
 *
 * Requiere apps/api/.env con DATABASE_URL y que el seed haya corrido (usa el
 * super admin santos.dlc@gmail.com). No necesita Google ni RapidAPI: crea una
 * sesión directamente en la tabla Session y la manda como Bearer token
 * (plugin bearer de Better Auth). Al terminar borra lo que creó.
 *
 * Recorre: /v1/client/me, alta/edición/borrado de personas, cartas guardadas
 * por el cliente (numerología) y su estado (current / stale-data), el perfil
 * propio, /v1/admin/users con rol, y los errores esperados (422 sin ciudad,
 * 500 CONFIGURATION_ERROR sin RapidAPI, 404, 401).
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { prisma } from '@astrolegia/database';
import { createApp } from '../src/app';

const EMAIL = process.env.SMOKE_USER_EMAIL ?? 'santos.dlc@gmail.com';

function check(cond: unknown, msg: string, extra?: unknown) {
    if (!cond) {
        console.error('✗', msg, extra !== undefined ? JSON.stringify(extra, null, 2) : '');
        process.exitCode = 1;
        throw new Error(msg);
    }
    console.log('✓', msg);
}

async function main() {
    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    if (!user) throw new Error(`No existe el usuario ${EMAIL}: corré pnpm db:seed`);

    const token = randomBytes(32).toString('base64url');
    const session = await prisma.session.create({
        data: { userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000), userAgent: 'smoke' },
    });
    const app = createApp();
    const auth = { Authorization: `Bearer ${token}` };
    const createdIds: string[] = [];

    try {
        // --- sesión
        const noAuth = await request(app).get('/v1/client/me');
        check(noAuth.status === 401, 'sin token: 401');

        const me = await request(app).get('/v1/client/me').set(auth);
        check(me.status === 200 && me.body.data.user.email === EMAIL, 'GET /v1/client/me con Bearer', me.body);
        check(me.body.data.user.role === user.role, `rol en sesión = ${user.role}`);

        // --- personas
        const bad = await request(app).post('/v1/client/people').set(auth).send({ name: 'A', birthDate: '1980-13-01' });
        check(bad.status === 400 && bad.body.error.code === 'VALIDATION_ERROR', 'POST inválido: 400 VALIDATION_ERROR', bad.body);

        const created = await request(app).post('/v1/client/people').set(auth).send({
            name: 'Ana Prueba',
            birthDate: '1980-05-02',
            birthTime: '08:15',
            birthTimeKnown: true,
            city: 'Buenos Aires, Argentina',
            country: 'AR',
            latitude: -34.6037,
            longitude: -58.3816,
            timezone: 'America/Argentina/Buenos_Aires',
        });
        check(created.status === 201, 'POST /v1/client/people: 201', created.body);
        const person = created.body.data;
        createdIds.push(person.id);
        check(person.birthDate === '1980-05-02' && person.birthTime === '08:15' && person.charts.length === 0, 'DTO con birthDate ISO, hora y sin cartas');

        const list = await request(app).get('/v1/client/people').set(auth);
        check(list.status === 200 && list.body.data.some((p: { id: string }) => p.id === person.id), 'GET /v1/client/people lista la persona');

        // --- carta calculada en el cliente (numerología) + estados
        const saved = await request(app).put(`/v1/client/people/${person.id}/charts/numerology`).set(auth).send({
            engineVersion: 'hitchcock-1',
            payload: { expression: 7, lifePath: 3 },
        });
        check(saved.status === 200 && saved.body.data.status === 'current', 'PUT charts/numerology: current', saved.body);

        const natalViaPut = await request(app).put(`/v1/client/people/${person.id}/charts/natal`).set(auth).send({ engineVersion: 'x', payload: {} });
        check(natalViaPut.status === 409, 'PUT charts/natal: 409 (se calcula en el servidor)');

        const unknownTime = await request(app).patch(`/v1/client/people/${person.id}`).set(auth).send({ birthTimeKnown: false });
        check(unknownTime.status === 200 && unknownTime.body.data.birthTime === null, 'PATCH birthTimeKnown=false descarta la hora');
        const staleChart = unknownTime.body.data.charts.find((c: { type: string }) => c.type === 'numerology');
        check(staleChart?.status === 'stale-data', 'la carta pasa a stale-data al cambiar los datos', unknownTime.body.data.charts);

        const chart = await request(app).get(`/v1/client/people/${person.id}/charts/numerology`).set(auth);
        check(chart.status === 200 && chart.body.data.payload.expression === 7 && chart.body.data.status === 'stale-data', 'GET charts/numerology devuelve payload y status');

        const missing = await request(app).get(`/v1/client/people/${person.id}/charts/natal`).set(auth);
        check(missing.status === 404, 'GET charts/natal sin carta: 404');

        // --- carta natal: sin RapidAPI configurado responde CONFIGURATION_ERROR (o 422 sin ciudad)
        const natal = await request(app).post(`/v1/client/people/${person.id}/charts/natal`).set(auth);
        const hasProvider = !!(process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_HOST);
        if (hasProvider) {
            check(natal.status === 200 && natal.body.data.chart.status === 'current', 'POST charts/natal calcula con RapidAPI', natal.body);
        } else {
            check(natal.status === 500 && natal.body.error.code === 'CONFIGURATION_ERROR', 'POST charts/natal sin RapidAPI: CONFIGURATION_ERROR', natal.body);
        }

        // --- perfil propio
        const selfProfile = await request(app).put('/v1/client/me/profile').set(auth).send({
            name: user.name,
            birthDate: '1990-01-15',
            birthTime: null,
            birthTimeKnown: false,
            city: 'Rosario, Argentina',
            country: 'AR',
        });
        check(selfProfile.status === 201 || selfProfile.status === 200, 'PUT /v1/client/me/profile', selfProfile.body);
        createdIds.push(selfProfile.body.data.id);
        const me2 = await request(app).get('/v1/client/me').set(auth);
        check(me2.body.data.profile?.isSelf === true && me2.body.data.profile.birthDate === '1990-01-15', 'GET /v1/client/me trae el perfil propio');
        const noSelfDelete = await request(app).delete(`/v1/client/people/${selfProfile.body.data.id}`).set(auth);
        check(noSelfDelete.status === 409, 'DELETE del perfil propio: 409');

        // --- aislamiento: un id inexistente/ajeno es 404
        const other = await request(app).get('/v1/client/people/00000000-0000-4000-8000-000000000000').set(auth);
        check(other.status === 404, 'persona inexistente: 404');

        // --- admin
        const admin = await request(app).get('/v1/admin/users').set(auth);
        if (user.role === 'super_admin' || user.role === 'editor' || user.role === 'viewer') {
            check(admin.status === 200 && Array.isArray(admin.body.data), 'GET /v1/admin/users con rol administrativo: 200');
        } else {
            check(admin.status === 403, 'GET /v1/admin/users sin rol: 403');
        }

        // --- borrado
        const del = await request(app).delete(`/v1/client/people/${person.id}`).set(auth);
        check(del.status === 200 && del.body.data.deleted === true, 'DELETE /v1/client/people/:id');
        createdIds.splice(createdIds.indexOf(person.id), 1);

        console.log('\nSmoke OK');
    } finally {
        // Limpieza: lo que quedó creado y la sesión de prueba
        if (createdIds.length) await prisma.natalProfile.deleteMany({ where: { id: { in: createdIds } } });
        await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
        await prisma.$disconnect();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
