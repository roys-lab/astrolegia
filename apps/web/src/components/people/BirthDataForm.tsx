"use client";

/**
 * BirthDataForm — formulario reutilizable de datos de nacimiento.
 *
 * Campos: nombre, fecha (DD/MM/AAAA), hora+minuto en formato 24h con toggle
 * "Hora desconocida", ciudad con autocomplete de GET /v1/client/geocoding
 * (debounce 400ms). Al elegir una sugerencia guarda latitude/longitude/timezone
 * REALES; si el usuario vuelve a tipear, las coordenadas se descartan y la API
 * geocodifica al generar la carta.
 *
 * API (controlado):
 *   <BirthDataForm value={v} onChange={setV} onSubmit={guardar} submitLabel="Guardar" busy={saving} />
 *
 * Helpers exportados para consumidores (PersonPicker, /people, /people/[id]):
 *   - emptyBirthDataFormValue()
 *   - personToFormValue(profile)
 *   - validateBirthDataForm(value)  -> mensaje de error o null
 *   - formValueToBirthFields(value) -> CreateNatalProfileDTO (o null si inválido)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Clock, MapPinCheck } from 'lucide-react';
import type { CreateNatalProfileDTO, GeocodingResponseDTO, GeocodingResultDTO, NatalProfileDTO } from '@astrolegia/contracts';
import { api } from '@/lib/api';
import { FieldLabel } from './ui';

// ==============================================
// TIPOS Y HELPERS PUROS
// ==============================================

export interface BirthDataFormValue {
    name: string;
    day: string;
    month: string;
    year: string;
    hour: string;
    minute: string;
    /** true => se ignoran hour/minute y birthTimeKnown queda en false. */
    timeUnknown: boolean;
    city: string;
    /** Código de país (ej. 'AR') si vino del autocomplete. */
    country: string;
    /** Coordenadas reales elegidas del autocomplete; null si tipeó libre. */
    latitude: number | null;
    longitude: number | null;
    timezone: string | null;
}

export function emptyBirthDataFormValue(): BirthDataFormValue {
    return {
        name: '',
        day: '', month: '', year: '',
        hour: '', minute: '',
        timeUnknown: false,
        city: '', country: '',
        latitude: null, longitude: null, timezone: null,
    };
}

/** Precarga el formulario desde un perfil existente (edición). */
export function personToFormValue(p: NatalProfileDTO): BirthDataFormValue {
    const [year, month, day] = p.birthDate.split('-');
    const time = p.birthTimeKnown && p.birthTime ? p.birthTime.split(':') : null;
    return {
        name: p.name,
        day: String(Number(day)),
        month: String(Number(month)),
        year,
        hour: time ? String(Number(time[0])) : '',
        minute: time ? String(Number(time[1])) : '',
        timeUnknown: !p.birthTimeKnown,
        city: p.city ?? '',
        country: p.country ?? '',
        latitude: p.latitude,
        longitude: p.longitude,
        timezone: p.timezone,
    };
}

function parseIntOrNull(raw: string): number | null {
    const trimmed = raw.trim();
    if (trimmed === '') return null;
    const n = Number(trimmed);
    return Number.isInteger(n) ? n : null;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Mensaje de error legible, o null si el formulario es válido. */
export function validateBirthDataForm(v: BirthDataFormValue): string | null {
    if (!v.name.trim()) return 'Ingresá el nombre completo.';
    if (v.name.trim().length < 2) return 'El nombre necesita al menos 2 caracteres.';

    const day = parseIntOrNull(v.day);
    const month = parseIntOrNull(v.month);
    const year = parseIntOrNull(v.year);
    if (day === null || month === null || year === null) return 'Completá la fecha de nacimiento.';
    if (year < 1200 || year > 2200) return 'El año de nacimiento no parece válido.';
    if (month < 1 || month > 12) return 'El mes debe estar entre 1 y 12.';
    const probe = new Date(year, month - 1, day);
    if (day < 1 || probe.getMonth() !== month - 1 || probe.getDate() !== day) {
        return 'El día no existe en ese mes.';
    }

    if (!v.timeUnknown) {
        const hour = parseIntOrNull(v.hour);
        const minute = parseIntOrNull(v.minute);
        if (hour === null || minute === null) {
            return 'Ingresá la hora (0-23) o marcá "Hora desconocida".';
        }
        if (hour < 0 || hour > 23) return 'La hora debe estar entre 0 y 23.';
        if (minute < 0 || minute > 59) return 'Los minutos deben estar entre 0 y 59.';
    }

    if (!v.city.trim()) return 'Ingresá la ciudad de nacimiento.';
    return null;
}

/** Convierte el formulario en el DTO de alta/edición. Devuelve null si es inválido. */
export function formValueToBirthFields(v: BirthDataFormValue): CreateNatalProfileDTO | null {
    if (validateBirthDataForm(v) !== null) return null;

    const hasCoords = v.latitude !== null && v.longitude !== null;
    const birthTimeKnown = !v.timeUnknown;
    return {
        name: v.name.trim(),
        birthDate: `${parseIntOrNull(v.year) as number}-${pad2(parseIntOrNull(v.month) as number)}-${pad2(parseIntOrNull(v.day) as number)}`,
        birthTime: birthTimeKnown
            ? `${pad2(parseIntOrNull(v.hour) as number)}:${pad2(parseIntOrNull(v.minute) as number)}`
            : null,
        birthTimeKnown,
        city: v.city.trim(),
        country: v.country.trim() || null,
        latitude: hasCoords ? v.latitude : null,
        longitude: hasCoords ? v.longitude : null,
        timezone: hasCoords && v.timezone ? v.timezone : null,
    };
}

// ==============================================
// COMPONENTE
// ==============================================

export interface BirthDataFormProps {
    value: BirthDataFormValue;
    onChange: (next: BirthDataFormValue) => void;
    /** Si se pasa, se muestra el botón de submit (deshabilitado mientras busy). */
    onSubmit?: () => void;
    submitLabel?: string;
    busy?: boolean;
}

export default function BirthDataForm({
    value,
    onChange,
    onSubmit,
    submitLabel = 'Guardar',
    busy = false,
}: BirthDataFormProps) {
    const [suggestions, setSuggestions] = useState<GeocodingResultDTO[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    }, []);

    const searchCity = useCallback((query: string) => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        if (query.trim().length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        searchTimerRef.current = setTimeout(async () => {
            try {
                const data = await api<GeocodingResponseDTO>(`/v1/client/geocoding?q=${encodeURIComponent(query)}`);
                setSuggestions(data.results ?? []);
                setShowSuggestions(true);
            } catch (err) {
                console.error('[BirthDataForm] Geocoding error:', err);
            }
        }, 400);
    }, []);

    const set = (patch: Partial<BirthDataFormValue>) => onChange({ ...value, ...patch });

    const pickSuggestion = (s: GeocodingResultDTO) => {
        const hasCoords = Number.isFinite(s.latitude) && Number.isFinite(s.longitude);
        set({
            city: s.displayName,
            country: s.country ?? value.country,
            latitude: hasCoords ? s.latitude : null,
            longitude: hasCoords ? s.longitude : null,
            timezone: hasCoords && s.timezone ? s.timezone : null,
        });
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const hasCoords = value.latitude !== null && value.longitude !== null;

    return (
        <div className="space-y-5">
            {/* Nombre */}
            <div className="flex flex-col gap-2">
                <FieldLabel>Nombre completo</FieldLabel>
                <input
                    type="text"
                    placeholder="Nombre y apellido"
                    value={value.name}
                    onChange={e => set({ name: e.target.value })}
                    className="input-field"
                />
            </div>

            {/* Fecha */}
            <div className="flex flex-col gap-2">
                <FieldLabel>Fecha de nacimiento</FieldLabel>
                <div className="flex gap-2 md:gap-3">
                    <input type="number" placeholder="DD" value={value.day}
                        onChange={e => set({ day: e.target.value })}
                        className="input-field text-center px-2 flex-1 min-w-[60px]" />
                    <input type="number" placeholder="MM" value={value.month}
                        onChange={e => set({ month: e.target.value })}
                        className="input-field text-center px-2 flex-1 min-w-[60px]" />
                    <input type="number" placeholder="AAAA" value={value.year}
                        onChange={e => set({ year: e.target.value })}
                        className="input-field text-center px-2 flex-[2] min-w-[80px]" />
                </div>
            </div>

            {/* Hora */}
            <div className="flex flex-col gap-2">
                <FieldLabel>Hora de nacimiento (24h)</FieldLabel>
                <div className="flex gap-2 items-center">
                    <input type="number" placeholder="HH" value={value.hour}
                        disabled={value.timeUnknown}
                        onChange={e => set({ hour: e.target.value })}
                        className="input-field text-center disabled:opacity-30" />
                    <span className="text-white/20">:</span>
                    <input type="number" placeholder="MM" value={value.minute}
                        disabled={value.timeUnknown}
                        onChange={e => set({ minute: e.target.value })}
                        className="input-field text-center disabled:opacity-30" />
                </div>
                <button
                    type="button"
                    onClick={() => set({ timeUnknown: !value.timeUnknown })}
                    className={`self-start flex items-center gap-2 px-3 py-1.5 max-md:min-h-[40px] rounded-full border text-xs transition-all ${value.timeUnknown
                        ? 'border-[var(--accent-gold)]/50 text-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                        : 'border-white/10 text-white/50 hover:text-white/80 hover:border-white/25'
                        }`}
                >
                    <Clock className="w-3.5 h-3.5" />
                    Hora desconocida
                </button>
                {value.timeUnknown && (
                    <p className="text-xs text-white/40">
                        Se usa mediodía (12:00) como referencia: casas y ascendente dejan de ser confiables.
                    </p>
                )}
            </div>

            {/* Ciudad con autocomplete */}
            <div className="flex flex-col gap-2">
                <FieldLabel>Ciudad de nacimiento</FieldLabel>
                <div className="relative z-40">
                    <div className="flex items-center relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar ciudad (ej: Buenos Aires)"
                            value={value.city}
                            onChange={e => {
                                // Tipear invalida la sugerencia elegida (y sus coordenadas)
                                set({ city: e.target.value, latitude: null, longitude: null, timezone: null });
                                searchCity(e.target.value);
                            }}
                            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                            onBlur={() => { setTimeout(() => setShowSuggestions(false), 200); }}
                            className="input-field pl-12 w-full bg-black/50 border-white/10 focus:border-[var(--accent-primary)] transition-all"
                        />
                    </div>

                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0514] border border-white/20 rounded-xl shadow-2xl z-[100] overflow-hidden max-h-60 overflow-y-auto animate-fade-in">
                            {suggestions.map((s, idx) => (
                                <div
                                    key={idx}
                                    onMouseDown={e => { e.preventDefault(); pickSuggestion(s); }}
                                    className="p-3 px-4 hover:bg-white/10 cursor-pointer text-sm text-gray-200 border-b border-white/5 last:border-0 transition-colors flex flex-col"
                                >
                                    <span className="font-medium text-white">{s.displayName.split(',')[0]}</span>
                                    <span className="text-xs text-white/40">{s.displayName}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {hasCoords && (
                    <p className="text-xs text-[var(--accent-secondary)] flex items-center gap-1.5">
                        <MapPinCheck className="w-3.5 h-3.5" />
                        Coordenadas y zona horaria confirmadas
                    </p>
                )}
            </div>

            {onSubmit && (
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={busy}
                    className="w-full btn-primary mt-2 disabled:opacity-50"
                >
                    {busy ? 'Guardando...' : submitLabel}
                </button>
            )}
        </div>
    );
}
