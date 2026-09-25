'use client';

import { useId, useMemo } from 'react';
import { MakeTime, SunPosition, EclipticGeoMoon } from 'astronomy-engine';
import { moonPhaseFromElongation } from '@astrolegia/core/astrology';

// =============================================
// MOON PHASE ICON — Cosmic Luxury
// La fase lunar REAL como icono SVG estático:
// disco hueso con el terminador correcto para la
// elongación Sol–Luna calculada con astronomy-engine.
// =============================================

const PHASE_ES: Record<string, string> = {
    'New Moon': 'Luna Nueva',
    'Waxing Crescent': 'Luna Creciente',
    'First Quarter': 'Cuarto Creciente',
    'Waxing Gibbous': 'Gibosa Creciente',
    'Full Moon': 'Luna Llena',
    'Waning Gibbous': 'Gibosa Menguante',
    'Last Quarter': 'Cuarto Menguante',
    'Waning Crescent': 'Luna Menguante',
};

/**
 * Elongación Sol→Luna en grados (0 = nueva, 180 = llena).
 * Redondeada a 0.5° para que la geometría sea estable dentro de una misma hora
 * (evita mismatches de hidratación por milisegundos de diferencia).
 */
function getElongation(date: Date): number {
    const time = MakeTime(date);
    let diff = EclipticGeoMoon(time).lon - SunPosition(time).elon;
    diff = ((diff % 360) + 360) % 360;
    return Math.round(diff * 2) / 2;
}

/**
 * Path SVG de la porción iluminada del disco lunar.
 * Dos arcos: el limbo (semicírculo del lado iluminado) y el terminador
 * (arco elíptico cuyo semieje menor es r·|cos(elongación)|).
 * Devuelve null alrededor de la luna nueva (nada visible iluminado).
 */
function litPath(elongation: number, cx: number, cy: number, r: number): string | null {
    const e = ((elongation % 360) + 360) % 360;
    if (e < 4 || e > 356) return null;

    const cos = Math.cos((e * Math.PI) / 180);
    const rx = Math.max(Math.abs(cos) * r, 0.4); // arcos degenerados en cuartos exactos
    const waxing = e < 180;
    // Creciente: iluminada a la derecha. Menguante: a la izquierda.
    const limbSweep = waxing ? 1 : 0;
    // Creciente fina (cos > 0): el terminador se curva hacia el lado iluminado.
    // Gibosa (cos < 0): se curva hacia el lado oscuro.
    const termSweep = cos > 0 ? 1 - limbSweep : limbSweep;

    return [
        `M ${cx} ${cy - r}`,
        `A ${r} ${r} 0 0 ${limbSweep} ${cx} ${cy + r}`,
        `A ${rx.toFixed(2)} ${r} 0 0 ${termSweep} ${cx} ${cy - r}`,
        'Z',
    ].join(' ');
}

export interface MoonPhaseIconProps {
    /** Fecha para la cual calcular la fase. Default: ahora. */
    date?: Date;
    /** Tamaño en px. */
    size?: number;
    /** Halo dorado tenue detrás del disco. */
    withHalo?: boolean;
    className?: string;
    /** Si es decorativo (hay texto adyacente que ya describe la fase). */
    decorative?: boolean;
}

export default function MoonPhaseIcon({
    date,
    size = 24,
    withHalo = true,
    className,
    decorative = false,
}: MoonPhaseIconProps) {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');

    const { elongation, label } = useMemo(() => {
        const d = date ?? new Date();
        const elong = getElongation(d);
        const { phase } = moonPhaseFromElongation(elong);
        return { elongation: elong, label: PHASE_ES[phase] ?? phase };
    }, [date]);

    const C = 16; // centro
    const R = 11; // radio del disco
    const lit = litPath(elongation, C, C, R);

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            className={className}
            {...(decorative
                ? { 'aria-hidden': true as const }
                : { role: 'img', 'aria-label': `Fase lunar: ${label}` })}
        >
            {!decorative && <title>{`Fase lunar: ${label}`}</title>}
            <defs>
                <radialGradient id={`${uid}-halo`} cx="50%" cy="50%" r="50%">
                    <stop offset="55%" stopColor="var(--accent-gold)" stopOpacity="0.16" />
                    <stop offset="80%" stopColor="var(--accent-gold)" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="var(--accent-gold)" stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`${uid}-lit`} cx="42%" cy="38%" r="75%">
                    <stop offset="0%" stopColor="#fdf9ee" />
                    <stop offset="70%" stopColor="#efe6cd" />
                    <stop offset="100%" stopColor="#ddd2b2" />
                </radialGradient>
                {lit && (
                    <clipPath id={`${uid}-clip`}>
                        <path d={lit} />
                    </clipPath>
                )}
            </defs>

            {/* Halo tenue */}
            {withHalo && <circle cx={C} cy={C} r={15.5} fill={`url(#${uid}-halo)`} />}

            {/* Lado oscuro del disco */}
            <circle
                cx={C}
                cy={C}
                r={R}
                fill="rgba(244, 239, 225, 0.08)"
                stroke="rgba(244, 239, 225, 0.22)"
                strokeWidth="0.75"
            />

            {/* Porción iluminada (color hueso) */}
            {lit && (
                <>
                    <path d={lit} fill={`url(#${uid}-lit)`} />
                    {/* Mares/cráteres sutiles, recortados a la zona iluminada */}
                    <g clipPath={`url(#${uid}-clip)`} fill="rgba(3, 3, 11, 0.09)">
                        <circle cx="12.5" cy="12" r="2.4" />
                        <circle cx="20" cy="18.5" r="3" />
                        <circle cx="14" cy="21" r="1.6" />
                        <circle cx="19.5" cy="9.5" r="1.3" />
                    </g>
                </>
            )}
        </svg>
    );
}
