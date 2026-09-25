import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app';

/**
 * Smoke tests de la API sin base de datos: envelope, guards de sesión/rol,
 * 404, JSON inválido y el montaje de Better Auth. Nada de acá toca PostgreSQL.
 */
describe('API: envelope y guards', () => {
    const app = createApp();

    it('GET /v1/capabilities devuelve el envelope { data, meta }', async () => {
        const res = await request(app).get('/v1/capabilities');
        expect(res.status).toBe(200);
        expect(res.body.data.apiVersion).toBe('1.0.0');
        expect(res.body.data.features.natalProfiles).toBe(true);
        expect(res.body.meta.requestId).toMatch(/^req_/);
        expect(res.headers['x-request-id']).toBe(res.body.meta.requestId);
    });

    it('respeta un X-Request-Id entrante bien formado', async () => {
        const res = await request(app).get('/v1/capabilities').set('X-Request-Id', 'proxy-abc-123');
        expect(res.body.meta.requestId).toBe('proxy-abc-123');
    });

    it('GET /v1/client/people sin sesión responde 401 UNAUTHENTICATED', async () => {
        const res = await request(app).get('/v1/client/people');
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHENTICATED');
        expect(res.body.meta.requestId).toBeTruthy();
    });

    it('GET /v1/admin/users sin sesión responde 401', async () => {
        const res = await request(app).get('/v1/admin/users');
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('ruta inexistente responde 404 NOT_FOUND con envelope', async () => {
        const res = await request(app).get('/v1/no-existe');
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('JSON inválido responde 400 VALIDATION_ERROR', async () => {
        const res = await request(app)
            .post('/v1/client/people')
            .set('Content-Type', 'application/json')
            .send('{"name": ');
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('Better Auth está montado en /v1/auth/*', async () => {
        const res = await request(app).get('/v1/auth/ok');
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });

    it('sin sesión, /v1/auth/get-session devuelve null', async () => {
        const res = await request(app).get('/v1/auth/get-session');
        expect(res.status).toBe(200);
        expect(res.body).toBeNull();
    });

    it('CORS: un origen no listado no recibe Access-Control-Allow-Origin', async () => {
        const res = await request(app).get('/v1/capabilities').set('Origin', 'https://evil.example');
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
});
