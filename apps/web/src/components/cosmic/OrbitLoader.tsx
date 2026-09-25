'use client';

// =============================================
// ORBIT LOADER — Cosmic Luxury
// Loader temático: núcleo dorado con puntos-planeta
// orbitando (CSS transform rotate, trails por opacidad).
// prefers-reduced-motion → tres puntos con pulso suave.
// =============================================

export type OrbitLoaderSize = 'sm' | 'md' | 'lg';

export interface OrbitLoaderProps {
    size?: OrbitLoaderSize;
    className?: string;
    /** Etiqueta accesible. Default: "Cargando". */
    label?: string;
}

const CSS = `
.cosmic-orbit-loader {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
}
.cosmic-orbit-loader--sm { width: 28px; height: 28px; --co-dot: 4px; --co-core: 8px; }
.cosmic-orbit-loader--md { width: 44px; height: 44px; --co-dot: 5px; --co-core: 12px; }
.cosmic-orbit-loader--lg { width: 64px; height: 64px; --co-dot: 7px; --co-core: 16px; }

.co-core {
    position: absolute;
    width: var(--co-core);
    height: var(--co-core);
    border-radius: 9999px;
    background: radial-gradient(circle at 35% 35%, #fff6cc, var(--accent-gold) 60%, rgba(255, 215, 0, 0.4));
    box-shadow: 0 0 8px rgb(var(--accent-gold-rgb) / 0.75), 0 0 22px rgb(var(--accent-gold-rgb) / 0.3);
}

.co-ring {
    position: absolute;
    border-radius: 9999px;
    animation: co-spin var(--co-speed, 1.6s) linear infinite;
    will-change: transform;
}
.co-ring::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    border: 1px solid rgba(255, 255, 255, 0.07);
}
.co-ring--a { inset: 0;   --co-speed: 1.6s; --co-color: var(--accent-secondary); }
.co-ring--b { inset: 17%; --co-speed: 2.5s; --co-color: var(--accent-primary); animation-direction: reverse; }
.co-ring--c { inset: 34%; --co-speed: 1.1s; --co-color: #c77dff; }
.cosmic-orbit-loader--sm .co-ring--c { display: none; }

.co-orbiter-layer {
    position: absolute;
    inset: 0;
}
.co-orbiter {
    position: absolute;
    top: 0;
    left: 50%;
    width: var(--co-dot);
    height: var(--co-dot);
    margin-left: calc(var(--co-dot) / -2);
    margin-top: calc(var(--co-dot) / -2);
    border-radius: 9999px;
    background: var(--co-color);
    box-shadow: 0 0 6px var(--co-color);
}
/* Trails: mismos puntos, desfasados angularmente y desvanecidos */
.co-trail--1 { transform: rotate(-17deg); }
.co-trail--1 .co-orbiter { opacity: 0.45; transform: scale(0.75); box-shadow: none; }
.co-trail--2 { transform: rotate(-32deg); }
.co-trail--2 .co-orbiter { opacity: 0.18; transform: scale(0.55); box-shadow: none; }

.co-static { display: none; }

@keyframes co-spin {
    to { transform: rotate(360deg); }
}
@keyframes co-pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.9; }
}

@media (prefers-reduced-motion: reduce) {
    .co-ring, .co-core { display: none; }
    .co-static {
        display: flex;
        gap: calc(var(--co-dot) * 1.1);
    }
    .co-static span {
        width: var(--co-dot);
        height: var(--co-dot);
        border-radius: 9999px;
        animation: co-pulse 2.6s ease-in-out infinite;
    }
    .co-static span:nth-child(1) { background: var(--accent-secondary); }
    .co-static span:nth-child(2) { background: var(--accent-gold); animation-delay: 0.4s; }
    .co-static span:nth-child(3) { background: var(--accent-primary); animation-delay: 0.8s; }
}
`;

function Ring({ variant }: { variant: 'a' | 'b' | 'c' }) {
    return (
        <span className={`co-ring co-ring--${variant}`} aria-hidden>
            <span className="co-orbiter-layer">
                <span className="co-orbiter" />
            </span>
            <span className="co-orbiter-layer co-trail--1">
                <span className="co-orbiter" />
            </span>
            <span className="co-orbiter-layer co-trail--2">
                <span className="co-orbiter" />
            </span>
        </span>
    );
}

export default function OrbitLoader({ size = 'md', className, label = 'Cargando' }: OrbitLoaderProps) {
    return (
        <span
            role="status"
            aria-label={label}
            className={`cosmic-orbit-loader cosmic-orbit-loader--${size} ${className ?? ''}`}
        >
            <span className="co-core" aria-hidden />
            <Ring variant="a" />
            <Ring variant="b" />
            <Ring variant="c" />
            {/* Fallback reduced-motion: tres puntos con pulso suave */}
            <span className="co-static" aria-hidden>
                <span />
                <span />
                <span />
            </span>
            <style>{CSS}</style>
        </span>
    );
}
