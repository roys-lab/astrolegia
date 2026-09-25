'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { isMercuryRetrograde } from '@astrolegia/core/astrology';
import MercuryGlyph from '@/components/cosmic/MercuryGlyph';
import MoonPhaseIcon from '@/components/cosmic/MoonPhaseIcon';

// =============================================
// COSMIC STATUS SECTION
// Mercury retrograde + Final CTA
// =============================================

export default function CosmicStatusSection() {
    const ref = useRef<HTMLElement>(null);
    const isInView = useInView(ref, { once: true, amount: 0.3 });
    const isRetrograde = isMercuryRetrograde(new Date());
    // Fecha estable post-mount para el icono de fase lunar (evita mismatch SSR)
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => { setNow(new Date()); }, []);

    return (
        <section
            ref={ref}
            className="relative min-h-[80vh] flex flex-col items-center justify-center py-32 px-4"
        >
            <div className="absolute inset-0 bg-gradient-to-b from-[#03030b] via-[#080818] to-[#03030b]" />

            <div className="relative z-10 max-w-3xl mx-auto text-center">
                {/* Status indicator */}
                <motion.div
                    className="inline-flex items-center gap-3 px-6 py-3 rounded-full border backdrop-blur-sm mb-16"
                    style={{
                        borderColor: isRetrograde
                            ? 'rgb(var(--accent-danger-rgb) / 0.35)'
                            : 'rgb(var(--accent-secondary-rgb) / 0.35)',
                        background: isRetrograde
                            ? 'rgb(var(--accent-danger-rgb) / 0.06)'
                            : 'rgb(var(--accent-secondary-rgb) / 0.06)',
                        boxShadow: isRetrograde
                            ? '0 0 40px rgb(var(--accent-danger-rgb) / 0.12)'
                            : '0 0 40px rgb(var(--accent-secondary-rgb) / 0.12)',
                    }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.6 }}
                >
                    {/* Glifo de Mercurio — estado real del cielo */}
                    <MercuryGlyph
                        size={20}
                        decorative
                        retrograde={isRetrograde}
                        color={isRetrograde ? 'var(--accent-danger)' : 'var(--accent-secondary)'}
                    />

                    <span className="text-[0.7rem] uppercase tracking-[2px] text-white/50">
                        Estado Cósmico
                    </span>
                    <span
                        className="text-sm font-semibold"
                        style={{ color: isRetrograde ? 'var(--accent-danger)' : 'var(--accent-secondary)' }}
                    >
                        {isRetrograde
                            ? 'Mercurio Retrógrado — Precaución'
                            : 'Cielo Despejado — Momento Óptimo'}
                    </span>

                    {/* Fase lunar real de esta noche */}
                    {now && (
                        <span className="flex items-center pl-3 border-l border-white/10">
                            <MoonPhaseIcon date={now} size={22} />
                        </span>
                    )}
                </motion.div>

                {/* Final CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8, delay: 0.3 }}
                >
                    <h2
                        className="font-heading font-bold text-white mb-6"
                        style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
                    >
                        ¿Listo para{' '}
                        <span className="bg-gradient-to-r from-[#c77dff] to-[#00b4d8] bg-clip-text text-transparent">
                            conectar
                        </span>
                        ?
                    </h2>
                    <p className="text-white/50 text-lg mb-10 max-w-lg mx-auto font-light">
                        El cosmos está alineado. Tu próximo paso espera.
                    </p>

                    <a href="/dashboard" className="group relative inline-flex items-center">
                        <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#9d4edd] to-[#0088ff] blur-xl opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
                        <span className="relative px-12 py-5 rounded-full text-white font-semibold text-lg tracking-wide shadow-2xl group-hover:shadow-[0_0_60px_rgba(157,78,221,0.6)] transition-all duration-500 group-hover:scale-105 overflow-hidden" style={{ background: 'linear-gradient(135deg, #9d4edd 0%, #7b2cbf 50%, #5a189a 100%)' }}>
                            <span className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-full" />
                            <span className="relative">Entrar al Dashboard</span>
                        </span>
                    </a>
                </motion.div>

                {/* Small footer note */}
                <motion.p
                    className="mt-16 text-[0.65rem] uppercase tracking-[4px] text-white/15"
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.6, delay: 0.6 }}
                >
                    Astrolegia · System Prompt Series
                </motion.p>
            </div>
        </section>
    );
}
