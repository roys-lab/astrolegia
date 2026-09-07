'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

// =============================================
// JOURNEY SECTION
// "Tu Viaje" — 3 pillars: Descubrí → Transformá → Manifestá
// Scroll-triggered reveal with staggered animations
// =============================================

const PILLARS = [
    {
        step: '01',
        title: 'Descubrí',
        description: 'Conectá con tu esencia cósmica. Leemos las señales del universo y las traducimos en datos claros.',
        icon: (
            <svg viewBox="0 0 64 64" fill="none" className="w-12 h-12">
                <circle cx="32" cy="32" r="28" stroke="url(#g1)" strokeWidth="1.5" />
                <circle cx="32" cy="32" r="6" fill="url(#g1)" />
                <path d="M32 4v10M32 50v10M4 32h10M50 32h10" stroke="url(#g1)" strokeWidth="1" opacity="0.5" />
                <circle cx="32" cy="32" r="18" stroke="url(#g1)" strokeWidth="0.5" strokeDasharray="4 4" />
                <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="64" y2="64">
                        <stop stopColor="#c77dff" />
                        <stop offset="1" stopColor="#00b4d8" />
                    </linearGradient>
                </defs>
            </svg>
        ),
        accent: '#c77dff',
    },
    {
        step: '02',
        title: 'Transformá',
        description: 'Las herramientas del universo en tus manos. Numerología, astrología, constelaciones — todo sincronizado.',
        icon: (
            <svg viewBox="0 0 64 64" fill="none" className="w-12 h-12">
                <path d="M12 52L32 12L52 52" stroke="url(#g2)" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M22 38h20" stroke="url(#g2)" strokeWidth="1" opacity="0.5" />
                <circle cx="32" cy="12" r="3" fill="url(#g2)" />
                <circle cx="12" cy="52" r="3" fill="url(#g2)" opacity="0.5" />
                <circle cx="52" cy="52" r="3" fill="url(#g2)" opacity="0.5" />
                <defs>
                    <linearGradient id="g2" x1="12" y1="12" x2="52" y2="52">
                        <stop stopColor="#00b4d8" />
                        <stop offset="1" stopColor="#d900ff" />
                    </linearGradient>
                </defs>
            </svg>
        ),
        accent: '#00b4d8',
    },
    {
        step: '03',
        title: 'Manifestá',
        description: 'Tu proyecto vibra con propósito. Cada decisión alineada con las fuerzas que realmente mueven tu mundo.',
        icon: (
            <svg viewBox="0 0 64 64" fill="none" className="w-12 h-12">
                <path d="M32 8l6 18h18l-14 10 5 18-15-11-15 11 5-18L8 26h18z" stroke="url(#g3)" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="32" cy="32" r="8" stroke="url(#g3)" strokeWidth="0.5" />
                <defs>
                    <linearGradient id="g3" x1="8" y1="8" x2="56" y2="56">
                        <stop stopColor="#d900ff" />
                        <stop offset="0.5" stopColor="#c77dff" />
                        <stop offset="1" stopColor="#ffd166" />
                    </linearGradient>
                </defs>
            </svg>
        ),
        accent: '#d900ff',
    },
];

const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.2,
        },
    },
};

const pillarVariants = {
    hidden: { opacity: 0, y: 60 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.8, ease: 'easeOut' as const },
    },
};

export default function JourneySection() {
    const ref = useRef<HTMLElement>(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });

    return (
        <section
            ref={ref}
            className="relative min-h-screen flex flex-col items-center justify-center py-32 px-4"
        >
            {/* Aurora background layer */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#03030b] via-[#0a001a] to-[#03030b]" />
            <div className="absolute inset-0 aurora-mesh opacity-15 pointer-events-none" />

            <div className="relative z-10 max-w-5xl w-full mx-auto">
                {/* Section header */}
                <motion.div
                    className="text-center mb-20"
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8 }}
                >
                    <p className="text-[0.7rem] uppercase tracking-[6px] text-[#c77dff]/70 mb-6">
                        El Camino
                    </p>
                    <h2
                        className="font-heading font-bold text-white leading-tight"
                        style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
                    >
                        No es solo código.{' '}
                        <span className="bg-gradient-to-r from-[#c77dff] to-[#00b4d8] bg-clip-text text-transparent">
                            Es intención.
                        </span>
                    </h2>
                    <p className="text-white/55 mt-6 max-w-xl mx-auto text-lg font-light leading-relaxed">
                        Cada click es una invocación. Unimos la precisión de la tecnología
                        con la fluidez de la intuición.
                    </p>
                </motion.div>

                {/* 3 Pillars */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-8"
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? 'visible' : 'hidden'}
                >
                    {PILLARS.map((pillar) => (
                        <motion.div
                            key={pillar.step}
                            variants={pillarVariants}
                            className="group relative"
                        >
                            <div className="relative p-8 rounded-2xl bg-white/[0.05] border border-white/[0.1] backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/[0.18] transition-all duration-500 shadow-lg shadow-black/20">
                                {/* Step number */}
                                <span
                                    className="text-[5rem] font-heading font-bold absolute -top-6 -left-2 leading-none pointer-events-none select-none"
                                    style={{ color: pillar.accent, opacity: 0.06 }}
                                >
                                    {pillar.step}
                                </span>

                                {/* Icon */}
                                <div className="relative mb-6 opacity-70 group-hover:opacity-100 transition-opacity duration-500">
                                    {pillar.icon}
                                </div>

                                {/* Title */}
                                <h3
                                    className="font-heading font-bold text-2xl text-white mb-3"
                                    style={{
                                        background: `linear-gradient(135deg, #fff, ${pillar.accent})`,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                >
                                    {pillar.title}
                                </h3>

                                {/* Description */}
                                <p className="text-white/55 text-sm leading-relaxed font-light">
                                    {pillar.description}
                                </p>

                                {/* Accent line bottom */}
                                <div
                                    className="absolute bottom-0 left-8 right-8 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                    style={{
                                        background: `linear-gradient(90deg, transparent, ${pillar.accent}40, transparent)`,
                                    }}
                                />
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Connecting line between pillars (desktop) */}
                <div className="hidden md:block absolute top-[60%] left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
            </div>
        </section>
    );
}
