'use client';

/**
 * HOLA, UNIVERSO — hero de la landing.
 *
 * El primer programa que escribe cualquier persona es un saludo al mundo.
 * Acá el saludo recibe respuesta: se tipea `> hola, universo` en una
 * terminal, el texto estalla en estrellas y el universo contesta con el
 * cielo REAL de este instante (Luna, Mercurio y Sol calculados con el
 * motor de efemérides de la app) antes de revelar la marca.
 *
 * Secuencia: typing → burst → reveal. Un click/tap la saltea;
 * prefers-reduced-motion va directo al reveal.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import AstrolegiaLogo from '@/components/AstrolegiaLogo';
import MoonPhaseIcon from '@/components/cosmic/MoonPhaseIcon';
import { getMoonPhase, getPlanetaryPositions, isMercuryRetrograde } from '@astrolegia/core/astrology';
import { translateSign } from '@astrolegia/core/astrology';

const TYPED_TEXT = '> hola, universo';

const MOON_PHASE_ES: Record<string, string> = {
    'New Moon': 'Luna nueva',
    'Waxing Crescent': 'Luna creciente',
    'First Quarter': 'Cuarto creciente',
    'Waxing Gibbous': 'Gibosa creciente',
    'Full Moon': 'Luna llena',
    'Waning Gibbous': 'Gibosa menguante',
    'Last Quarter': 'Cuarto menguante',
    'Waning Crescent': 'Luna menguante',
};

interface SkyNow {
    moonPhaseEs: string;
    mercuryRetro: boolean;
    sunSignEs: string;
    sunDegree: number;
}

/** PRNG determinista para estrellas y partículas (SSR-safe, sin Math.random en render). */
function seeded(i: number): number {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

type Phase = 'typing' | 'burst' | 'reveal';

export default function HolaUniversoHero() {
    const reducedMotion = useReducedMotion();
    const [phase, setPhase] = useState<Phase>('typing');
    const [typedCount, setTypedCount] = useState(0);
    const [sky, setSky] = useState<SkyNow | null>(null);

    // ------- el universo responde: cielo real de este instante -------
    useEffect(() => {
        try {
            const now = new Date();
            const moon = getMoonPhase(now);
            const sun = getPlanetaryPositions(now).find(p => p.body === 'Sun');
            setSky({
                moonPhaseEs: MOON_PHASE_ES[moon.phase] ?? moon.phase,
                mercuryRetro: isMercuryRetrograde(now),
                sunSignEs: (sun && (translateSign(sun.sign) ?? sun.sign)) || '',
                sunDegree: sun ? Math.floor(sun.degree) : 0,
            });
        } catch {
            setSky(null); // sin datos, el hero funciona igual
        }
    }, []);

    // ------- secuencia -------
    useEffect(() => {
        // Pestaña oculta (o reduced-motion): sin timers ni rAF confiables —
        // directo al estado final para no dejar la intro colgada.
        if (reducedMotion || document.hidden) { setPhase('reveal'); return; }
        if (phase !== 'typing') return;
        if (typedCount >= TYPED_TEXT.length) {
            const t = setTimeout(() => setPhase('burst'), 650);
            return () => clearTimeout(t);
        }
        const t = setTimeout(() => setTypedCount(c => c + 1), 62);
        return () => clearTimeout(t);
    }, [phase, typedCount, reducedMotion]);

    useEffect(() => {
        if (phase !== 'burst') return;
        const t = setTimeout(() => setPhase('reveal'), 750);
        return () => clearTimeout(t);
    }, [phase]);

    const skip = () => { if (phase !== 'reveal') setPhase('reveal'); };

    // ------- estrellas de fondo (seeded) -------
    // Precisión fija: server y cliente deben serializar EXACTAMENTE el mismo
    // string en style (los decimales largos provocan mismatch de hidratación).
    const stars = useMemo(() => Array.from({ length: 90 }, (_, i) => ({
        left: `${(seeded(i) * 100).toFixed(3)}%`,
        top: `${(seeded(i + 200) * 100).toFixed(3)}%`,
        size: `${(1 + seeded(i + 400) * 1.6).toFixed(2)}px`,
        delay: `${(seeded(i + 600) * 6).toFixed(2)}s`,
        opacity: Number((0.25 + seeded(i + 800) * 0.5).toFixed(3)),
    })), []);

    // ------- partículas del burst (seeded) -------
    const particles = useMemo(() => Array.from({ length: 34 }, (_, i) => {
        const angle = seeded(i + 50) * Math.PI * 2;
        const dist = 90 + seeded(i + 150) * 240;
        return {
            dx: Math.cos(angle) * dist,
            dy: Math.sin(angle) * dist * 0.7,
            size: 1.5 + seeded(i + 250) * 2.5,
            gold: seeded(i + 350) > 0.8,
        };
    }), []);

    return (
        <section
            onClick={skip}
            className="relative min-h-screen overflow-hidden flex items-center justify-center px-5"
            aria-label="Hola, Universo"
        >
            {/* cielo */}
            <div className="absolute inset-0" aria-hidden>
                {stars.map((s, i) => (
                    <span
                        key={i}
                        className="absolute rounded-full bg-white animate-[al-twinkle_5s_ease-in-out_infinite]"
                        style={{
                            left: s.left, top: s.top,
                            width: s.size, height: s.size,
                            opacity: s.opacity, animationDelay: s.delay,
                        }}
                    />
                ))}
                {/* aurora central */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(80vw,900px)] h-[min(80vw,900px)] rounded-full opacity-40"
                    style={{ background: 'radial-gradient(circle, rgba(157,78,221,0.35) 0%, rgba(217,0,255,0.12) 38%, transparent 70%)' }} />
            </div>

            <div className="relative w-full max-w-4xl text-center">
                {/* La terminal vive en su propio AnimatePresence (sin mode="wait"):
                    el reveal monta por estado y NUNCA queda gateado por la
                    animación de salida (rAF puede estar congelado en tabs ocultas). */}
                <AnimatePresence>
                    {phase !== 'reveal' && (
                        <motion.div
                            key="terminal"
                            exit={{ opacity: 0, y: -24, transition: { duration: 0.35 } }}
                            className="absolute inset-x-0 top-1/2 -translate-y-1/2"
                        >
                            {/* línea de terminal */}
                            <p className="font-mono text-xl sm:text-2xl md:text-3xl text-[#a8cfff] tracking-wide">
                                {TYPED_TEXT.slice(0, typedCount)}
                                <span className="inline-block w-[0.55em] h-[1.15em] align-text-bottom bg-accent-primary ml-1 animate-[al-cursorblink_1s_steps(1)_infinite]" />
                            </p>

                            {/* burst de partículas */}
                            {phase === 'burst' && (
                                <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
                                    {particles.map((p, i) => (
                                        <motion.span
                                            key={i}
                                            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                            animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 0.4 }}
                                            transition={{ duration: 0.75, ease: 'easeOut' }}
                                            className="absolute rounded-full"
                                            style={{
                                                width: p.size, height: p.size,
                                                background: p.gold ? 'var(--accent-gold)' : '#e0aaff',
                                                boxShadow: p.gold ? '0 0 6px var(--accent-gold)' : '0 0 6px rgba(217,0,255,0.8)',
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {phase === 'reveal' && (
                        <motion.div
                            key="reveal"
                            initial={reducedMotion ? false : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="flex flex-col items-center gap-6 md:gap-8"
                        >
                            <motion.div
                                initial={reducedMotion ? false : { opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1, duration: 0.5 }}
                            >
                                <AstrolegiaLogo width={210} className="mx-auto opacity-90" />
                            </motion.div>

                            <motion.h1
                                initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25, duration: 0.55 }}
                                className="font-heading font-bold leading-[1.02] text-[clamp(2.6rem,9vw,5.5rem)] text-white"
                                style={{ textShadow: '0 0 60px rgba(157,78,221,0.55)' }}
                            >
                                Hola, Universo
                                <span className="text-accent-primary animate-[al-cursorblink_1.2s_steps(1)_infinite]">_</span>
                            </motion.h1>

                            <motion.p
                                initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.5 }}
                                className="max-w-xl text-white/65 text-base md:text-lg leading-relaxed"
                            >
                                El primer programa siempre es un saludo.
                                Éste, además, <span className="text-white/90">escucha la respuesta</span>:
                                cartas, ciclos y análisis calculados con el cielo real.
                            </motion.p>

                            {/* la respuesta del universo: datos reales de ahora */}
                            {sky && (
                                <motion.div
                                    initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.55, duration: 0.5 }}
                                    className="w-full"
                                >
                                    <p className="font-mono text-[0.68rem] tracking-[0.25em] uppercase text-white/35 mb-3">
                                        {'// el universo responde — cielo de este instante'}
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3">
                                        <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-2 text-sm text-white/80">
                                            <MoonPhaseIcon size={18} />
                                            {sky.moonPhaseEs}
                                        </span>
                                        <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-2 text-sm text-white/80">
                                            <span className="font-heading text-accent-primary" style={{ textShadow: '0 0 8px rgba(217,0,255,0.7)' }}>☿</span>
                                            Mercurio {sky.mercuryRetro ? 'retrógrado' : 'directo'}
                                        </span>
                                        {sky.sunSignEs && (
                                            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-2 text-sm text-white/80">
                                                <span className="text-accent-gold">☉</span>
                                                Sol en {sky.sunSignEs} {sky.sunDegree}°
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            <motion.div
                                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7, duration: 0.5 }}
                                className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 mt-1"
                            >
                                <Link href="/dashboard" className="btn-primary px-8 py-3 text-sm">
                                    Entrar al dashboard
                                </Link>
                                <Link
                                    href="/conocer"
                                    className="flex items-center gap-2 px-6 py-3 text-sm text-white/60 hover:text-white border border-white/15 hover:border-white/30 rounded-full transition-colors"
                                >
                                    Conocer la suite <ArrowRight size={15} />
                                </Link>
                            </motion.div>
                        </motion.div>
                )}
            </div>

        </section>
    );
}
