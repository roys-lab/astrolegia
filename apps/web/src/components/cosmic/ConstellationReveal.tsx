'use client';

import { Children, useMemo, useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

// =============================================
// CONSTELLATION REVEAL — Cosmic Luxury
// Wrapper de entrada para grids de cards:
// 1. Aparecen puntos-estrella (posiciones seeded por índice — SSR-safe)
// 2. Se conectan con una polilínea animada (stroke-dashoffset vía pathLength)
// 3. Los children hacen fade-up escalonado
// prefers-reduced-motion → fade simple sin constelación.
// =============================================

export interface ConstellationRevealProps {
    children: React.ReactNode;
    /** Clases del contenedor (típicamente el grid). */
    className?: string;
    /** Clases de cada wrapper de item (ej. "h-full"). */
    itemClassName?: string;
    /** Color de estrellas y polilínea. */
    accent?: string;
    /** Porción del contenedor visible para disparar la animación. */
    amount?: number;
}

/** Pseudo-random determinístico por índice — nada de Math.random en render. */
function seeded(i: number, salt: number): number {
    const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
}

const STAR_STAGGER = 0.055;
const STAR_DUR = 0.4;
const LINE_DUR = 0.6;
const CHILD_STAGGER = 0.08;

export default function ConstellationReveal({
    children,
    className,
    itemClassName,
    accent = 'var(--accent-secondary)',
    amount = 0.15,
}: ConstellationRevealProps) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, amount });
    const reduce = useReducedMotion();

    const items = Children.toArray(children);
    const starCount = Math.min(Math.max(items.length, 5), 9);

    const stars = useMemo(
        () =>
            Array.from({ length: starCount }, (_, i) => ({
                x: 6 + seeded(i, 1) * 88,
                y: 8 + seeded(i, 2) * 84,
            })),
        [starCount]
    );

    const lineDelay = starCount * STAR_STAGGER + 0.1;
    const childrenDelay = lineDelay + LINE_DUR * 0.75;

    // reduced-motion: fade simple, sin constelación ni desplazamientos
    if (reduce) {
        return (
            <div ref={ref} className={`relative ${className ?? ''}`}>
                {items.map((child, i) => (
                    <motion.div
                        key={i}
                        className={itemClassName}
                        initial={{ opacity: 0 }}
                        animate={inView ? { opacity: 1 } : {}}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                    >
                        {child}
                    </motion.div>
                ))}
            </div>
        );
    }

    return (
        <div ref={ref} className={`relative ${className ?? ''}`}>
            {/* Overlay de constelación — pointer-events none, se desvanece al final */}
            <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-10"
                initial={{ opacity: 1 }}
                animate={inView ? { opacity: 0 } : {}}
                transition={{ delay: childrenDelay + 1, duration: 0.8, ease: 'easeOut' }}
            >
                <svg
                    className="absolute inset-0 h-full w-full"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                >
                    <motion.polyline
                        points={stars.map(s => `${s.x.toFixed(2)},${s.y.toFixed(2)}`).join(' ')}
                        fill="none"
                        stroke={accent}
                        strokeWidth={1.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        opacity={0.35}
                        initial={{ pathLength: 0 }}
                        animate={inView ? { pathLength: 1 } : {}}
                        transition={{ delay: lineDelay, duration: LINE_DUR, ease: 'easeInOut' }}
                    />
                </svg>
                {stars.map((s, i) => (
                    <motion.span
                        key={i}
                        className="absolute h-[5px] w-[5px] rounded-full bg-white"
                        style={{
                            left: `${s.x}%`,
                            top: `${s.y}%`,
                            marginLeft: -2.5,
                            marginTop: -2.5,
                            boxShadow: `0 0 8px ${accent}, 0 0 16px rgba(255, 255, 255, 0.35)`,
                        }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={inView ? { opacity: [0, 1, 0.8], scale: [0, 1.3, 1] } : {}}
                        transition={{ delay: i * STAR_STAGGER, duration: STAR_DUR, ease: 'easeOut' }}
                    />
                ))}
            </motion.div>

            {/* Children con fade-up escalonado, después de la constelación */}
            {items.map((child, i) => (
                <motion.div
                    key={i}
                    className={itemClassName}
                    initial={{ opacity: 0, y: 24 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{
                        delay: childrenDelay + i * CHILD_STAGGER,
                        duration: 0.55,
                        ease: 'easeOut',
                    }}
                >
                    {child}
                </motion.div>
            ))}
        </div>
    );
}
