/**
 * Export de Astrolegia v1 (Firestore) a JSON, para importar después con
 * import.ts. Ver README.md.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=.../serviceAccount.json FIRESTORE_UID=<uid> pnpm export
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
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
    return {
        exportedAt: new Date().toISOString(),
        uid,
        root: await readDoc(db, `users/${uid}`),
        profileMain: await readDoc(db, `users/${uid}/profile/main`),
        natalChart: await readDoc(db, `users/${uid}/charts/natal`),
        people,
    };
}

async function main() {
    const uid = process.env.FIRESTORE_UID;
    if (!uid) throw new Error('Falta FIRESTORE_UID (uid de Firebase Auth del usuario a exportar)');
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        throw new Error('Falta GOOGLE_APPLICATION_CREDENTIALS (ruta al JSON de la service account de Firebase)');
    }

    initializeApp({ credential: applicationDefault() });
    const db = getFirestore();

    const data = await exportUser(db, uid);
    const outDir = path.join(process.cwd(), 'exports');
    mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `${uid}.json`);
    writeFileSync(outFile, JSON.stringify(data, null, 2));

    console.log(`Exportadas ${data.people.length} personas (${data.people.reduce((n, p) => n + p.charts.length, 0)} cartas) → ${outFile}`);
    console.log(`Perfil propio: ${data.root?.birthData || data.profileMain?.birthData ? 'con datos de nacimiento' : 'sin datos de nacimiento'}; carta propia: ${data.natalChart ? 'sí' : 'no'}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
