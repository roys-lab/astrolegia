'use client';

import Link from 'next/link';
import { Telescope, BookOpenText, UsersRound, ArrowRight } from 'lucide-react';
import HolaUniversoHero from '@/components/home/HolaUniversoHero';
import ConstellationReveal from '@/components/cosmic/ConstellationReveal';
import AstrolegiaLogo from '@/components/AstrolegiaLogo';

// =============================================
// HOME — "Hola, Universo"
// El saludo del programador, respondido por el cielo real.
// Hero de diálogo + manifiesto breve. El detalle vive en /conocer.
// =============================================

const MANIFESTO = [
    {
        icon: Telescope,
        accent: 'var(--accent-gold)',
        title: 'Cálculo real',
        text: 'Efemérides de precisión profesional: tu carta como la calcula un astrólogo, con casas Placidus, nodos y Quirón — verificada contra referencias.',
    },
    {
        icon: BookOpenText,
        accent: 'var(--accent-secondary)',
        title: 'Tu biblioteca habla',
        text: 'Los análisis citan tus propios libros de astrología, diseño humano, kin maya y numerología. Conocimiento con fuente, no opiniones de una IA.',
    },
    {
        icon: UsersRound,
        accent: 'var(--accent-primary)',
        title: 'Tu gente y tus marcas',
        text: 'Cartas de las personas que querés, sinastrías, equipos y cartas de grupo para tus proyectos. Todo en un solo lugar.',
    },
];

export default function Home() {
    return (
        <main className="bg-bg-deep text-white overflow-x-hidden">
            <HolaUniversoHero />

            {/* manifiesto */}
            <section className="relative px-5 pb-20 md:pb-28">
                <div className="max-w-5xl mx-auto">
                    <p className="font-mono text-[0.68rem] tracking-[0.25em] uppercase text-white/35 text-center mb-8 md:mb-10">
                        {'// por qué existe'}
                    </p>
                    <ConstellationReveal
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
                        itemClassName="h-full"
                    >
                        {MANIFESTO.map(item => (
                            <div
                                key={item.title}
                                className="glass h-full p-6 md:p-7 border-l-[3px]"
                                style={{ borderLeftColor: item.accent }}
                            >
                                <item.icon size={22} style={{ color: item.accent }} aria-hidden />
                                <h2 className="font-heading text-lg font-semibold mt-4 mb-2">{item.title}</h2>
                                <p className="text-sm text-white/60 leading-relaxed">{item.text}</p>
                            </div>
                        ))}
                    </ConstellationReveal>

                    {/* cierre */}
                    <div className="flex flex-col items-center gap-5 mt-16 md:mt-20 text-center">
                        <AstrolegiaLogo width={150} className="opacity-50" />
                        <Link
                            href="/conocer"
                            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
                        >
                            Conocer toda la suite <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
