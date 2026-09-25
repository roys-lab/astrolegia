'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Fingerprint, Dna, Type, ArrowRight } from 'lucide-react';
import { Icons } from '@/components/Icons';
import ConstellationReveal from '@/components/cosmic/ConstellationReveal';

// =============================================
// TOOL SHOWCASE
// Tiered tool display — Main / Secondary / Coming Soon
// Scroll-triggered stagger animation
// =============================================

interface ToolCard {
    title: string;
    subtitle: string;
    description: string;
    link: string;
    accent: string;
    icon: React.ReactNode;
}

/**
 * Rutas que existen en esta app. El resto de las herramientas de v1 se muestra
 * como "Próximamente" (sin link) hasta que se migre su módulo (ver ADR-0001).
 */
const AVAILABLE_ROUTES = new Set(['/astrology', '/numerology', '/people', '/dashboard']);

const MAIN_TOOLS: ToolCard[] = [
    {
        title: 'Oráculo AI',
        subtitle: 'Canal Directo',
        description: 'Pregúntale al cosmos. Combina algoritmos y arquetipos para darte respuestas cuando la lógica no alcanza.',
        link: '/oracle-angels',
        accent: '#e0aaff',
        icon: <Icons.IconOracle />,
    },
    {
        title: 'Constelaciones',
        subtitle: 'Campo Sistémico',
        description: 'Mapea las dinámicas ocultas de tu sistema. La IA facilita tu exploración en el campo.',
        link: '/constelaciones',
        accent: '#d900ff',
        icon: (
            <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
                <circle cx="24" cy="12" r="4" stroke="#d900ff" strokeWidth="1.5" />
                <circle cx="12" cy="36" r="4" stroke="#d900ff" strokeWidth="1.5" />
                <circle cx="36" cy="36" r="4" stroke="#d900ff" strokeWidth="1.5" />
                <line x1="24" y1="16" x2="12" y2="32" stroke="#d900ff" strokeWidth="0.8" opacity="0.5" />
                <line x1="24" y1="16" x2="36" y2="32" stroke="#d900ff" strokeWidth="0.8" opacity="0.5" />
                <line x1="16" y1="36" x2="32" y2="36" stroke="#d900ff" strokeWidth="0.8" opacity="0.5" />
            </svg>
        ),
    },
    {
        title: 'Calendario Cósmico',
        subtitle: 'Sincronización',
        description: 'El universo tiene su reloj. Encontramos la ventana temporal donde los tránsitos impulsan tu acción.',
        link: '/astrology',
        accent: '#00b4d8',
        icon: <Icons.IconAstrology />,
    },
];

const SECONDARY_TOOLS: ToolCard[] = [
    {
        title: 'Tu Firma en el Cosmos',
        subtitle: 'Numerología',
        description: 'Decodificamos la vibración matemática de tu nombre.',
        link: '/numerology',
        accent: '#c77dff',
        icon: <Icons.IconNumerology />,
    },
    {
        title: 'Clima del Cielo',
        subtitle: 'Mercury Monitor',
        description: 'Navegación consciente de retrogradaciones y aspectos tensos.',
        link: '/mercury',
        accent: '#ffd166',
        icon: <Icons.IconMercury />,
    },
    {
        title: 'Sinastría',
        subtitle: 'Sinergia Cósmica',
        description: 'Compatibilidad y dinámicas entre dos cartas natales.',
        link: '/synastry',
        accent: '#ff6b6b',
        icon: (
            <svg viewBox="0 0 48 48" fill="none" className="w-8 h-8">
                <circle cx="18" cy="24" r="10" stroke="#ff6b6b" strokeWidth="1.2" />
                <circle cx="30" cy="24" r="10" stroke="#ff6b6b" strokeWidth="1.2" />
            </svg>
        ),
    },
    {
        title: 'Red Cósmica',
        subtitle: 'Network',
        description: 'Conectá con otros navegantes del cosmos.',
        link: '/network',
        accent: '#00b4d8',
        icon: (
            <svg viewBox="0 0 48 48" fill="none" className="w-8 h-8">
                <circle cx="24" cy="14" r="3" fill="#00b4d8" opacity="0.6" />
                <circle cx="12" cy="34" r="3" fill="#00b4d8" opacity="0.6" />
                <circle cx="36" cy="34" r="3" fill="#00b4d8" opacity="0.6" />
                <circle cx="38" cy="18" r="2" fill="#00b4d8" opacity="0.3" />
                <circle cx="10" cy="20" r="2" fill="#00b4d8" opacity="0.3" />
                <line x1="24" y1="17" x2="12" y2="31" stroke="#00b4d8" strokeWidth="0.6" opacity="0.4" />
                <line x1="24" y1="17" x2="36" y2="31" stroke="#00b4d8" strokeWidth="0.6" opacity="0.4" />
                <line x1="15" y1="34" x2="33" y2="34" stroke="#00b4d8" strokeWidth="0.6" opacity="0.4" />
            </svg>
        ),
    },
    {
        title: 'Tu Mapa Genético',
        subtitle: 'Human Design',
        description: 'Descubrí tu tipo, estrategia y autoridad energética.',
        link: '/human-design',
        accent: '#d900ff',
        icon: <Fingerprint size={32} color="#d900ff" strokeWidth={1.5} />,
    },
    {
        title: 'Avatar Estelar',
        subtitle: 'Astro-Branding',
        description: 'Arquetipos planetarios para construir tu identidad de marca.',
        link: '/branding',
        accent: '#ff6b6b',
        icon: <Icons.IconBranding />,
    },
    {
        title: 'Código DNA',
        subtitle: 'DNA Builder',
        description: 'Construí tu ADN digital: esencia, voz y propósito.',
        link: '/dna/builder',
        accent: '#00b4d8',
        icon: <Dna size={32} color="#00b4d8" strokeWidth={1.5} />,
    },
    {
        title: 'Naming Cósmico',
        subtitle: 'Naming',
        description: 'Nombres con vibración numerológica alineada a tu marca.',
        link: '/naming',
        accent: '#ffd166',
        icon: <Type size={32} color="#ffd166" strokeWidth={1.5} />,
    },
];

export default function ToolShowcase() {
    const reduce = useReducedMotion();

    return (
        <section className="relative py-32 px-4">
            <div className="absolute inset-0 bg-gradient-to-b from-[#03030b] via-[#06061a] to-[#03030b]" />

            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Section header */}
                <motion.div
                    className="text-center mb-20"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30 }}
                    whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.6 }}
                >
                    <p className="text-[0.7rem] uppercase tracking-[6px] text-[#c77dff]/70 mb-4">
                        Herramientas de Conexión
                    </p>
                    <h2
                        className="font-heading font-bold text-white"
                        style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}
                    >
                        Todo lo que necesitás,{' '}
                        <span className="text-white/40">en un solo cosmos</span>
                    </h2>
                </motion.div>

                {/* === TIER 1: Main Tools (large cards) — constellation reveal === */}
                <ConstellationReveal
                    className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16"
                    itemClassName="h-full"
                    accent="#c77dff"
                >
                    {MAIN_TOOLS.map(tool => {
                        const available = AVAILABLE_ROUTES.has(tool.link);
                        const card = (
                                <div className={`group relative h-full p-8 rounded-2xl bg-white/[0.05] border border-white/[0.1] backdrop-blur-sm overflow-hidden hover:bg-white/[0.08] hover:border-white/[0.18] transition-all duration-500 shadow-lg shadow-black/20 ${available ? 'cursor-pointer' : 'cursor-default opacity-70'}`}>
                                    {/* Top accent line */}
                                    <div
                                        className="absolute top-0 left-0 w-full h-[2px] opacity-50 group-hover:opacity-100 transition-opacity"
                                        style={{ background: `linear-gradient(90deg, ${tool.accent}, transparent)` }}
                                    />

                                    {/* Glow on hover */}
                                    <div
                                        className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700"
                                        style={{ background: tool.accent }}
                                    />

                                    {/* Icon */}
                                    <div className="mb-6 opacity-70 group-hover:opacity-100 transition-opacity duration-300">
                                        {tool.icon}
                                    </div>

                                    {/* Subtitle */}
                                    <span
                                        className="text-[0.65rem] uppercase tracking-[3px] font-medium"
                                        style={{ color: tool.accent }}
                                    >
                                        {tool.subtitle}
                                    </span>

                                    {/* Title */}
                                    <h3 className="text-xl font-heading font-bold text-white mt-2 mb-3 group-hover:text-gradient transition-all">
                                        {tool.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-white/50 text-sm leading-relaxed font-light">
                                        {tool.description}
                                    </p>

                                    {/* CTA: icono SVG, nunca flechas ASCII (.AGENTS §3) */}
                                    <div className={`mt-6 flex items-center gap-2 text-xs font-medium transition-all duration-300 ${available ? 'opacity-0 group-hover:opacity-70 translate-x-0 group-hover:translate-x-1' : 'opacity-60'}`} style={{ color: tool.accent }}>
                                        <span>{available ? 'Explorar' : 'Próximamente'}</span>
                                        {available && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
                                    </div>
                                </div>
                        );
                        return available
                            ? <Link key={tool.title} href={tool.link} className="block h-full">{card}</Link>
                            : <div key={tool.title} className="block h-full" aria-disabled="true">{card}</div>;
                    })}
                </ConstellationReveal>

                {/* === TIER 2: Secondary Tools (smaller cards) — constellation reveal === */}
                <ConstellationReveal
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                    itemClassName="h-full"
                    accent="var(--accent-secondary)"
                >
                    {SECONDARY_TOOLS.map(tool => {
                        const available = AVAILABLE_ROUTES.has(tool.link);
                        const card = (
                                <div className={`group relative h-full p-6 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14] transition-all duration-500 shadow-md shadow-black/15 ${available ? 'cursor-pointer' : 'cursor-default opacity-70'}`}>
                                    <div className="flex items-start gap-4">
                                        <div className="opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1">
                                            {tool.icon}
                                        </div>
                                        <div>
                                            <span className="text-[0.6rem] uppercase tracking-[2px]" style={{ color: tool.accent }}>
                                                {available ? tool.subtitle : `${tool.subtitle} · Próximamente`}
                                            </span>
                                            <h4 className="text-sm font-heading font-semibold text-white mt-0.5 mb-1">
                                                {tool.title}
                                            </h4>
                                            <p className="text-white/40 text-xs leading-relaxed">
                                                {tool.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                        );
                        return available
                            ? <Link key={tool.title} href={tool.link} className="block h-full">{card}</Link>
                            : <div key={tool.title} className="block h-full" aria-disabled="true">{card}</div>;
                    })}
                </ConstellationReveal>
            </div>
        </section>
    );
}
