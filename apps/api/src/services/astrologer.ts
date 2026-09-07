/**
 * Astrologer API Integration (RapidAPI / gbattaglia)
 * 
 * API Documentation: https://github.com/g-battaglia/Astrologer-API
 * 
 * Endpoints used:
 * - /api/v5/chart/birth-chart - Returns SVG chart + full data
 * - /api/v5/chart/synastry - Returns synastry chart SVG + data
 * - /api/v5/compatibility-score - Returns compatibility score
 * - /api/v5/context/birth-chart - Returns AI-optimized context for LLM integration
 */

import tzlookup from 'tz-lookup';

const BASE_URL = 'https://astrologer.p.rapidapi.com/api/v5';

// Explicit defaults sent to the external API so results never depend on
// the provider's implicit configuration (Placidus houses, Tropical zodiac).
const DEFAULT_ZODIAC_TYPE = 'Tropical' as const;
const DEFAULT_HOUSES_SYSTEM = 'P'; // Placidus

/**
 * Error thrown when a city cannot be resolved to coordinates.
 * API routes catch it to answer with a 422 instead of a generic 500.
 */
export class GeocodingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GeocodingError';
    }
}

// ==================== TYPE DEFINITIONS ====================

export interface BirthChartParams {
    name: string;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    city: string;
    nation?: string; // 2-letter ISO code (e.g., "AR", "US")
    latitude?: number;
    longitude?: number;
    timezone?: string; // IANA timezone (e.g., "America/Argentina/Buenos_Aires")
    // Additional options
    theme?: 'light' | 'dark' | 'dark-high-contrast' | 'classic';
    language?: 'EN' | 'ES' | 'FR' | 'PT' | 'IT' | 'DE' | 'RU' | 'CN' | 'TR' | 'HI';
    zodiac_type?: 'Tropical' | 'Sidereal';
    houses_system_identifier?: string; // 'P' = Placidus (default), etc.
    transparent_background?: boolean;
    split_chart?: boolean;
}

export interface SynastryParams {
    first_subject: SubjectData;
    second_subject: SubjectData;
    theme?: 'light' | 'dark' | 'dark-high-contrast' | 'classic';
    language?: 'EN' | 'ES' | 'FR' | 'PT' | 'IT' | 'DE';
}

export interface SubjectData {
    name: string;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    longitude: number;
    latitude: number;
    timezone: string;
    city?: string;
}

export interface GeocodingResult {
    latitude: number;
    longitude: number;
    timezone: string;
    displayName: string;
}

export interface BirthChartResponse {
    status: string;
    chart?: string;  // SVG string when using /chart/* endpoint
    chart_wheel?: string; // SVG when split_chart is true
    chart_grid?: string;  // SVG when split_chart is true
    chart_data?: any;
    ai_summary?: any;
    _debug?: any;
}

// ==================== GEOCODING ====================

// Common city coordinates as fallback
const CITY_COORDS: Record<string, { lat: number; lng: number; tz: string }> = {
    // Argentina
    'buenos aires': { lat: -34.6037, lng: -58.3816, tz: 'America/Argentina/Buenos_Aires' },
    'córdoba': { lat: -31.42, lng: -64.19, tz: 'America/Argentina/Cordoba' },
    'cordoba': { lat: -31.42, lng: -64.19, tz: 'America/Argentina/Cordoba' },
    'rosario': { lat: -32.94, lng: -60.64, tz: 'America/Argentina/Cordoba' },
    'mendoza': { lat: -32.89, lng: -68.83, tz: 'America/Argentina/Mendoza' },
    'la plata': { lat: -34.92, lng: -57.95, tz: 'America/Argentina/Buenos_Aires' },
    'mar del plata': { lat: -38.0, lng: -57.55, tz: 'America/Argentina/Buenos_Aires' },
    'tucuman': { lat: -26.82, lng: -65.22, tz: 'America/Argentina/Tucuman' },
    'salta': { lat: -24.79, lng: -65.41, tz: 'America/Argentina/Salta' },
    'santa fe': { lat: -31.63, lng: -60.70, tz: 'America/Argentina/Cordoba' },
    // USA
    'new york': { lat: 40.7128, lng: -74.006, tz: 'America/New_York' },
    'los angeles': { lat: 34.0522, lng: -118.2437, tz: 'America/Los_Angeles' },
    'chicago': { lat: 41.8781, lng: -87.6298, tz: 'America/Chicago' },
    'houston': { lat: 29.7604, lng: -95.3698, tz: 'America/Chicago' },
    'miami': { lat: 25.7617, lng: -80.1918, tz: 'America/New_York' },
    'san francisco': { lat: 37.7749, lng: -122.4194, tz: 'America/Los_Angeles' },
    // Europe
    'london': { lat: 51.5074, lng: -0.1278, tz: 'Europe/London' },
    'madrid': { lat: 40.4168, lng: -3.7038, tz: 'Europe/Madrid' },
    'barcelona': { lat: 41.3851, lng: 2.1734, tz: 'Europe/Madrid' },
    'paris': { lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris' },
    'berlin': { lat: 52.52, lng: 13.405, tz: 'Europe/Berlin' },
    'rome': { lat: 41.9028, lng: 12.4964, tz: 'Europe/Rome' },
    'roma': { lat: 41.9028, lng: 12.4964, tz: 'Europe/Rome' },
    'amsterdam': { lat: 52.3676, lng: 4.9041, tz: 'Europe/Amsterdam' },
    // Latin America
    'mexico city': { lat: 19.4326, lng: -99.1332, tz: 'America/Mexico_City' },
    'ciudad de mexico': { lat: 19.4326, lng: -99.1332, tz: 'America/Mexico_City' },
    'bogota': { lat: 4.711, lng: -74.0721, tz: 'America/Bogota' },
    'bogotá': { lat: 4.711, lng: -74.0721, tz: 'America/Bogota' },
    'lima': { lat: -12.0464, lng: -77.0428, tz: 'America/Lima' },
    'santiago': { lat: -33.4489, lng: -70.6693, tz: 'America/Santiago' },
    'sao paulo': { lat: -23.5505, lng: -46.6333, tz: 'America/Sao_Paulo' },
    'são paulo': { lat: -23.5505, lng: -46.6333, tz: 'America/Sao_Paulo' },
    'rio de janeiro': { lat: -22.9068, lng: -43.1729, tz: 'America/Sao_Paulo' },
    'montevideo': { lat: -34.9011, lng: -56.1645, tz: 'America/Montevideo' },
    'caracas': { lat: 10.4806, lng: -66.9036, tz: 'America/Caracas' },
    // Other
    'tokyo': { lat: 35.6762, lng: 139.6503, tz: 'Asia/Tokyo' },
    'sydney': { lat: -33.8688, lng: 151.2093, tz: 'Australia/Sydney' },
    'dubai': { lat: 25.2048, lng: 55.2708, tz: 'Asia/Dubai' },
};

// ==================== PURE HELPERS (exported for tests) ====================

/**
 * Parse an hour/minute value with an explicit fallback.
 * Unlike `value || fallback`, this keeps 0 (midnight / minute zero) intact.
 */
export function parseTimeComponent(value: unknown, fallback: number): number {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

/** Parse a birth hour: 0 stays 0 (midnight); missing/invalid falls back to 12 (noon). */
export function parseHour(value: unknown): number {
    return parseTimeComponent(value, 12);
}

/** Parse a birth minute: 0 stays 0; missing/invalid falls back to 0. */
export function parseMinute(value: unknown): number {
    return parseTimeComponent(value, 0);
}

/**
 * Convert an arbitrary input to a finite number, or undefined.
 * Keeps 0 as a valid value (latitude/longitude 0 are real coordinates).
 */
export function toFiniteNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
}

/**
 * Normalize a city name for CITY_COORDS lookup:
 * keep only the part before the first comma, lowercase, strip accents.
 * 'Buenos Aires, Argentina' -> 'buenos aires'; 'Córdoba' -> 'cordoba'.
 */
export function normalizeCityKey(cityName: string): string {
    return cityName
        .split(',')[0]
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/** Resolve the real IANA timezone for coordinates (tz-lookup, no estimation). */
export function resolveTimezone(latitude: number, longitude: number): string {
    return tzlookup(latitude, longitude);
}

/**
 * Geocode a city name using OpenStreetMap Nominatim API
 * This is a free API with no key required (just rate limiting)
 */
export async function geocodeCity(cityName: string): Promise<GeocodingResult | null> {
    try {
        const cityKey = normalizeCityKey(cityName);
        const knownCity = CITY_COORDS[cityKey];

        if (knownCity) {
            return {
                latitude: knownCity.lat,
                longitude: knownCity.lng,
                timezone: resolveTimezone(knownCity.lat, knownCity.lng),
                displayName: cityName
            };
        }

        // Try OpenStreetMap Nominatim (free, no API key)
        const encodedCity = encodeURIComponent(cityName);
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodedCity}&format=json&limit=1`,
            { headers: { 'User-Agent': 'Astrolegia/1.0' } }
        );

        if (!response.ok) {
            console.warn('[Geocoding] Nominatim API failed:', response.status);
            return null;
        }

        // fetch de Node tipa json() como unknown (en el navegador era any)
        const results = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;

        if (results.length === 0) {
            console.warn('[Geocoding] No results found for:', cityName);
            return null;
        }

        const result = results[0];
        const latitude = parseFloat(result.lat);
        const longitude = parseFloat(result.lon);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            console.warn('[Geocoding] Nominatim returned invalid coordinates for:', cityName);
            return null;
        }

        const timezone = resolveTimezone(latitude, longitude);

        return { latitude, longitude, timezone, displayName: result.display_name };
    } catch (error) {
        console.error('[Geocoding] Error:', error);
        return null;
    }
}

// ==================== API HELPERS ====================

function getApiHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST || 'astrologer.p.rapidapi.com'
    };
}

async function resolveCoordinates(params: BirthChartParams): Promise<{ latitude: number; longitude: number; timezone: string }> {
    let { latitude, longitude, timezone } = params;

    // Number.isFinite so latitude/longitude 0 (equator/Greenwich) are kept, not re-geocoded
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        const geocoded = await geocodeCity(params.city);

        if (!geocoded) {
            // No silent fallback: an unresolved city must fail loudly, never default to Buenos Aires
            throw new GeocodingError(`No pude ubicar la ciudad ${params.city || '(sin ciudad)'} — verificá la ortografía`);
        }

        latitude = geocoded.latitude;
        longitude = geocoded.longitude;
        timezone = timezone || geocoded.timezone;
        console.log('[Astrology API] Geocoded:', params.city, '->', { latitude, longitude, timezone });
    }

    // If we have coordinates but no timezone, derive the real one from them
    if (!timezone) {
        timezone = resolveTimezone(latitude!, longitude!);
    }

    return {
        latitude: latitude!,
        longitude: longitude!,
        timezone
    };
}

// ==================== MAIN API FUNCTIONS ====================

/**
 * Get birth chart with SVG and full data
 * Uses: /api/v5/chart/birth-chart (returns SVG + chart_data)
 */
export async function getBirthChart(params: BirthChartParams): Promise<BirthChartResponse> {
    const coords = await resolveCoordinates(params);

    // Build subject object per API spec
    const subject: any = {
        name: params.name || 'Subject',
        year: params.year,
        month: params.month,
        day: params.day,
        hour: parseHour(params.hour),
        minute: parseMinute(params.minute),
        city: params.city || 'Buenos Aires',
        longitude: coords.longitude,
        latitude: coords.latitude,
        timezone: coords.timezone,
        // Always explicit so the API never falls back to its own defaults
        zodiac_type: params.zodiac_type || DEFAULT_ZODIAC_TYPE,
        houses_system_identifier: params.houses_system_identifier || DEFAULT_HOUSES_SYSTEM
    };

    // Build request body - /chart/* endpoints accept theme and language
    const body: any = { subject };

    if (params.theme) body.theme = params.theme;
    if (params.language) body.language = params.language;
    if (params.transparent_background) body.transparent_background = true;
    if (params.split_chart) body.split_chart = true;

    console.log('[Astrology API] Requesting chart with body:', JSON.stringify(body, null, 2));

    try {
        // Use /chart/birth-chart to get SVG + data
        const response = await fetch(`${BASE_URL}/chart/birth-chart`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Astrology API] Error response:', errorText);
            throw new Error(`API Error: ${response.status} - ${errorText.slice(0, 300)}`);
        }

        const result = (await response.json()) as BirthChartResponse;

        return {
            ...result,
            _debug: { ...coords, city: params.city }
        };

    } catch (error) {
        console.error('[Astrology API] Critical Error:', error);
        throw error;
    }
}

/**
 * Get birth chart data only (no SVG)
 * Uses: /api/v5/chart-data/birth-chart
 * NOTE: This endpoint does NOT accept theme, language, or rendering options
 */
export async function getBirthChartDataOnly(params: BirthChartParams) {
    const coords = await resolveCoordinates(params);

    const body = {
        subject: {
            name: params.name || 'Subject',
            year: params.year,
            month: params.month,
            day: params.day,
            hour: parseHour(params.hour),
            minute: parseMinute(params.minute),
            city: params.city || 'Buenos Aires',
            longitude: coords.longitude,
            latitude: coords.latitude,
            timezone: coords.timezone,
            zodiac_type: params.zodiac_type || DEFAULT_ZODIAC_TYPE,
            houses_system_identifier: params.houses_system_identifier || DEFAULT_HOUSES_SYSTEM
        }
        // NO language, theme, or rendering options for /chart-data/* endpoints
    };

    const response = await fetch(`${BASE_URL}/chart-data/birth-chart`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText.slice(0, 200)}`);
    }

    return response.json();
}

/**
 * Get birth chart with AI context (for LLM integration)
 * Uses: /api/v5/context/birth-chart
 */
export async function getBirthChartContext(params: BirthChartParams) {
    const coords = await resolveCoordinates(params);

    const body = {
        subject: {
            name: params.name || 'Subject',
            year: params.year,
            month: params.month,
            day: params.day,
            hour: parseHour(params.hour),
            minute: parseMinute(params.minute),
            city: params.city || 'Buenos Aires',
            longitude: coords.longitude,
            latitude: coords.latitude,
            timezone: coords.timezone,
            zodiac_type: params.zodiac_type || DEFAULT_ZODIAC_TYPE,
            houses_system_identifier: params.houses_system_identifier || DEFAULT_HOUSES_SYSTEM
        }
    };

    const response = await fetch(`${BASE_URL}/context/birth-chart`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText.slice(0, 200)}`);
    }

    return response.json();
}

/**
 * Get synastry chart (comparison between two subjects)
 */
// Attach explicit zodiac/houses defaults to a subject sent to the external API
function withExplicitDefaults(subject: SubjectData): any {
    return {
        zodiac_type: DEFAULT_ZODIAC_TYPE,
        houses_system_identifier: DEFAULT_HOUSES_SYSTEM,
        ...subject
    };
}

export async function getSynastryChart(params: SynastryParams) {
    const body: any = {
        first_subject: withExplicitDefaults(params.first_subject),
        second_subject: withExplicitDefaults(params.second_subject)
    };

    if (params.theme) body.theme = params.theme;
    if (params.language) body.language = params.language;

    const response = await fetch(`${BASE_URL}/chart/synastry`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText.slice(0, 200)}`);
    }

    return response.json();
}

/**
 * Get compatibility score between two subjects (fast, no SVG)
 * Uses: /api/v5/compatibility-score
 */
export async function getCompatibilityScore(first: SubjectData, second: SubjectData) {
    const body = {
        first_subject: withExplicitDefaults(first),
        second_subject: withExplicitDefaults(second)
    };

    const response = await fetch(`${BASE_URL}/compatibility-score`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText.slice(0, 200)}`);
    }

    return response.json();
}

/**
 * Get current sky chart (transits now)
 * Uses: /api/v5/now/chart
 */
export async function getCurrentSkyChart(theme: 'light' | 'dark' = 'dark') {
    const response = await fetch(`${BASE_URL}/now/chart`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ theme })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText.slice(0, 200)}`);
    }

    return response.json();
}

/**
 * Get transit chart (current transits affecting a natal chart)
 */
export async function getTransitChart(
    natalSubject: SubjectData,
    transitDate?: { year: number; month: number; day: number; hour: number; minute: number },
    theme: 'light' | 'dark' = 'dark'
) {
    const now = new Date();
    const transitSubject = {
        year: transitDate?.year ?? now.getFullYear(),
        month: transitDate?.month ?? (now.getMonth() + 1),
        day: transitDate?.day ?? now.getDate(),
        // ?? so hour 0 (midnight) and minute 0 are respected
        hour: transitDate?.hour ?? now.getHours(),
        minute: transitDate?.minute ?? now.getMinutes(),
        longitude: natalSubject.longitude,
        latitude: natalSubject.latitude,
        timezone: natalSubject.timezone
    };

    const response = await fetch(`${BASE_URL}/chart/transit`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
            first_subject: withExplicitDefaults(natalSubject),
            transit_subject: transitSubject,
            theme
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText.slice(0, 200)}`);
    }

    return response.json();
}
