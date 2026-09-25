import type { GeocodingResultDTO } from '@astrolegia/contracts';
import { HttpError } from '../http';
import { resolveTimezone } from './astrologer';

/**
 * Autocompletar de lugares con Nominatim (OpenStreetMap), portado de la route
 * handler /api/geocoding de Astrolegia v1. Nominatim exige identificar la app
 * y no más de una petición por segundo: el rate limit de la ruta lo cubre.
 */
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

interface NominatimItem {
    display_name?: string;
    name?: string;
    lat?: string;
    lon?: string;
    address?: {
        city?: string;
        town?: string;
        village?: string;
        country_code?: string;
    };
}

export async function searchPlaces(query: string, limit = 5): Promise<GeocodingResultDTO[]> {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=${limit}&addressdetails=1&accept-language=es`;
    let response: Response;
    try {
        response = await fetch(url, { headers: { 'User-Agent': 'Astrolegia/1.0 (api)' } });
    } catch (err) {
        throw new HttpError(502, 'UPSTREAM_ERROR', 'No se pudo consultar el servicio de geocoding', err instanceof Error ? err.message : String(err));
    }
    if (!response.ok) {
        throw new HttpError(502, 'UPSTREAM_ERROR', `El servicio de geocoding respondió ${response.status}`);
    }
    const data = (await response.json()) as NominatimItem[];

    const results: GeocodingResultDTO[] = [];
    for (const item of data) {
        // Nominatim devuelve lat/lon como strings; los clientes necesitan números reales
        const latitude = parseFloat(item.lat ?? '');
        const longitude = parseFloat(item.lon ?? '');
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
        const city = item.address?.city || item.address?.town || item.address?.village || item.name;
        if (!city) continue;
        results.push({
            displayName: item.display_name ?? city,
            city,
            country: item.address?.country_code?.toUpperCase() ?? null,
            latitude,
            longitude,
            // Zona IANA real derivada de las coordenadas
            timezone: resolveTimezone(latitude, longitude),
        });
    }
    return results;
}
