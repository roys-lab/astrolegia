/**
 * Formas legacy de Firestore (Astrolegia v1) que todavía entienden las
 * conversiones de people-core (`partnerToPerson`, `individualToPerson`).
 *
 * Copiadas 1:1 desde `apps/web/src/lib/db.ts`, que ahora las re-exporta desde
 * acá para que exista una sola definición. Cuando la persistencia termine de
 * migrar a PostgreSQL (ver docs/technology/adr/0001), estos tipos se van junto
 * con `db.ts`.
 */

export interface Partner {
    id?: string;
    name: string;
    role: string;
    teamId?: string; // Sub-team assignment
    birthDay: number;
    birthMonth: number;
    birthYear: number;
    birthHour?: number;
    birthMinute?: number;
    birthCity?: string;
    lifePath?: number;
    destiny?: number;
    zodiacSign?: string;
    /** Compatibilidad real proyecto↔socio (0-100). null = no se pudo calcular. */
    compatibility?: number | null;
    // Stored data
    chartData?: any;
    aiAnalysis?: string;
    createdAt?: any;
}

export interface Individual {
    id?: string;
    uid: string; // The user who owns this data
    fullName: string;
    birthDate: string; // ISO with timezone
    birthLocation: {
        city: string;
        lat: number;
        lng: number;
    };
    // Cached Technical Data
    astrologicalData?: any; // Sun, Moon, Asc, etc.
    numerologicalData?: any; // Life Path, Destiny, etc.
    createdAt?: any;
}
