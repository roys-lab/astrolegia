/**
 * Chart display helpers (pure functions).
 *
 * The Astrologer/Kerykeion API returns `chart_data.subject` mixing scalar
 * metadata (name, year, city...) with celestial bodies. Each body looks like:
 *   { name, sign, position, abs_pos, house: 'First_House' | number, retrograde, ... }
 *
 * These helpers whitelist the bodies worth showing (planets + Chiron, lunar
 * nodes and Lilith), normalize house formats, format degrees/minutes and
 * derive the South Node from the North Node.
 */

// ==================== SIGNS ====================

/** Spanish sign labels, indexed 0-11 (Aries..Piscis) by absolute position / 30. */
export const SIGN_LABELS_ES = [
    'Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo',
    'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'
] as const;

// Accepts Kerykeion 3-letter abbreviations, full English names and
// (accent-stripped) Spanish names.
const SIGN_ES_BY_KEY: Record<string, string> = {
    ari: 'Aries', aries: 'Aries',
    tau: 'Tauro', taurus: 'Tauro', tauro: 'Tauro',
    gem: 'Géminis', gemini: 'Géminis', geminis: 'Géminis',
    can: 'Cáncer', cancer: 'Cáncer',
    leo: 'Leo',
    vir: 'Virgo', virgo: 'Virgo',
    lib: 'Libra', libra: 'Libra',
    sco: 'Escorpio', scorpio: 'Escorpio', escorpio: 'Escorpio',
    sag: 'Sagitario', sagittarius: 'Sagitario', sagitario: 'Sagitario',
    cap: 'Capricornio', capricorn: 'Capricornio', capricornio: 'Capricornio',
    aqu: 'Acuario', aquarius: 'Acuario', acuario: 'Acuario',
    pis: 'Piscis', pisces: 'Piscis', piscis: 'Piscis'
};

/** Translate a raw API sign ('Gem', 'Gemini'...) to Spanish; null if unusable. */
export function translateSign(sign: unknown): string | null {
    if (typeof sign !== 'string') return null;
    const trimmed = sign.trim();
    if (!trimmed) return null;
    const key = trimmed.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return SIGN_ES_BY_KEY[key] || trimmed;
}

// ==================== NUMERIC HELPERS ====================

/** Normalize any degree value into [0, 360). */
export function normalizeDegrees(degrees: number): number {
    return ((degrees % 360) + 360) % 360;
}

function toFiniteNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const num = Number(value);
        if (Number.isFinite(num)) return num;
    }
    return null;
}

// ==================== HOUSE PARSING ====================

const HOUSE_WORDS: Record<string, number> = {
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6,
    seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12
};

/**
 * Parse a Kerykeion house value into 1-12.
 * Handles 'First_House'..'Twelfth_House', plain numbers and numeric strings.
 * Returns null for anything unusable (no 'Casa undefined' downstream).
 */
export function parseHouseNumber(house: unknown): number | null {
    if (typeof house === 'number' && Number.isInteger(house) && house >= 1 && house <= 12) {
        return house;
    }
    if (typeof house === 'string') {
        const trimmed = house.trim();
        if (!trimmed) return null;
        const asNumber = Number(trimmed);
        if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= 12) return asNumber;
        const word = trimmed.toLowerCase().split(/[_\s-]+/)[0];
        return HOUSE_WORDS[word] ?? null;
    }
    return null;
}

// ==================== POSITION & FORMATTING ====================

/**
 * Absolute ecliptic position (0-360) of a body object.
 * Prefers `abs_pos`; falls back to `position`/`longitude`
 * (combined with `sign_num` when `position` is sign-relative).
 */
export function getAbsolutePosition(body: unknown): number | null {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    const record = body as Record<string, unknown>;

    const abs = toFiniteNumber(record.abs_pos);
    if (abs !== null) return normalizeDegrees(abs);

    const pos = toFiniteNumber(record.position) ?? toFiniteNumber(record.longitude);
    if (pos === null) return null;

    const signNum = toFiniteNumber(record.sign_num);
    if (signNum !== null && pos >= 0 && pos < 30) {
        // `position` is degrees within the sign: rebuild the absolute position
        return normalizeDegrees(signNum * 30 + pos);
    }
    return normalizeDegrees(pos);
}

/** Sign index (0-11), in-sign degrees and minutes, with minute-rounding carry. */
function positionParts(absPos: number): { signIndex: number; degrees: number; minutes: number } {
    const totalMinutes = Math.round(normalizeDegrees(absPos) * 60) % (360 * 60);
    const signIndex = Math.floor(totalMinutes / (30 * 60));
    const withinSign = totalMinutes % (30 * 60);
    return { signIndex, degrees: Math.floor(withinSign / 60), minutes: withinSign % 60 };
}

/** Spanish sign label for an absolute position. 84.13 -> 'Géminis'. */
export function signFromAbsPos(absPos: number): string {
    return SIGN_LABELS_ES[positionParts(absPos).signIndex];
}

/** In-sign degrees and minutes. 84.13 -> '24°08′'. */
export function formatDegreeMinute(absPos: number): string {
    const { degrees, minutes } = positionParts(absPos);
    return `${degrees}°${String(minutes).padStart(2, '0')}′`;
}

/** Full position label. 84.13 -> '24°08′ Géminis'. */
export function formatPosition(absPos: number): string {
    const { signIndex } = positionParts(absPos);
    return `${formatDegreeMinute(absPos)} ${SIGN_LABELS_ES[signIndex]}`;
}

/** South Node = North Node + 180° (mod 360): same degree, opposite sign. */
export function southNodeAbsPos(northNodeAbsPos: number): number {
    return normalizeDegrees(northNodeAbsPos + 180);
}

// ==================== BODY WHITELIST ====================

export interface BodyDefinition {
    /** Canonical id used by the UI ('north_node' regardless of source key). */
    id: string;
    /** Spanish label. */
    label: string;
    /** Subject keys in priority order: the first one present wins. */
    keys: string[];
}

/** Ordered whitelist of bodies worth displaying. Scalar subject fields never match. */
export const BODY_WHITELIST: BodyDefinition[] = [
    { id: 'sun', label: 'Sol', keys: ['sun'] },
    { id: 'moon', label: 'Luna', keys: ['moon'] },
    { id: 'mercury', label: 'Mercurio', keys: ['mercury'] },
    { id: 'venus', label: 'Venus', keys: ['venus'] },
    { id: 'mars', label: 'Marte', keys: ['mars'] },
    { id: 'jupiter', label: 'Júpiter', keys: ['jupiter'] },
    { id: 'saturn', label: 'Saturno', keys: ['saturn'] },
    { id: 'uranus', label: 'Urano', keys: ['uranus'] },
    { id: 'neptune', label: 'Neptuno', keys: ['neptune'] },
    { id: 'pluto', label: 'Plutón', keys: ['pluto'] },
    { id: 'chiron', label: 'Quirón', keys: ['chiron'] },
    // True node preferred over mean node. The v5 API uses *_lunar_node keys;
    // the shorter ones are kept as fallback for older stored charts.
    {
        id: 'north_node', label: 'Nodo Norte',
        keys: ['true_north_lunar_node', 'mean_north_lunar_node', 'true_node', 'north_node', 'mean_node']
    },
    // The API already returns the South Node (with its own house). If absent,
    // extractChartBodies derives it from the North Node (+180°).
    {
        id: 'south_node', label: 'Nodo Sur',
        keys: ['true_south_lunar_node', 'mean_south_lunar_node', 'south_node']
    },
    { id: 'lilith', label: 'Lilith', keys: ['mean_lilith', 'lilith', 'true_lilith', 'dark_moon_lilith'] }
];

export interface DisplayBody {
    id: string;
    label: string;
    /** Subject key the data came from; null for derived bodies (South Node). */
    sourceKey: string | null;
    absPos: number | null;
    /** 'Géminis' — always present (bodies without sign nor position are dropped). */
    signLabel: string;
    /** '24°08′' — null when the API gave no numeric position. */
    degreeLabel: string | null;
    /** '24°08′ Géminis' — null when the API gave no numeric position. */
    positionLabel: string | null;
    house: number | null;
    retrograde: boolean;
    derived: boolean;
}

function buildDisplayBody(def: BodyDefinition, sourceKey: string, raw: Record<string, unknown>): DisplayBody | null {
    const absPos = getAbsolutePosition(raw);
    const signLabel = translateSign(raw.sign) ?? (absPos !== null ? signFromAbsPos(absPos) : null);
    if (signLabel === null) return null; // nothing displayable

    const degreeLabel = absPos !== null ? formatDegreeMinute(absPos) : null;
    return {
        id: def.id,
        label: def.label,
        sourceKey,
        absPos,
        signLabel,
        degreeLabel,
        positionLabel: degreeLabel !== null ? `${degreeLabel} ${signLabel}` : null,
        house: parseHouseNumber(raw.house ?? (raw as any).house_number),
        retrograde: raw.retrograde === true,
        derived: false
    };
}

/**
 * Extract the whitelisted bodies from `chart_data.subject`, in canonical order.
 * - Scalars (name, year, city...) and malformed/null entries are silently skipped.
 * - If the API did not return a South Node, it is derived from the North Node
 *   (+180°: same degree, opposite sign) and inserted right after it.
 */
export function extractChartBodies(subject: unknown): DisplayBody[] {
    if (!subject || typeof subject !== 'object') return [];
    const record = subject as Record<string, unknown>;
    const bodies: DisplayBody[] = [];

    for (const def of BODY_WHITELIST) {
        for (const key of def.keys) {
            const raw = record[key];
            if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
            const body = buildDisplayBody(def, key, raw as Record<string, unknown>);
            if (!body) continue;
            bodies.push(body);
            break; // first present key wins (true node over mean node)
        }
    }

    // Fallback: derive the South Node when the API omitted it
    if (!bodies.some(b => b.id === 'south_node')) {
        const northIndex = bodies.findIndex(b => b.id === 'north_node');
        const north = northIndex >= 0 ? bodies[northIndex] : null;
        if (north && north.absPos !== null) {
            const southAbs = southNodeAbsPos(north.absPos);
            bodies.splice(northIndex + 1, 0, {
                id: 'south_node',
                label: 'Nodo Sur',
                sourceKey: null,
                absPos: southAbs,
                signLabel: signFromAbsPos(southAbs),
                degreeLabel: formatDegreeMinute(southAbs),
                positionLabel: formatPosition(southAbs),
                house: null,
                retrograde: north.retrograde,
                derived: true
            });
        }
    }
    return bodies;
}

// ==================== AI PROMPT LINES ====================

/**
 * Build the planet lines sent to /api/astrology/interpret.
 * One line per whitelisted body: 'Sol: 24°08′ Géminis, Casa 10[, Retrógrado]'.
 * Appends the Ascendant (from subject.first_house) since the reading analyzes it.
 * Never emits undefined/null fragments.
 */
export function buildPlanetsPromptLines(subject: unknown): string[] {
    const lines = extractChartBodies(subject).map(body => {
        const parts = [`${body.label}: ${body.positionLabel ?? body.signLabel}`];
        if (body.house !== null) parts.push(`Casa ${body.house}`);
        if (body.retrograde) parts.push('Retrógrado');
        return parts.join(', ');
    });

    const ascendant = (subject as Record<string, unknown> | null | undefined)?.first_house;
    if (ascendant && typeof ascendant === 'object' && !Array.isArray(ascendant)) {
        const absPos = getAbsolutePosition(ascendant);
        const signLabel = translateSign((ascendant as Record<string, unknown>).sign)
            ?? (absPos !== null ? signFromAbsPos(absPos) : null);
        if (signLabel !== null) {
            lines.push(`Ascendente: ${absPos !== null ? `${formatDegreeMinute(absPos)} ${signLabel}` : signLabel}`);
        }
    }
    return lines;
}
