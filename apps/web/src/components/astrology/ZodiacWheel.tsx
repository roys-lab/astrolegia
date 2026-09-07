"use client";

/**
 * ZodiacWheel — la rueda zodiacal propia de Astrolegia.
 *
 * SVG responsive (viewBox cuadrado, width 100%) dibujado desde el chart_data
 * ya guardado — cero llamadas a la API:
 * - Anillo exterior con los 12 glifos de signos, coloreados por elemento.
 * - Anillo de casas con numerales romanos tenues y ASC/MC marcados.
 * - Planetas como glifos Unicode posicionados por longitud absoluta, con
 *   anti-colisión radial (escalones hacia adentro).
 * - Aspectos como cuerdas coloreadas por naturaleza (armónicos azul, tensos
 *   magenta, conjunciones oro), con opacidad según exactitud del orbe.
 *
 * Entrada animada con framer-motion: los anillos se "dibujan" (pathLength) y
 * los planetas hacen fade+scale escalonado. Hover/focus en un planeta resalta
 * sus aspectos (el resto baja a opacity 0.08) y muestra un tooltip
 * ('Sol 24°52′ Piscis · Casa 9'). prefers-reduced-motion → sin animación.
 */

import { useId, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
    extractChartBodies,
    getAbsolutePosition,
    formatPosition,
    BODY_WHITELIST,
} from '@astrolegia/core/astrology';
import {
    signArcs,
    annularSectorPath,
    pointOnWheel,
    chartAngle,
    polarToCartesian,
    placeBodies,
    extractHouseCusps,
    houseMidpoints,
    extractWheelAspects,
    elementOfAbsPos,
    PLANET_GLYPHS,
    ROMAN_NUMERALS,
    type ZodiacElement,
    type AspectNature,
} from '@astrolegia/core/astrology';

// ==================== GEOMETRÍA (viewBox 600×600) ====================

const S = 600;
const C = S / 2;
const R_OUTER = 292;       // borde exterior del anillo de signos
const R_SIGN_INNER = 252;  // borde interior del anillo de signos
const R_GLYPH = 272;       // radio de los glifos de signos
const R_HOUSE_INNER = 222; // borde interior del anillo de casas
const R_NUMERAL = 237;     // numerales romanos
const R_PLANET = 190;      // radio base de los planetas
const PLANET_STEP = 26;    // escalón radial anti-colisión
const R_ASPECT = 132;      // círculo interior donde viven las cuerdas

// ==================== COLOR (Cosmic Luxury) ====================

const ELEMENT_COLOR: Record<ZodiacElement, string> = {
    fire: 'var(--accent-primary)',    // magenta
    earth: 'var(--accent-gold)',      // oro
    air: 'var(--accent-secondary)',   // azul
    water: '#c77dff',                 // violeta
};

const NATURE_COLOR: Record<AspectNature, string> = {
    harmonic: 'var(--accent-secondary)', // trígonos / sextiles
    tense: 'var(--accent-primary)',      // cuadraturas / oposiciones
    neutral: 'var(--accent-gold)',       // conjunciones
};

const HEADING_FONT = 'var(--font-heading)';
const DIMMED_ASPECT_OPACITY = 0.08;

export interface ZodiacWheelProps {
    /** chart_data.subject crudo de la API (ya guardado). */
    subject: unknown;
    /** chart_data.aspects crudo de la API (ya guardado). */
    aspects?: unknown;
    /** Ancho máximo del wrapper en px; el SVG siempre es fluido (width 100%). */
    size?: number;
    className?: string;
}

export default function ZodiacWheel({ subject, aspects, size, className = '' }: ZodiacWheelProps) {
    const reduceMotion = useReducedMotion();
    const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const wheel = useMemo(() => {
        const bodies = extractChartBodies(subject);
        const record = subject && typeof subject === 'object' && !Array.isArray(subject)
            ? subject as Record<string, unknown>
            : null;
        const cusps = extractHouseCusps(subject);
        const ascAbsPos = getAbsolutePosition(record?.first_house) ?? cusps?.[0] ?? null;
        // ASC al oeste (convención clásica); sin ASC, 0° Aries a la izquierda
        const rotation = ascAbsPos ?? 0;

        const placed = placeBodies(bodies).map(body => ({
            ...body,
            point: pointOnWheel(C, C, R_PLANET - body.level * PLANET_STEP, body.absPos, rotation),
            anchor: pointOnWheel(C, C, R_ASPECT, body.absPos, rotation),
            element: elementOfAbsPos(body.absPos),
            angle: chartAngle(body.absPos, rotation),
        }));

        // Claves del subject por cuerpo dibujado, para matchear p1_name/p2_name
        // de los aspectos ('True_North_Lunar_Node' → 'true_north_lunar_node')
        const keysById = new Map(placed.map(body => [
            body.id,
            BODY_WHITELIST.find(def => def.id === body.id)?.keys ?? [body.id],
        ]));
        const wheelAspects = extractWheelAspects(aspects, Array.from(keysById.values()).flat());

        return { placed, rotation, cusps, hasAsc: ascAbsPos !== null, keysById, wheelAspects };
    }, [subject, aspects]);

    if (wheel.placed.length === 0) return null;

    const { placed, rotation, cusps, wheelAspects, keysById } = wheel;
    const hoveredBody = hoveredId ? placed.find(b => b.id === hoveredId) ?? null : null;
    const hoveredKeys = hoveredBody ? new Set(keysById.get(hoveredBody.id)) : null;
    const aspectInvolvesHovered = (p1Name: string, p2Name: string) =>
        hoveredKeys !== null
        && (hoveredKeys.has(p1Name.toLowerCase()) || hoveredKeys.has(p2Name.toLowerCase()));

    // framer-motion: initial={false} salta la animación de entrada
    const entry = reduceMotion ? false : undefined;
    const arcs = signArcs(rotation);
    const numeralAngles = cusps ? houseMidpoints(cusps).map(mid => chartAngle(mid, rotation)) : null;

    const tooltip = hoveredBody ? {
        x: hoveredBody.point.x,
        y: hoveredBody.point.y,
        label: hoveredBody.label,
        detail: [
            formatPosition(hoveredBody.absPos),
            hoveredBody.house !== null ? `Casa ${hoveredBody.house}` : null,
            hoveredBody.retrograde ? '℞' : null,
        ].filter(Boolean).join(' · '),
    } : null;

    return (
        <div
            className={`relative w-full mx-auto ${className}`}
            style={size ? { maxWidth: size } : undefined}
        >
            <svg
                viewBox={`0 0 ${S} ${S}`}
                width="100%"
                role="img"
                aria-label="Rueda zodiacal de la carta natal"
                className="block select-none"
            >
                <defs>
                    <radialGradient id={`zw-bg-${gradientId}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(10, 10, 31, 0)" />
                        <stop offset="72%" stopColor="rgba(10, 10, 31, 0.55)" />
                        <stop offset="100%" stopColor="rgba(3, 3, 11, 0.9)" />
                    </radialGradient>
                </defs>

                {/* Fondo nebular sutil */}
                <circle cx={C} cy={C} r={R_OUTER} fill={`url(#zw-bg-${gradientId})`} />

                {/* Anillos: se "dibujan" con pathLength al entrar */}
                {[
                    { r: R_OUTER, stroke: 'rgba(255, 255, 255, 0.16)', width: 1.5, delay: 0 },
                    { r: R_SIGN_INNER, stroke: 'rgba(255, 255, 255, 0.1)', width: 1, delay: 0.12 },
                    { r: R_HOUSE_INNER, stroke: 'rgba(255, 255, 255, 0.1)', width: 1, delay: 0.24 },
                    { r: R_ASPECT, stroke: 'rgba(255, 255, 255, 0.08)', width: 1, delay: 0.36 },
                ].map(ring => (
                    <motion.circle
                        key={ring.r}
                        cx={C}
                        cy={C}
                        r={ring.r}
                        fill="none"
                        stroke={ring.stroke}
                        strokeWidth={ring.width}
                        initial={entry ?? { pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.1, delay: ring.delay, ease: 'easeInOut' }}
                    />
                ))}

                {/* Anillo de signos: sectores por elemento + separadores + glifos */}
                <motion.g
                    initial={entry ?? { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
                >
                    {arcs.map(arc => {
                        const glyphPos = polarToCartesian(C, C, R_GLYPH, arc.midAngle);
                        const sepStart = polarToCartesian(C, C, R_SIGN_INNER, arc.startAngle);
                        const sepEnd = polarToCartesian(C, C, R_OUTER, arc.startAngle);
                        const color = ELEMENT_COLOR[arc.element];
                        return (
                            <g key={arc.index}>
                                <path
                                    d={annularSectorPath(C, C, R_OUTER, R_SIGN_INNER, arc.startAngle, arc.endAngle)}
                                    fill={color}
                                    fillOpacity={0.05}
                                />
                                <line
                                    x1={sepStart.x} y1={sepStart.y}
                                    x2={sepEnd.x} y2={sepEnd.y}
                                    stroke="rgba(255, 255, 255, 0.1)"
                                    strokeWidth={1}
                                />
                                <text
                                    x={glyphPos.x} y={glyphPos.y}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize={20}
                                    fill={color}
                                    opacity={0.85}
                                    style={{ fontFamily: HEADING_FONT }}
                                >
                                    {arc.glyph}
                                </text>
                            </g>
                        );
                    })}
                </motion.g>

                {/* Anillo de casas: cúspides + numerales romanos, ASC/MC marcados */}
                {cusps && (
                    <motion.g
                        initial={entry ?? { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.7, delay: 0.55, ease: 'easeOut' }}
                    >
                        {cusps.map((cusp, i) => {
                            const isAxis = i === 0 || i === 9; // ASC / MC
                            const angle = chartAngle(cusp, rotation);
                            const from = polarToCartesian(C, C, R_ASPECT, angle);
                            const to = polarToCartesian(C, C, R_SIGN_INNER, angle);
                            return (
                                <line
                                    key={`cusp-${i}`}
                                    x1={from.x} y1={from.y}
                                    x2={to.x} y2={to.y}
                                    stroke={isAxis ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.1)'}
                                    strokeWidth={isAxis ? 1.8 : 1}
                                />
                            );
                        })}
                        {([[0, 'ASC'], [9, 'MC']] as const).map(([i, label]) => {
                            const pos = polarToCartesian(C, C, R_ASPECT - 16, chartAngle(cusps[i], rotation) + 7);
                            return (
                                <text
                                    key={label}
                                    x={pos.x} y={pos.y}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize={10}
                                    letterSpacing={1}
                                    fill="rgba(255, 255, 255, 0.45)"
                                    style={{ fontFamily: HEADING_FONT }}
                                >
                                    {label}
                                </text>
                            );
                        })}
                        {numeralAngles?.map((angle, i) => {
                            const pos = polarToCartesian(C, C, R_NUMERAL, angle);
                            return (
                                <text
                                    key={`numeral-${i}`}
                                    x={pos.x} y={pos.y}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize={11}
                                    fill="rgba(255, 255, 255, 0.25)"
                                    style={{ fontFamily: HEADING_FONT }}
                                >
                                    {ROMAN_NUMERALS[i]}
                                </text>
                            );
                        })}
                    </motion.g>
                )}

                {/* Aspectos: cuerdas entre planetas, color por naturaleza */}
                <motion.g
                    initial={entry ?? { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 1, ease: 'easeOut' }}
                >
                    {wheelAspects.map((aspect, i) => {
                        const p1 = pointOnWheel(C, C, R_ASPECT, aspect.p1AbsPos, rotation);
                        const p2 = pointOnWheel(C, C, R_ASPECT, aspect.p2AbsPos, rotation);
                        const highlighted = aspectInvolvesHovered(aspect.p1Name, aspect.p2Name);
                        const opacity = hoveredKeys === null
                            ? aspect.opacity
                            : highlighted ? Math.max(aspect.opacity, 0.9) : DIMMED_ASPECT_OPACITY;
                        return (
                            <line
                                key={`${aspect.p1Name}-${aspect.p2Name}-${i}`}
                                x1={p1.x} y1={p1.y}
                                x2={p2.x} y2={p2.y}
                                stroke={NATURE_COLOR[aspect.nature]}
                                strokeWidth={aspect.type === 'conjunction' ? 2.2 : highlighted ? 1.9 : 1.4}
                                strokeLinecap="round"
                                opacity={opacity}
                                style={{ transition: 'opacity 0.2s ease, stroke-width 0.2s ease' }}
                            />
                        );
                    })}
                </motion.g>

                {/* Planetas: fade + scale escalonado */}
                {placed.map((body, i) => {
                    const glyph = PLANET_GLYPHS[body.id] ?? '✦';
                    const color = ELEMENT_COLOR[body.element];
                    const tickOuter = polarToCartesian(C, C, R_HOUSE_INNER, body.angle);
                    const tickInner = polarToCartesian(C, C, R_HOUSE_INNER - 8, body.angle);
                    const label = [
                        body.label,
                        formatPosition(body.absPos),
                        body.house !== null ? `Casa ${body.house}` : null,
                    ].filter(Boolean).join(' ');
                    return (
                        <g key={body.id}>
                            {/* Marca en el borde del anillo de casas */}
                            <motion.line
                                x1={tickOuter.x} y1={tickOuter.y}
                                x2={tickInner.x} y2={tickInner.y}
                                stroke="rgba(255, 255, 255, 0.3)"
                                strokeWidth={1.2}
                                initial={entry ?? { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.7 + i * 0.05 }}
                            />
                            <motion.g
                                initial={entry ?? { opacity: 0, scale: 0.4 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                    duration: 0.45,
                                    delay: reduceMotion ? 0 : 0.7 + i * 0.05,
                                    ease: 'easeOut',
                                }}
                                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                            >
                            <motion.g
                                whileHover={reduceMotion ? undefined : { scale: 1.18 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                style={{ transformBox: 'fill-box', transformOrigin: 'center', cursor: 'pointer' }}
                                tabIndex={0}
                                role="img"
                                aria-label={label}
                                onMouseEnter={() => setHoveredId(body.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                onFocus={() => setHoveredId(body.id)}
                                onBlur={() => setHoveredId(null)}
                                // Touch: el tap muestra/oculta el tooltip (preventDefault evita
                                // los eventos mouse/focus sintéticos que lo re-abrirían).
                                onPointerDown={(e) => {
                                    if (e.pointerType === 'touch') {
                                        e.preventDefault();
                                        setHoveredId(prev => (prev === body.id ? null : body.id));
                                    }
                                }}
                            >
                                <circle
                                    cx={body.point.x} cy={body.point.y} r={12}
                                    fill={color}
                                    opacity={hoveredId === body.id ? 0.28 : 0.12}
                                    style={{ transition: 'opacity 0.2s ease' }}
                                />
                                <text
                                    x={body.point.x} y={body.point.y}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize={17}
                                    fill="rgba(255, 255, 255, 0.92)"
                                    style={{ fontFamily: HEADING_FONT }}
                                >
                                    {glyph}
                                </text>
                                {/* Área de hover generosa */}
                                <circle
                                    cx={body.point.x} cy={body.point.y} r={16}
                                    fill="transparent"
                                />
                            </motion.g>
                            </motion.g>
                        </g>
                    );
                })}
            </svg>

            {/* Tooltip: 'Sol 24°52′ Piscis · Casa 9' */}
            {tooltip && (
                <div
                    className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl border border-white/15 bg-[#0a0a1f]/90 px-3 py-1.5 text-xs shadow-xl backdrop-blur-md"
                    style={{
                        left: `${(tooltip.x / S) * 100}%`,
                        top: `${((tooltip.y - 20) / S) * 100}%`,
                    }}
                >
                    <span className="font-heading font-semibold text-white">{tooltip.label}</span>
                    {tooltip.detail && (
                        <span className="ml-1.5 text-white/70">{tooltip.detail}</span>
                    )}
                </div>
            )}
        </div>
    );
}
