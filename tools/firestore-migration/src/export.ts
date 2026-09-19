/**
 * Export de Astrolegia v1 (Firestore) a JSON, para importar después con
 * import.ts. Ver README.md.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=.../serviceAccount.json FIRESTORE_UID=<uid> pnpm export
 */
import 'dotenv/config';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, type DocumentData, type Firestore } from 'firebase-admin/firestore';

export interface ExportedChart {
    type: string;
    data: DocumentData;
}

export interface ExportedPerson {
    id: string;
    data: DocumentData;
    charts: ExportedChart[];
}

export interface FirestoreExport {
    exportedAt: string;
    uid: string;
    email?: string | null;
    displayName?: string | null;
    /** users/{uid} (perfil liviano canónico) */
    root: DocumentData | null;
    /** users/{uid}/profile/main (espejo legacy) */
    profileMain: DocumentData | null;
    /** users/{uid}/charts/natal (carta propia: chartData, aiAnalysis, chartMeta) */
    natalChart: DocumentData | null;
    people: ExportedPerson[];
}

async function readDoc(db: Firestore, docPath: string): Promise<DocumentData | null> {
    const snap = await db.doc(docPath).get();
    return snap.exists ? (snap.data() ?? null) : null;
}

async function exportUser(db: Firestore, uid: string): Promise<FirestoreExport> {
    const peopleSnap = await db.collection(`users/${uid}/people`).get();
    const people: ExportedPerson[] = [];
    for (const doc of peopleSnap.docs) {
        const chartsSnap = await db.collection(`users/${uid}/people/${doc.id}/charts`).get();
        people.push({
            id: doc.id,
            data: doc.data(),
            charts: chartsSnap.docs.map((c) => ({ type: c.id, data: c.data() })),
        });
    }
    const root = await readDoc(db, `users/${uid}`);
    const profileMain = await readDoc(db, `users/${uid}/profile/main`);
    const email = (root?.email || profileMain?.email || null) as string | null;
    const displayName = (root?.displayName || profileMain?.displayName || null) as string | null;

    return {
        exportedAt: new Date().toISOString(),
        uid,
        email,
        displayName,
        root,
        profileMain,
        natalChart: await readDoc(db, `users/${uid}/charts/natal`),
        people,
    };
}

function resolveServiceAccountPath(): string | null {
    const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (fromEnv && existsSync(fromEnv)) return fromEnv;

    const candidates = [
        path.resolve(process.cwd(), 'serviceAccount.json'),
        path.resolve(process.cwd(), 'tools', 'firestore-migration', 'serviceAccount.json'),
        path.resolve(process.cwd(), '..', 'serviceAccount.json'),
    ];
    for (const c of candidates) {
        if (existsSync(c)) return c;
    }
    return null;
}

async function main() {
    const saPath = resolveServiceAccountPath();
    if (!saPath) {
        throw new Error(
            'No se encontró la Service Account de Firebase.\n' +
            'Por favor coloca el archivo JSON descargado de Firebase Console en:\n' +
            '  tools/firestore-migration/serviceAccount.json\n' +
            'o define la variable de entorno GOOGLE_APPLICATION_CREDENTIALS.'
        );
    }

    initializeApp({ credential: cert(saPath) });
    const db = getFirestore();

    const outDir = path.join(process.cwd(), 'exports');
    mkdirSync(outDir, { recursive: true });

    const targetUid = process.env.FIRESTORE_UID;

    if (targetUid) {
        console.log(`Exportando usuario específico UID: ${targetUid}...`);
        const data = await exportUser(db, targetUid);
        const outFile = path.join(outDir, `${targetUid}.json`);
        writeFileSync(outFile, JSON.stringify(data, null, 2));
        console.log(`✓ Exportadas ${data.people.length} personas (${data.people.reduce((n, p) => n + p.charts.length, 0)} cartas) → ${outFile}`);
    } else {
        console.log('Buscando todos los usuarios en la colección users de Firestore...');
        const usersSnap = await db.collection('users').get();
        if (usersSnap.empty) {
            console.warn('La colección users está vacía en Firestore.');
            return;
        }

        console.log(`Se encontraron ${usersSnap.size} usuario(s) en Firestore.`);
        const summaries = [];

        for (const doc of usersSnap.docs) {
            const uid = doc.id;
            console.log(`Exportando usuario ${uid}...`);
            const data = await exportUser(db, uid);
            const outFile = path.join(outDir, `${uid}.json`);
            writeFileSync(outFile, JSON.stringify(data, null, 2));
            summaries.push({
                uid,
                email: data.email,
                name: data.displayName,
                peopleCount: data.people.length,
                chartsCount: data.people.reduce((n, p) => n + p.charts.length, 0),
            });
            console.log(`  ✓ ${data.people.length} personas, ${data.natalChart ? 'con' : 'sin'} carta natal propia`);
        }

        writeFileSync(path.join(outDir, 'all_users.json'), JSON.stringify(summaries, null, 2));
        console.log(`\nExportación completa de ${summaries.length} usuarios guardada en ${outDir}`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
