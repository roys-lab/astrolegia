/**
 * Modelo canónico de personas — colección `users/{uid}/people/{personId}`.
 *
 * Este es el modelo objetivo de la Fase 3 (dashboard de personas). Unifica los
 * 4 almacenes legacy detectados en la auditoría:
 *   1. Amigos:      users/{uid}/friends/{friendUid}          (user-service.ts)
 *   2. Socios:      users/{uid}/projects/{pid}/partners/{id} (db.ts, interfaz Partner)
 *   3. Individuos:  users/{uid}/individuals/{id}             (db.ts, interfaz Individual, sin callers)
 *   4. Entidades manuales de sinastría (no persistidas hoy)
 *
 * La migración es NO destructiva: los docs legacy nunca se borran; cada Person
 * guarda en `legacyRefs` de dónde vino para poder rastrear el origen.
 */

/** Fecha de nacimiento en componentes locales (sin zona horaria implícita). */
export interface PersonBirthDate {
    year: number;
    month: number; // 1-12
    day: number;   // 1-31
}

/** Hora local de nacimiento. Si no se conoce, el campo birthTime se omite. */
export interface PersonBirthTime {
    hour: number;   // 0-23
    minute: number; // 0-59
}

/**
 * Lugar de nacimiento. latitude/longitude/timezone son opcionales porque los
 * almacenes legacy no siempre los tienen (ej.: Partner solo guarda birthCity).
 * Un birthPlace "completo" (con coords + timezone) habilita cartas precisas.
 */
export interface PersonBirthPlace {
    city: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string; // IANA, ej. 'America/Argentina/Buenos_Aires'
}

/** De qué almacén salió esta persona. */
export type PersonSource = 'manual' | 'friend' | 'partner' | 'individual' | 'self';

/**
 * Referencias a los documentos legacy de origen. Solo se agregan, nunca se
 * borran: son la garantía de trazabilidad de la migración no destructiva.
 */
export interface PersonLegacyRefs {
    /** Una persona puede haber sido socia en varios proyectos. */
    partnerIds?: { projectId: string; partnerId: string }[];
    individualId?: string;
    friendUid?: string;
}

export interface Person {
    id: string;
    fullName: string;
    birthDate: PersonBirthDate;
    /** Ausente = hora desconocida (ver birthTimeKnown). */
    birthTime?: PersonBirthTime;
    /** Flag explícito: false => cartas sin casas/ascendente confiables. */
    birthTimeKnown: boolean;
    birthPlace?: PersonBirthPlace;
    tags: string[];
    notes?: string;
    /** Si la persona es un usuario real de la red, su uid de Firebase Auth. */
    linkedAccountUid?: string;
    source: PersonSource;
    legacyRefs?: PersonLegacyRefs;
    createdAt: string; // ISO 8601
    updatedAt: string; // ISO 8601
}

/** Datos para crear/convertir una persona (el servicio completa id y timestamps). */
export type PersonInput = Omit<Person, 'id' | 'createdAt' | 'updatedAt'>;

// ==============================================
// CARTAS CACHEADAS POR PERSONA
// users/{uid}/people/{personId}/charts/{type}
// ==============================================

export type PersonChartType = 'natal' | 'humanDesign' | 'mayanKin' | 'numerology';

/**
 * Carta cacheada de una persona. Sigue el patrón engineVersion/inputHash de
 * human-design-service.ts y mayan-kin-service.ts (Fase 1): si el engine o los
 * datos de nacimiento cambian, el hash deja de coincidir y hay que recalcular.
 */
export interface PersonChart {
    type: PersonChartType;
    payload: any;
    engineVersion: string;
    inputHash: string;  // djb2 de los datos de nacimiento (ver computePersonInputHash)
    computedAt: string; // ISO 8601
}
