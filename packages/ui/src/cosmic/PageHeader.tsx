/**
 * Encabezado de página del sistema "Cosmic Luxury": label uppercase con
 * tracking amplio en color de acento + título clamp en Space Grotesk +
 * subtítulo muted. Es el patrón repetido en toda la app, extraído como
 * componente único.
 */

import { ACCENT_TEXT, type SystemAccent } from './accents';

export interface PageHeaderProps {
    label: string;
    title: string;
    subtitle?: string;
    accent?: SystemAccent;
    /** Alineación del bloque (las páginas de detalle suelen usar 'left'). */
    align?: 'center' | 'left';
    className?: string;
}

export const PageHeader = ({
    label,
    title,
    subtitle,
    accent = 'primary',
    align = 'center',
    className = '',
}: PageHeaderProps) => (
    <header className={`mb-12 ${align === 'center' ? 'text-center' : 'text-left'} ${className}`}>
        <span className={`text-xs uppercase tracking-[4px] ${ACCENT_TEXT[accent]}`}>
            {label}
        </span>
        <h1 className="font-heading mt-2 mb-4 text-[clamp(2rem,5vw,3rem)] font-bold text-white">
            {title}
        </h1>
        {subtitle && (
            <p className={`mb-0 max-w-[500px] leading-relaxed text-white/60 ${align === 'center' ? 'mx-auto' : ''}`}>
                {subtitle}
            </p>
        )}
    </header>
);

export default PageHeader;
