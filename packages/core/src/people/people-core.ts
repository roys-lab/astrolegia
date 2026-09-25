/**
 * People Core — funciones PURAS del modelo canónico de personas.
 *
 * Sin imports de Firebase: todo lo de este módulo es testeable en vitest sin
 * emulador. La capa Firestore (CRUD + migraciones) vive en people-service.ts,
 * que re-exporta todo lo de acá.
 */

import type {
    Person,
    PersonInput,
    PersonBirthDate,
    PersonBirthTime,
    PersonBirthPlace,
} from '../types/people';
import type { Partner, Individual } from '../types/legacy';
import type { BirthData } from '../types/user';

// ==============================================
// HASH (mismo djb2 que human-design-service / mayan-kin-service, Fase 1)
// ==============================================

/**
 * djb2 (Dan Bernstein), devuelto como hex sin signo.
 * Idéntico al de human-design-service.ts y mayan-kin-service.ts.
 */
export function djb2Hash(input: string): string {
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
        hash = (((hash << 5) + hash) + input.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16);
}

// ==============================================
// NORMALIZACIÓN Y DEDUPE
// ==============================================

/**
 * Normaliza un nombre para dedupe: minúsculas, espacios colapsados y
 * acentos plegados ("María  José" === "maria jose"). La ñ se pliega a n
 * a propósito: para dedupe preferimos falso positivo (revisable) a duplicado.
 */
export function normalizeFullName(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // saca marcas diacríticas
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

/** Clave estable de una fecha de nacimiento: 'YYYY-MM-DD'. */
export function birthDateKeyOf(birthDate: PersonBirthDate): string {
    return `${birthDate.year}-${pad2(birthDate.month)}-${pad2(birthDate.day)}`;
}

/**
 * Clave de dedupe de una persona: nombre normalizado + fecha de nacimiento.
 * Dos registros con la misma clave se consideran la MISMA persona al migrar.
 */
export function personDedupeKey(fullName: string, birthDate: PersonBirthDate): string {
    return `${normalizeFullName(fullName)}|${birthDateKeyOf(birthDate)}`;
}

/** ¿Representan a y b la misma persona (según nombre normalizado + fecha)? */
export function isSamePerson(
    a: { fullName: string; birthDate: PersonBirthDate },
    b: { fullName: string; birthDate: PersonBirthDate },
): boolean {
    return personDedupeKey(a.fullName, a.birthDate) === personDedupeKey(b.fullName, b.birthDate);
}

// ==============================================
// INPUT HASH DE CARTAS
// ==============================================

/**
 * Fingerprint de los datos de nacimiento que determinan una carta.
 * Mismo patrón que computeInputHash de human-design-service.ts: si cambia la
 * fecha, la hora, las coordenadas o la timezone, cambia el hash y la carta
 * cacheada queda marcada como stale.
 */
export function computePersonInputHash(input: {
    birthDate: PersonBirthDate;
    birthTime?: PersonBirthTime;
    birthPlace?: PersonBirthPlace;
}): string {
    const timeKey = input.birthTime
        ? `${pad2(input.birthTime.hour)}:${pad2(input.birthTime.minute)}`
        : '';
    return djb2Hash([
        birthDateKeyOf(input.birthDate),
        timeKey,
        input.birthPlace?.latitude ?? '',
        input.birthPlace?.longitude ?? '',
        input.birthPlace?.timezone ?? '',
    ].join('|'));
}

/** ¿La carta cacheada sigue vigente para este engine y estos datos? */
export function isChartCurrent(
    chart: { engineVersion: string; inputHash: string } | null | undefined,
    engineVersion: string,
    expectedInputHash: string,
): boolean {
    return !!chart
        && chart.engineVersion === engineVersion
        && chart.inputHash === expectedInputHash;
}

// ==============================================
// CONVERSIONES LEGACY -> PERSON (puras, no tocan Firestore)
// ==============================================

/**
 * Convierte un Partner legacy (subcolección de un proyecto) a PersonInput.
 * Partner no tiene lat/lng/timezone: si trae birthCity, el birthPlace queda
 * parcial (solo ciudad). Sin birthHour => birthTimeKnown false.
 */
export function partnerToPerson(
    projectId: string,
    partnerId: string,
    partner: Partner,
): PersonInput {
    const timeKnown = typeof partner.birthHour === 'number';
    const person: PersonInput = {
        fullName: partner.name,
        birthDate: {
            year: partner.birthYear,
            month: partner.birthMonth,
            day: partner.birthDay,
        },
        birthTimeKnown: timeKnown,
        tags: [],
        source: 'partner',
        legacyRefs: {
            partnerIds: [{ projectId, partnerId }],
        },
    };
    if (timeKnown) {
        person.birthTime = {
            hour: partner.birthHour as number,
            minute: partner.birthMinute ?? 0,
        };
    }
    if (partner.birthCity) {
        person.birthPlace = { city: partner.birthCity }; // parcial: sin coords ni tz
    }
    if (partner.role) {
        person.notes = `Rol en proyecto: ${partner.role}`;
    }
    return person;
}

/**
 * Parsea los componentes LITERALES de un ISO string ('1990-05-10T14:30:00-03:00'
 * o '1990-05-10'), sin pasar por Date para no arrastrar conversiones de zona.
 * Devuelve null si el string no es parseable.
 */
export function parseIsoBirthDate(iso: string): {
    birthDate: PersonBirthDate;
    birthTime?: PersonBirthTime;
} | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/.exec(iso.trim());
    if (!m) return null;
    const result: { birthDate: PersonBirthDate; birthTime?: PersonBirthTime } = {
        birthDate: {
            year: parseInt(m[1], 10),
            month: parseInt(m[2], 10),
            day: parseInt(m[3], 10),
        },
    };
    if (m[4] !== undefined && m[5] !== undefined) {
        result.birthTime = {
            hour: parseInt(m[4], 10),
            minute: parseInt(m[5], 10),
        };
    }
    return result;
}

/**
 * Convierte un Individual legacy (pool global users/{uid}/individuals, schema
 * v2 sin callers) a PersonInput. Devuelve null si birthDate no es parseable.
 */
export function individualToPerson(
    individualId: string,
    individual: Individual,
): PersonInput | null {
    const parsed = parseIsoBirthDate(individual.birthDate || '');
    if (!parsed || !individual.fullName) return null;

    const person: PersonInput = {
        fullName: individual.fullName,
        birthDate: parsed.birthDate,
        birthTimeKnown: !!parsed.birthTime,
        tags: [],
        source: 'individual',
        legacyRefs: { individualId },
    };
    if (parsed.birthTime) {
        person.birthTime = parsed.birthTime;
    }
    if (individual.birthLocation?.city) {
        person.birthPlace = {
            city: individual.birthLocation.city,
            latitude: individual.birthLocation.lat,
            longitude: individual.birthLocation.lng,
            // Individual no guarda timezone aparte (está embebida en el ISO); se omite.
        };
    }
    return person;
}

/**
 * Convierte el perfil de un amigo (users/{friendUid}/profile/main o el doc
 * raíz) a PersonInput. Devuelve null si no hay displayName o birthData: sin
 * fecha de nacimiento no hay Person (la fecha es obligatoria en el modelo).
 */
export function friendProfileToPerson(
    friendUid: string,
    profile: { displayName?: string; birthData?: Partial<BirthData> },
): PersonInput | null {
    const bd = profile.birthData;
    if (!profile.displayName || !bd
        || typeof bd.year !== 'number'
        || typeof bd.month !== 'number'
        || typeof bd.day !== 'number') {
        return null;
    }

    const timeKnown = typeof bd.hour === 'number';
    const person: PersonInput = {
        fullName: profile.displayName,
        birthDate: { year: bd.year, month: bd.month, day: bd.day },
        birthTimeKnown: timeKnown,
        tags: [],
        source: 'friend',
        linkedAccountUid: friendUid,
        legacyRefs: { friendUid },
    };
    if (timeKnown) {
        person.birthTime = { hour: bd.hour as number, minute: bd.minute ?? 0 };
    }
    if (bd.city) {
        const place: PersonBirthPlace = { city: bd.city };
        if (bd.nation) place.country = bd.nation;
        if (typeof bd.lat === 'number') place.latitude = bd.lat;
        if (typeof bd.lng === 'number') place.longitude = bd.lng;
        if (bd.timezone) place.timezone = bd.timezone;
        person.birthPlace = place;
    }
    return person;
}

// ==============================================
// UTILIDADES
// ==============================================

/**
 * Elimina recursivamente las claves con valor undefined (Firestore rechaza
 * undefined en setDoc/addDoc). No muta el original; los arrays se copian.
 */
export function stripUndefined<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map(v => stripUndefined(v)) as unknown as T;
    }
    if (value !== null && typeof value === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(value as Record<string, any>)) {
            if (v !== undefined) {
                out[k] = stripUndefined(v);
            }
        }
        return out as T;
    }
    return value;
}
