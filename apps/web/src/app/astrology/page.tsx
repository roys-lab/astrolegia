"use client";

import { useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useInView } from 'framer-motion';
import { CalendarDays, Orbit, Rocket, AlertOctagon, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import BackButton from '@/components/BackButton';
import Calendar from '@/components/astrology/Calendar';
import { getPlanetaryPositions, isMercuryRetrograde, findPowerDates, calculateFavorabilityIndex, parseLocalDay, formatLocalDay } from '@astrolegia/core/astrology';
import { GlassCard, PageHeader } from '@astrolegia/ui';

/** Placeholder estático del mismo alto que la esfera (evita layout shift). */
const SpherePlaceholder = () => (
    <div className="relative h-[500px] w-full overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <div className="absolute top-4 left-4 z-10">
            <h3 className="font-heading text-lg text-white">Modelo Celeste 3D</h3>
            <p className="mb-0 text-xs text-white/50">Preparando la esfera celeste...</p>
        </div>
        <div className="bg-stars-local" />
    </div>
);

// three + r3f + drei solo se cargan cuando la esfera entra en escena.
const CelestialSphere = dynamic(() => import('@/components/astrology/CelestialSphere'), {
    ssr: false,
    loading: () => <SpherePlaceholder />,
});

const PLANET_SYMBOLS: Record<string, string> = {
    'Sun': '☉',
    'Moon': '☽',
    'Mercury': '☿',
    'Venus': '♀',
    'Mars': '♂',
    'Jupiter': '♃',
    'Saturn': '♄',
    'Uranus': '♅',
    'Neptune': '♆',
    'Pluto': '♇'
};

const PLANET_NAMES_ES: Record<string, string> = {
    'Sun': 'Sol',
    'Moon': 'Luna',
    'Mercury': 'Mercurio',
    'Venus': 'Venus',
    'Mars': 'Marte',
    'Jupiter': 'Júpiter',
    'Saturn': 'Saturno',
    'Uranus': 'Urano',
    'Neptune': 'Neptuno',
    'Pluto': 'Plutón'
};

const SIGN_NAMES_ES: Record<string, string> = {
    'Aries': 'Aries',
    'Taurus': 'Tauro',
    'Gemini': 'Géminis',
    'Cancer': 'Cáncer',
    'Leo': 'Leo',
    'Virgo': 'Virgo',
    'Libra': 'Libra',
    'Scorpio': 'Escorpio',
    'Sagittarius': 'Sagitario',
    'Capricorn': 'Capricornio',
    'Aquarius': 'Acuario',
    'Pisces': 'Piscis'
};

export default function AstrologyPage() {
    const [date, setDate] = useState(() => formatLocalDay(new Date()));

    const positions = useMemo(() => {
        return getPlanetaryPositions(parseLocalDay(date));
    }, [date]);

    const mercuryIsRetro = useMemo(() => {
        return isMercuryRetrograde(parseLocalDay(date));
    }, [date]);

    // Use the new comprehensive favorability index
    const favorability = useMemo(() => {
        return calculateFavorabilityIndex(parseLocalDay(date));
    }, [date]);

    // Gate de montaje de la esfera 3D: recién cuando se acerca al viewport.
    const sphereRef = useRef<HTMLDivElement>(null);
    const sphereInView = useInView(sphereRef, { once: true, margin: '0px 0px 300px 0px' });

    return (
        <div className="animate-fade pb-32">
            {/* Back link */}
            <BackButton label="Volver al Inicio" />

            {/* Header */}
            <PageHeader
                label="Planificador Cósmico"
                title="Calendario Celestial"
                subtitle="Elegí una fecha para revelar su potencial energético. Sincronizá tus movimientos con los ritmos del universo."
                accent="secondary"
            />

            <div className="mb-8 grid grid-cols-1 gap-6 md:mb-12 md:grid-cols-[repeat(auto-fit,minmax(350px,1fr))] md:gap-8">

                {/* Left Column: Calendar */}
                <div>
                    <h3 className="mb-4 text-[1.2rem] font-semibold text-white">Seleccioná una Fecha</h3>
                    <Calendar
                        selectedDate={parseLocalDay(date)}
                        onDateSelect={(d: Date) => setDate(formatLocalDay(d))}
                    />

                    {/* Legend Note */}
                    <p className="mt-4 mb-0 text-center text-[0.8rem] text-white/40">
                        *Los colores indican la favorabilidad energética de cada día.
                    </p>
                </div>

                {/* Right Column: Key Metrics & Status */}
                <div className="flex flex-col gap-6">

                    {/* Score Card (Compact) — el color de favorabilidad es data-driven */}
                    <GlassCard padded={false} className="overflow-hidden">
                        {/* Borde izquierdo con el color del índice (data-driven). GlassCard no acepta
                            style (.AGENTS §2); el color dinámico queda en este wrapper hasta migrar a
                            clases por nivel de favorabilidad. */}
                        <div
                            className="flex items-center gap-4 border-l-4 p-5 md:gap-6 md:p-6"
                            style={{ borderLeftColor: favorability.color }}
                        >
                            <div
                                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                                style={{ background: `conic-gradient(${favorability.color} ${favorability.score}%, rgba(255,255,255,0.1) ${favorability.score}%)` }}
                            >
                                <div className="flex h-[65px] w-[65px] items-center justify-center rounded-full bg-bg-nebula font-bold tabular-nums text-white">
                                    {favorability.score}%
                                </div>
                            </div>
                            <div>
                                <h4 className="m-0 text-[1.2rem]" style={{ color: favorability.color }}>{favorability.label}</h4>
                                <p className="mt-1 mb-0 text-[0.85rem] text-white/70">{favorability.recommendation}</p>
                            </div>
                        
                        </div>
                    </GlassCard>

                    {/* Retrograde Warning */}
                    <GlassCard padded={false} className="flex items-center justify-between p-5 md:p-6">
                        <div>
                            <h5 className="m-0 text-[0.95rem] text-white">Estado de Mercurio</h5>
                            <p className={`m-0 flex items-center gap-1.5 text-[0.8rem] ${mercuryIsRetro ? 'text-accent-danger' : 'text-green-400'}`}>
                                {mercuryIsRetro
                                    ? <><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Retrógrado: Precaución</>
                                    : <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Directo: Avance fluído</>}
                            </p>
                        </div>
                        <div>
                            {mercuryIsRetro
                                ? <AlertOctagon className="h-7 w-7 text-accent-danger" />
                                : <Rocket className="h-7 w-7 text-accent-secondary" />}
                        </div>
                    </GlassCard>

                    {/* Factor List */}
                    <GlassCard padded={false} className="flex-1 p-5 md:p-6">
                        <h5 className="mb-4 text-[0.85rem] uppercase text-white/50">Factores del Día</h5>
                        <div className="flex flex-col gap-3">
                            {favorability.factors.slice(0, 4).map((f, i) => (
                                <div key={i} className="flex items-center gap-3 text-[0.9rem] text-white/80">
                                    {/* Icono SVG según el signo del impacto (sin emojis, .AGENTS §3) */}
                                    {f.impact > 0
                                        ? <TrendingUp className="h-4 w-4 shrink-0 text-green-400" aria-hidden="true" />
                                        : f.impact < 0
                                            ? <TrendingDown className="h-4 w-4 shrink-0 text-accent-danger" aria-hidden="true" />
                                            : <Minus className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />}
                                    <span>{f.name}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                </div>
            </div>

            {/* Bottom: Planetary Positions & Power Dates */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[repeat(auto-fit,minmax(300px,1fr))] md:gap-8">

                {/* Upcoming Power Dates */}
                <GlassCard>
                    <h3 className="mb-6 flex items-center gap-2 text-base text-accent-gold">
                        <CalendarDays className="h-4 w-4 shrink-0" /> Próximas Fechas de Poder
                    </h3>
                    <div className="flex flex-col gap-4">
                        {findPowerDates(parseLocalDay(date)).slice(0, 3).map((pd, i) => (
                            <div key={i} className="rounded border-l-2 border-accent-gold bg-accent-gold/5 p-4">
                                <div className="mb-1 flex justify-between">
                                    <strong className="text-white">{pd.date.toLocaleDateString()}</strong>
                                    <span className="font-bold tabular-nums text-accent-gold">{Math.round(pd.score)} pts</span>
                                </div>
                                <div className="text-[0.8rem] text-white/60">{pd.reasons.join(', ')}</div>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                {/* Planetary Positions Grid */}
                <div>
                    <h3 className="mb-6 flex items-center gap-2 text-base text-accent-secondary">
                        <Orbit className="h-4 w-4 shrink-0" /> Tránsitos Planetarios
                    </h3>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                        {positions.slice(0, 6).map((p) => (
                            <GlassCard key={p.body} padded={false} className="flex items-center gap-2 px-3 py-3 md:gap-3 md:px-4">
                                <span className="text-[1.2rem] opacity-80">{PLANET_SYMBOLS[p.body]}</span>
                                <div>
                                    <div className="text-[0.85rem] font-semibold text-white">{PLANET_NAMES_ES[p.body]}</div>
                                    <div className="text-xs text-white/50">{SIGN_NAMES_ES[p.sign]} {Math.floor(p.degree)}° {p.isRetrograde && 'Rx'}</div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                </div>

            </div>

            {/* Celestial Sphere Section — se monta recién cerca del viewport */}
            <div ref={sphereRef} className="mt-12">
                {sphereInView ? <CelestialSphere positions={positions} /> : <SpherePlaceholder />}
            </div>

        </div>
    );
}
