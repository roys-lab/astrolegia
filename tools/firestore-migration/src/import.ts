/**
 * Import del JSON generado por export.ts a PostgreSQL (Prisma). Ver README.md.
 *
 *   DATABASE_URL=... IMPORT_EMAIL=<email del User> IMPORT_FILE=exports/<uid>.json pnpm import
 *
 * Idempotente: dedupe por nombre normalizado + fecha (como v1). Nunca borra nada.
 */
import 'dotenv/config';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { prisma, Prisma, type ChartType } from '@astrolegia/database';
import { birthDateKeyOf, normalizeFullName } from '@astrolegia/core/people';
import { extractChartBodies, extractHouseCusps, translateSign } from '@astrolegia/core/astrology';
import type { FirestoreExport } from './export';

// ------------------------------------------------------------ helpers

const CHART_TYPES: ChartType[] = ['natal', 'numerology', 'humanDesign', 'mayanKin'];
const pad2 = (n: number) => String(n).padStart(2, '0');
const isoDate = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;
const dbDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const json = (v: unknown) => (v === null || v === undefined ? Prisma.JsonNull : (v as Prisma.InputJsonValue));

function deriveNatal(payload: unknown) {
    const chartData = (payload as { chart_data?: { subject?: unknown; aspects?: unknown } } | null)?.chart_data;
    const subject = chartData?.subject;
    const subjectObj = (subject && typeof subject === 'object' ? subject : null) as { first_house?: { sign?: unknown } } | null;
    return {
        planetaryPositions: subject ? extractChartBodies(subject) : null,
        houseCusps: subject ? extractHouseCusps(subject) : null,
        planetaryAspects: chartData?.aspects ?? null,
        ascendantSign: translateSign(subjectObj?.first_house?.sign),
    };
}

interface ProfileInput {
    name: string;
    birthDate: string;
    birthTime: string | null;
    birthTimeKnown: boolean;
    city: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
    timezone: string | null;
    tags: string[];
    notes: string | null;
    isSelf: boolean;
    legacyRefs: Prisma.InputJsonValue;
}

interface ChartInput {
    type: ChartType;
    engineVersion: string;
    inputHash: string;
    payload: unknown;
    calculatedAt: Date;
}

/** Person de v1 (users/{uid}/people/{id}) → NatalProfile */
function personToProfile(uid: string, personId: string, p: Record<string, any>): ProfileInput | null {
    const bd = p.birthDate;
    if (!p.fullName || !bd?.year || !bd?.month || !bd?.day) return null;
    const known = !!p.birthTimeKnown && p.birthTime && Number.isInteger(p.birthTime.hour);
    return {
        name: String(p.fullName).trim(),
        birthDate: isoDate(bd.year, bd.month, bd.day),
        birthTime: known ? `${pad2(p.birthTime.hour)}:${pad2(p.birthTime.minute ?? 0)}` : null,
        birthTimeKnown: !!known,
        city: p.birthPlace?.city ?? null,
        country: p.birthPlace?.country ?? null,
        latitude: Number.isFinite(p.birthPlace?.latitude) ? p.birthPlace.latitude : null,
        longitude: Number.isFinite(p.birthPlace?.longitude) ? p.birthPlace.longitude : null,
        timezone: p.birthPlace?.timezone ?? null,
        tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
        notes: p.notes ?? null,
        isSelf: false,
        legacyRefs: { firestore: { uid, personId, source: p.source ?? null, legacyRefs: p.legacyRefs ?? null, linkedAccountUid: p.linkedAccountUid ?? null } },
    };
}

/** Perfil propio de v1 (birthData del usuario) → NatalProfile con isSelf */
function selfProfile(uid: string, root: Record<string, any> | null, main: Record<string, any> | null, fallbackName: string): ProfileInput | null {
    const src = root?.birthData ? root : main?.birthData ? main : null;
    if (!src) return null;
    const b = src.birthData;
    if (!b?.year || !b?.month || !b?.day) return null;
    const known = Number.isInteger(b.hour) && Number.isInteger(b.minute);
    return {
        name: String(src.displayName || root?.displayName || fallbackName).trim(),
        birthDate: isoDate(b.year, b.month, b.day),
        birthTime: known ? `${pad2(b.hour)}:${pad2(b.minute)}` : null,
        birthTimeKnown: known,
        city: b.city ?? null,
        country: b.nation ?? null,
        latitude: Number.isFinite(b.lat) ? b.lat : null,
        longitude: Number.isFinite(b.lng) ? b.lng : null,
        timezone: b.timezone ?? null,
        tags: [],
        notes: null,
        isSelf: true,
        legacyRefs: { firestore: { uid, doc: root?.birthData ? `users/${uid}` : `users/${uid}/profile/main` } },
    };
}

function personChart(type: string, c: Record<string, any>): ChartInput | null {
    if (!CHART_TYPES.includes(type as ChartType)) return null;
    if (!c.engineVersion || !c.inputHash || c.payload === undefined) return null;
    return {
        type: type as ChartType,
        engineVersion: String(c.engineVersion),
        inputHash: String(c.inputHash),
        payload: c.payload,
        calculatedAt: c.computedAt ? new Date(c.computedAt) : new Date(),
    };
}

/** users/{uid}/charts/natal de v1 (chartData + chartMeta) → carta natal del perfil propio */
function selfNatalChart(doc: Record<string, any> | null): ChartInput | null {
    if (!doc?.chartData || !doc.chartMeta?.engineVersion || !doc.chartMeta?.inputHash) return null;
    return {
        type: 'natal',
        engineVersion: String(doc.chartMeta.engineVersion),
        inputHash: String(doc.chartMeta.inputHash),
        payload: doc.chartData,
        calculatedAt: doc.chartMeta.computedAt ? new Date(doc.chartMeta.computedAt) : new Date(),
    };
}

// --------------------------------------------------------------- import

async function upsertChart(profileId: string, chart: ChartInput) {
    const derived = chart.type === 'natal' ? deriveNatal(chart.payload) : null;
    const fields = {
        engineVersion: chart.engineVersion,
        inputHash: chart.inputHash,
        payload: json(chart.payload),
        planetaryPositions: json(derived?.planetaryPositions),
        houseCusps: json(derived?.houseCusps),
        planetaryAspects: json(derived?.planetaryAspects),
        ascendantSign: derived?.ascendantSign ?? null,
        calculatedAt: chart.calculatedAt,
    };
    await prisma.chartCalculation.upsert({
        where: { profileId_type: { profileId, type: chart.type } },
        create: { profileId, type: chart.type, ...fields },
        update: fields,
    });
}

async function importUserData(data: FirestoreExport, targetEmail?: string) {
    const email = targetEmail || data.email || (data.root?.email as string) || (data.profileMain?.email as string) || null;
    if (!email) {
        throw new Error(`No se pudo determinar el email para el export de UID ${data.uid}. Pasa IMPORT_EMAIL=...`);
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        const name = (data.displayName || data.root?.displayName || data.profileMain?.displayName || 'Usuario Migrado') as string;
        console.log(`Usuario ${email} no existía en PostgreSQL. Creándolo con rol 'user'...`);
        user = await prisma.user.create({
            data: {
                email,
                name,
                role: 'user',
            },
        });
    }

    const existing = await prisma.natalProfile.findMany({ where: { userId: user.id } });
    const seen = new Map(existing.map((p) => [`${normalizeFullName(p.name)}|${p.birthDate.toISOString().slice(0, 10)}`, p.id]));
    const dedupeKey = (p: ProfileInput) => `${normalizeFullName(p.name)}|${p.birthDate}`;

    let created = 0;
    let skipped = 0;
    let charts = 0;

    const importProfile = async (input: ProfileInput, chartInputs: ChartInput[]) => {
        let profileId = seen.get(dedupeKey(input));
        if (input.isSelf) {
            const self = existing.find((p) => p.isSelf);
            if (self) profileId = self.id;
        }
        if (profileId) {
            skipped++;
        } else {
            const { birthDate, ...rest } = input;
            const row = await prisma.natalProfile.create({
                data: { ...rest, birthDate: dbDate(birthDate), userId: user.id, source: 'imported' },
            });
            profileId = row.id;
            seen.set(dedupeKey(input), row.id);
            created++;
        }
        for (const chart of chartInputs) {
            await upsertChart(profileId, chart);
            charts++;
        }
    };

    // Perfil propio + su carta natal
    const self = selfProfile(data.uid, data.root, data.profileMain, user.name);
    if (self) {
        const chart = selfNatalChart(data.natalChart);
        await importProfile(self, chart ? [chart] : []);
    }

    // Personas + cartas
    for (const person of data.people) {
        const input = personToProfile(data.uid, person.id, person.data);
        if (!input) {
            console.warn(`  Persona ${person.id} omitida: sin nombre o fecha válida`);
            skipped++;
            continue;
        }
        const chartInputs = person.charts
            .map((c) => personChart(c.type, c.data))
            .filter((c): c is ChartInput => !!c);
        await importProfile(input, chartInputs);
    }

    console.log(`✓ Import terminado para ${email} (UID: ${data.uid}): ${created} perfiles creados, ${skipped} omitidos (ya existían), ${charts} cartas guardadas.`);
}

async function main() {
    const singleFile = process.env.IMPORT_FILE;
    const singleEmail = process.env.IMPORT_EMAIL;

    if (singleFile) {
        const resolved = path.resolve(process.cwd(), singleFile);
        console.log(`Importando archivo único: ${resolved}...`);
        const data = JSON.parse(readFileSync(resolved, 'utf8')) as FirestoreExport;
        await importUserData(data, singleEmail);
    } else {
        const exportsDir = path.resolve(process.cwd(), 'exports');
        if (!existsSync(exportsDir)) {
            throw new Error(
                `No se encontró el directorio de exportaciones ${exportsDir}.\n` +
                `Ejecuta primero: pnpm --filter @astrolegia/firestore-migration export\n` +
                `o define IMPORT_FILE=ruta/al/archivo.json`
            );
        }

        const files = readdirSync(exportsDir).filter((f) => f.endsWith('.json') && f !== 'all_users.json');
        if (files.length === 0) {
            console.warn(`No hay archivos JSON en ${exportsDir}.`);
            return;
        }

        console.log(`Procesando ${files.length} archivo(s) de exportación desde ${exportsDir}...`);
        for (const f of files) {
            const filePath = path.join(exportsDir, f);
            try {
                const data = JSON.parse(readFileSync(filePath, 'utf8')) as FirestoreExport;
                await importUserData(data, singleEmail);
            } catch (err) {
                console.error(`Error procesando ${filePath}:`, err instanceof Error ? err.message : String(err));
            }
        }
    }

    await prisma.$disconnect();
}

main().catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
});
