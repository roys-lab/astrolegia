"use client";

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { calculateFavorabilityIndex } from '@astrolegia/core/astrology';
import { listPeople } from '@/services/people-service';
import type { NatalProfileWithChartsDTO } from '@astrolegia/contracts';

// Icons
import {
    User, Users, Heart, Sparkles, Calendar, Star, Hash,
    Sun, Moon, Sunrise, ArrowRight, UserPlus, CalendarDays,
    Rocket, Scale, OctagonAlert, Flame, Hourglass
} from 'lucide-react';

// Cosmic components (animaciones temáticas)
import MoonPhaseIcon from '@/components/cosmic/MoonPhaseIcon';
import OrbitLoader from '@/components/cosmic/OrbitLoader';
import ConstellationReveal from '@/components/cosmic/ConstellationReveal';
import MercuryGlyph from '@/components/cosmic/MercuryGlyph';
import MicroOrbit from '@/components/cosmic/MicroOrbit';

// Acentos por sección (identidad: gold, gente: azul)
const ACCENT_GOLD = 'var(--accent-gold)';
const ACCENT_BLUE = 'var(--accent-secondary)';

/** '1991-03-14' -> '14/03/1991' */
function formatPersonBirthDate(p: NatalProfileWithChartsDTO): string {
    const [year, month, day] = p.birthDate.split('-');
    return `${day}/${month}/${year}`;
}

export default function DashboardPage() {
    const { user, profile, signInWithGoogle, loading } = useAuth();
    const [astralClimate, setAstralClimate] = useState<any>(null);
    const [climateDate, setClimateDate] = useState<Date | null>(null);
    const [people, setPeople] = useState<NatalProfileWithChartsDTO[]>([]);
    const [peopleLoading, setPeopleLoading] = useState(true);

    useEffect(() => {
        const now = new Date();
        setClimateDate(now);
        setAstralClimate(calculateFavorabilityIndex(now));
    }, []);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;

        setPeopleLoading(true);
        listPeople()
            .then(result => { if (!cancelled) setPeople(result); })
            .catch(() => { if (!cancelled) setPeople([]); })
            .finally(() => { if (!cancelled) setPeopleLoading(false); });

        return () => { cancelled = true; };
    }, [user]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <OrbitLoader size="lg" className="mb-4" label="Conectando con el cosmos" />
                <p className="text-white/40 text-sm">Conectando con el cosmos...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <h1 className="text-3xl font-bold text-white mb-4">Acceso Restringido</h1>
                <p className="text-white/60 mb-6">Debes iniciar sesión para ver tu tablero de comando.</p>
                <button
                    onClick={() => signInWithGoogle()}
                    className="btn-primary px-6 py-3 flex items-center gap-3"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Iniciar con Google
                </button>
            </div>
        );
    }

    const displayName = user.name || 'Viajero';
    const photoURL = user.image;
    // Perfil propio (NatalProfile con isSelf) y resumen de su carta natal
    const hasBirthData = !!profile;
    const natal = profile?.charts.find(c => c.type === 'natal') ?? null;
    const sunSign = natal?.sunSign ?? null;
    const moonSign = natal?.moonSign ?? null;
    const risingSign = natal?.ascendantSign ?? null;
    const peoplePreview = people.slice(0, 6);

    return (
        <div className="animate-fade max-w-6xl mx-auto p-4 pb-24 md:p-6 md:pb-24">

            {/* WELCOME HEADER */}
            <header className="mb-8 md:mb-10 text-center">
                <span className="text-xs uppercase tracking-[4px] text-[#c77dff] block mb-2">
                    Centro de Comando
                </span>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                    Hola, {displayName.split(' ')[0]}
                </h1>
                <p className="text-white/60 text-lg">
                    El universo está listo para colaborar contigo.
                </p>
            </header>

            {/* ASTRAL CLIMATE BANNER */}
            {astralClimate && (
                <section className="glass p-5 mb-8 md:p-6 md:mb-10 border border-white/10 relative overflow-hidden">
                    <div
                        className="absolute inset-0 opacity-10"
                        style={{ background: `linear-gradient(90deg, ${astralClimate.color}, transparent)` }}
                    />
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                        <div className="flex items-center gap-4">
                            <ClimateBadge score={astralClimate.score} color={astralClimate.color} />
                            <div>
                                <h3 className="text-xl font-bold text-white">
                                    Clima Astral: <span style={{ color: astralClimate.color }}>{astralClimate.label}</span>
                                </h3>
                                <p className="text-white/70 text-sm max-w-lg">
                                    {astralClimate.recommendation}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-center">
                            {astralClimate.factors.slice(0, 3).map((f: any, i: number) => (
                                <div key={i} className="bg-white/5 px-3 py-1 rounded-lg text-xs text-white/80 border border-white/5 flex items-center gap-2">
                                    <FactorIcon name={f.name} positive={f.impact >= 0} date={climateDate} />
                                    <span>{f.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ================= MI IDENTIDAD ================= */}
            <section className="mb-8 md:mb-10">
                <SectionHeader
                    icon={<User className="w-4 h-4" style={{ color: ACCENT_GOLD }} />}
                    label="Mi identidad"
                    accent={ACCENT_GOLD}
                />
                <div className="glass p-5 md:p-6 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full" style={{ background: ACCENT_GOLD }} />
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 md:gap-6">

                        {/* Perfil: foto + nombre + big three */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            {photoURL ? (
                                <img
                                    src={photoURL}
                                    alt={displayName}
                                    referrerPolicy="no-referrer"
                                    className="w-16 h-16 rounded-full border-2 object-cover shrink-0"
                                    style={{ borderColor: ACCENT_GOLD }}
                                />
                            ) : (
                                <div
                                    className="w-16 h-16 rounded-full bg-white/5 border-2 flex items-center justify-center shrink-0"
                                    style={{ borderColor: ACCENT_GOLD }}
                                >
                                    <User className="w-7 h-7 text-white/40" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <h3 className="text-xl font-bold text-white truncate">{displayName}</h3>
                                {(sunSign || moonSign || risingSign) ? (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {sunSign && <ZodiacChip icon={<Sun className="w-3.5 h-3.5" style={{ color: ACCENT_GOLD }} />} label={sunSign} />}
                                        {moonSign && <ZodiacChip icon={<Moon className="w-3.5 h-3.5 text-white/70" />} label={moonSign} />}
                                        {risingSign && <ZodiacChip icon={<Sunrise className="w-3.5 h-3.5" style={{ color: ACCENT_BLUE }} />} label={`Asc ${risingSign}`} />}
                                    </div>
                                ) : (
                                    <p className="text-white/50 text-sm mt-1">
                                        {hasBirthData ? 'Generá tu carta natal para ver tu Sol, Luna y Ascendente.' : 'Todavía no cargaste tus datos de nacimiento.'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* CTA o accesos a las 4 vistas de identidad */}
                        {!hasBirthData ? (
                            <Link
                                href="/people"
                                className="no-underline shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-black transition-transform hover:scale-105"
                                style={{ background: ACCENT_GOLD }}
                            >
                                Cargá tu carta en Personas
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 shrink-0">{/* Diseño Humano y Kin Maya vuelven cuando se migren sus módulos (ADR-0001) */}
                                <IdentityLink href="/people" icon={<Star className="w-4 h-4" style={{ color: ACCENT_GOLD }} />} label="Carta natal" />
                                <IdentityLink href="/numerology" icon={<Hash className="w-4 h-4" style={{ color: ACCENT_GOLD }} />} label="Numerología" />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ================= MI GENTE ================= */}
            <section className="mb-8 md:mb-10">
                <SectionHeader
                    icon={<Users className="w-4 h-4" style={{ color: ACCENT_BLUE }} />}
                    label="Mi gente"
                    accent={ACCENT_BLUE}
                    action={
                        <Link href="/people" className="no-underline text-xs font-bold uppercase tracking-wider flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: ACCENT_BLUE }}>
                            Ver todas
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    }
                />
                {peopleLoading ? (
                    <PreviewSkeleton />
                ) : peoplePreview.length === 0 ? (
                    <EmptyState
                        accent={ACCENT_BLUE}
                        icon={<UserPlus className="w-6 h-6" style={{ color: ACCENT_BLUE }} />}
                        message="Todavía no tenés personas guardadas. Cargá a tu gente para calcular cartas, sinastrías y constelaciones."
                        ctaLabel="Agregá tu primera persona"
                        ctaHref="/people"
                    />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {peoplePreview.map(person => (
                            <Link key={person.id} href="/people" className="block group no-underline">
                                <div className="glass glass-hover p-4 border border-white/5 hover:border-white/20 relative overflow-hidden flex items-center gap-3">
                                    <div className="absolute top-0 left-0 w-1 h-full" style={{ background: ACCENT_BLUE }} />
                                    <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors shrink-0">
                                        <User className="w-4 h-4" style={{ color: ACCENT_BLUE }} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white font-bold text-sm truncate">{person.name}</p>
                                        <p className="text-white/50 text-xs flex items-center gap-1.5">
                                            <CalendarDays className="w-3 h-3" />
                                            {formatPersonBirthDate(person)}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* ================= HERRAMIENTAS ================= */}
            <section>
                <SectionHeader
                    icon={<Sparkles className="w-4 h-4 text-white/60" />}
                    label="Herramientas"
                    accent="rgba(255,255,255,0.6)"
                />
                <ConstellationReveal
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
                    itemClassName="h-full"
                >
                    {/* Solo las herramientas migradas. ADN, branding, naming, oráculo,
                        constelaciones, Mercurio, red y sinastría vuelven con sus rutas (ADR-0001). */}
                    <MiniToolCard
                        href="/people"
                        icon={<Users className="w-5 h-5 text-[#4895ef]" />}
                        accent="#4895ef"
                        title="Personas y cartas natales"
                        description="Tu gente, sus datos de nacimiento y la rueda zodiacal."
                    />
                    <MiniToolCard
                        href="/numerology"
                        icon={<Hash className="w-5 h-5 text-[#ffd166]" />}
                        accent="#ffd166"
                        title="Numerología"
                        description="Auditoría de nombres y palabras de poder."
                    />
                    <MiniToolCard
                        href="/astrology"
                        icon={<Calendar className="w-5 h-5 text-[#4895ef]" />}
                        accent="#4895ef"
                        title="Calendario"
                        description="Fechas favorables para lanzamientos."
                    />
                </ConstellationReveal>
            </section>
        </div>
    );
}

// ==================== COMPONENTES LOCALES ====================

/**
 * Composición SVG mínima para el estado del clima astral
 * (reemplaza los emojis 🚀⚖️🛑): icono lucide sobre halo radial
 * y anillo orbital punteado en el color del índice.
 */
function ClimateBadge({ score, color }: { score: number; color: string }) {
    const StatusIcon = score >= 70 ? Rocket : score >= 50 ? Scale : OctagonAlert;
    return (
        <div className="relative shrink-0 w-16 h-16 rounded-full flex items-center justify-center" aria-hidden>
            <span
                className="absolute inset-0 rounded-full"
                style={{ background: `radial-gradient(circle, ${color}2e 0%, transparent 70%)` }}
            />
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 64 64">
                <circle
                    cx="32" cy="32" r="30"
                    fill="none"
                    stroke={color}
                    strokeOpacity="0.35"
                    strokeWidth="1"
                    strokeDasharray="3 6"
                    strokeLinecap="round"
                />
            </svg>
            <StatusIcon className="w-7 h-7 relative" style={{ color }} strokeWidth={1.75} />
        </div>
    );
}

/**
 * Icono temático por factor del índice de favorabilidad
 * (reemplaza f.emoji): glifo ☿ para Mercurio, MoonPhaseIcon real
 * para la Luna y lucide para los regentes del día.
 */
function FactorIcon({ name, positive, date }: { name: string; positive: boolean; date: Date | null }) {
    if (name.startsWith('Mercurio')) {
        return (
            <MercuryGlyph
                size={13}
                decorative
                retrograde={name.includes('Retrógrado')}
                color={positive ? 'var(--accent-primary)' : 'var(--accent-danger)'}
            />
        );
    }
    if (name.startsWith('Luna')) {
        return <MoonPhaseIcon size={16} withHalo={false} decorative date={date ?? undefined} />;
    }
    if (name.startsWith('Día de')) {
        if (name.includes('Sol')) return <Sun className="w-3.5 h-3.5" style={{ color: ACCENT_GOLD }} />;
        if (name.includes('Luna')) return <Moon className="w-3.5 h-3.5 text-white/70" />;
        if (name.includes('Marte')) return <Flame className="w-3.5 h-3.5" style={{ color: 'var(--accent-danger)' }} />;
        if (name.includes('Mercurio')) return <MercuryGlyph size={13} decorative />;
        if (name.includes('Venus')) return <Heart className="w-3.5 h-3.5" style={{ color: '#ff6b6b' }} />;
        if (name.includes('Júpiter')) return <Sparkles className="w-3.5 h-3.5" style={{ color: ACCENT_BLUE }} />;
        if (name.includes('Saturno')) return <Hourglass className="w-3.5 h-3.5 text-white/60" />;
    }
    return <Sparkles className="w-3.5 h-3.5 text-white/50" />;
}

function SectionHeader({ icon, label, accent, action }: {
    icon: React.ReactNode;
    label: string;
    accent: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                {icon}
                <h2 className="text-xs font-bold uppercase tracking-[3px]" style={{ color: accent }}>
                    {label}
                </h2>
            </div>
            {action}
        </div>
    );
}

function ZodiacChip({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white/80">
            {icon}
            {label}
        </span>
    );
}

function IdentityLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    return (
        <Link href={href} className="block group no-underline">
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-colors text-center">
                {icon}
                <span className="text-xs font-bold text-white/80 group-hover:text-white transition-colors leading-tight">
                    {label}
                </span>
            </div>
        </Link>
    );
}

function EmptyState({ accent, icon, message, ctaLabel, ctaHref }: {
    accent: string;
    icon: React.ReactNode;
    message: string;
    ctaLabel: string;
    ctaHref: string;
}) {
    return (
        <div className="glass p-5 md:p-6 border border-dashed border-white/10 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="p-3 rounded-xl bg-white/5 shrink-0">{icon}</div>
            <p className="text-white/60 text-sm flex-1">{message}</p>
            <Link
                href={ctaHref}
                className="no-underline shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-colors hover:bg-white/10"
                style={{ color: accent, borderColor: accent }}
            >
                {ctaLabel}
                <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    );
}

function PreviewSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
                <div key={i} className="glass p-4 border border-white/5 animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-white/5 rounded w-1/3" />
                </div>
            ))}
        </div>
    );
}

function MiniToolCard({ href, icon, title, description, accent = 'var(--accent-secondary)' }: {
    href: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    accent?: string;
}) {
    return (
        <Link href={href} className="block group no-underline h-full">
            <div className="glass glass-hover h-full p-4 border border-white/5 hover:border-white/20 flex items-start gap-3">
                {/* Punto de luz que orbita el borde en hover (solo desktop) */}
                <MicroOrbit color={accent} radius={24} />
                <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors shrink-0">
                    {icon}
                </div>
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white group-hover:text-[#c77dff] transition-colors">
                        {title}
                    </h3>
                    <p className="text-white/50 text-xs leading-snug mt-0.5">{description}</p>
                </div>
            </div>
        </Link>
    );
}
