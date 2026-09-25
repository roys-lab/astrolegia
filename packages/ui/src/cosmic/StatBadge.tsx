import type { ReactNode } from 'react';
import { ACCENT_TEXT, type SystemAccent } from './accents';

/**
 * Chip de dato del sistema "Cosmic Luxury": valor tabular destacado sobre
 * label chico uppercase. Para grillas de métricas rápidas dentro de cards.
 */
export interface StatBadgeProps {
    label: string;
    value: ReactNode;
    /** Color del valor; sin acento queda blanco. */
    accent?: SystemAccent;
    className?: string;
    /** Override puntual del color/estilo del valor (p. ej. estados semánticos). */
    valueClassName?: string;
}

export const StatBadge = ({ label, value, accent, className = '', valueClassName = '' }: StatBadgeProps) => (
    <div className={`rounded-lg bg-black/20 p-2 text-center ${className}`}>
        <span className={`block font-heading text-xl font-bold tabular-nums ${accent ? ACCENT_TEXT[accent] : 'text-white'} ${valueClassName}`}>
            {value}
        </span>
        <span className="text-[0.65rem] uppercase tracking-wider text-white/40">
            {label}
        </span>
    </div>
);
