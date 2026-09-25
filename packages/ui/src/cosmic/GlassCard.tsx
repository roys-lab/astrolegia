import type { ReactNode } from 'react';
import { ACCENT_BORDER_L, type SystemAccent } from './accents';

/**
 * Card base del sistema "Cosmic Luxury": superficie `.glass` (blur 20px,
 * radio 24px) con tinte nebular y borde izquierdo de acento opcional.
 *
 * La clase `.glass` y los colores `accent-*` los define la hoja de estilos de
 * cada frontend (en apps/web: src/app/globals.css + tailwind.config.js), según
 * la regla de CSS desacoplado por app (docs/technology/04-design-system.md).
 * No expone `style`: los estilos inline están prohibidos (.AGENTS §2).
 */
export interface GlassCardProps {
    children: ReactNode;
    className?: string;
    /** false => sin padding interno (listas edge-to-edge, padding custom). */
    padded?: boolean;
    /** Borde izquierdo de 3px en el color de acento del sistema. */
    accent?: SystemAccent;
}

export const GlassCard = ({ children, className = '', padded = true, accent }: GlassCardProps) => (
    <div
        className={`glass ${padded ? 'p-6 md:p-8' : ''} border border-white/5 bg-[#0a0514]/80 ${accent ? ACCENT_BORDER_L[accent] : ''} ${className}`}
    >
        {children}
    </div>
);
