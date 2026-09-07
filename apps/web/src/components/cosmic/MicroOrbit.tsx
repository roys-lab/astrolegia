'use client';

import type { CSSProperties } from 'react';

// =============================================
// MICRO ORBIT — Cosmic Luxury
// Punto de luz que recorre el borde de una card en hover.
// CSS puro: pseudo-elementos con offset-path: rect(... round r)
// animando offset-distance. Cero costo en idle:
// la animación solo existe bajo .group:hover, gated por
// @media (hover: hover) + prefers-reduced-motion + @supports.
// Colocar dentro de una card con clase .group y position relative
// (la card .glass ya cumple ambas).
// =============================================

const CSS = `
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
    @supports (offset-path: rect(0% 100% 100% 0%)) {
        .micro-orbit {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 1;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .micro-orbit::before,
        .micro-orbit::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            border-radius: 9999px;
            offset-path: rect(0% 100% 100% 0% round var(--mo-radius, 24px));
            offset-rotate: 0deg;
            offset-distance: 0%;
        }
        .micro-orbit::before {
            width: 5px;
            height: 5px;
            background: var(--mo-color, var(--accent-secondary));
            box-shadow: 0 0 6px var(--mo-color, var(--accent-secondary)),
                        0 0 14px var(--mo-color, var(--accent-secondary));
        }
        /* Estela: mismo recorrido, apenas retrasada y desvanecida */
        .micro-orbit::after {
            width: 3px;
            height: 3px;
            margin: 1px;
            background: var(--mo-color, var(--accent-secondary));
            opacity: 0.4;
        }
        .group:hover .micro-orbit {
            opacity: 1;
        }
        .group:hover .micro-orbit::before {
            animation: micro-orbit-travel 2.8s linear infinite;
        }
        .group:hover .micro-orbit::after {
            animation: micro-orbit-travel 2.8s linear infinite;
            animation-delay: -2.72s;
        }
    }
}
@keyframes micro-orbit-travel {
    from { offset-distance: 0%; }
    to { offset-distance: 100%; }
}
`;

export interface MicroOrbitProps {
    /** Color del punto de luz. Default: var(--accent-secondary). */
    color?: string;
    /** Radio del borde de la card en px (glass = 24). */
    radius?: number;
}

export default function MicroOrbit({ color = 'var(--accent-secondary)', radius = 24 }: MicroOrbitProps) {
    return (
        <>
            <span
                aria-hidden
                className="micro-orbit"
                style={{ '--mo-color': color, '--mo-radius': `${radius}px` } as CSSProperties}
            />
            <style>{CSS}</style>
        </>
    );
}
