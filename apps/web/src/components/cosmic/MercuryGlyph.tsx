'use client';

// =============================================
// MERCURY GLYPH — Cosmic Luxury
// El glifo ☿ estilizado como texto (font-heading,
// variation selector de texto para evitar render emoji)
// con glow sutil en el color de acento.
// =============================================

export interface MercuryGlyphProps {
    /** Tamaño de fuente en px. */
    size?: number;
    /** Color del glifo. Default: var(--accent-primary). */
    color?: string;
    /** Muestra el sufijo "Rx" de retrogradación. */
    retrograde?: boolean;
    /** Si es decorativo (hay texto adyacente que ya describe el estado). */
    decorative?: boolean;
    className?: string;
}

export default function MercuryGlyph({
    size = 18,
    color = 'var(--accent-primary)',
    retrograde = false,
    decorative = false,
    className,
}: MercuryGlyphProps) {
    return (
        <span
            className={`font-heading inline-flex items-baseline gap-0.5 leading-none select-none ${className ?? ''}`}
            style={{
                color,
                fontSize: size,
                // Glow sutil que sigue al color del glifo (accent-primary por defecto)
                textShadow: '0 0 10px currentColor',
            }}
            {...(decorative
                ? { 'aria-hidden': true as const }
                : {
                      role: 'img',
                      'aria-label': retrograde ? 'Mercurio retrógrado' : 'Mercurio directo',
                  })}
        >
            {/* U+263F + VS15 fuerza presentación de texto (nunca emoji) */}
            {'☿︎'}
            {retrograde && (
                <span className="text-[0.5em] font-bold tracking-widest" aria-hidden>
                    Rx
                </span>
            )}
        </span>
    );
}
