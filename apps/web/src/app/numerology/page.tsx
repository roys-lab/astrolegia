"use client";

import { useState, useMemo, useEffect } from 'react';
import BackButton from '@/components/BackButton';
import { auditName, findWordsForNumber, NUMBER_MEANINGS } from '@astrolegia/core/numerology';
import { NUMBER_ARCHETYPES } from '@astrolegia/core/numerology';
import { NumerologyHitchcock } from '@astrolegia/core/numerology';
import { useAuth } from '@/context/AuthContext';
import PersonPicker from '@/components/people/PersonPicker';
import type { NatalProfileWithChartsDTO } from '@astrolegia/contracts';
import { savePersonChart } from '@/services/people-service';

/** Versión del motor numerológico (servicio NumerologyHitchcock). */
const NUMEROLOGY_ENGINE_VERSION = 'hitchcock-1';

export default function NumerologyPage() {
    const { user, profile } = useAuth();
    const [mode, setMode] = useState<'audit' | 'reverse'>('audit');
    const [name, setName] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [targetNumber, setTargetNumber] = useState<number | "">("");
    const [suggestedWords, setSuggestedWords] = useState<string[]>([]);
    const [isRevealing, setIsRevealing] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Persona elegida en el PersonPicker (null = "Yo" o modo manual)
    const [selectedPerson, setSelectedPerson] = useState<NatalProfileWithChartsDTO | null>(null);
    const [pickerKey, setPickerKey] = useState(0);

    // Selección: prefill de nombre completo y fecha
    const handlePersonSelect = (person: NatalProfileWithChartsDTO | null) => {
        if (person) {
            setSelectedPerson(person);
            setName(person.name);
            setBirthDate(person.birthDate);
        } else {
            // "Yo": datos del perfil
            setSelectedPerson(null);
            setName(profile?.name || user?.name || '');
            if (profile?.birthDate) setBirthDate(profile.birthDate);
        }
    };

    // Edición manual: el resultado deja de ser de la persona elegida
    const clearPersonSelection = () => {
        if (selectedPerson) {
            setSelectedPerson(null);
            setPickerKey(k => k + 1);
        }
    };

    const audit = useMemo(() => {
        if (mode === 'audit') {
            if (!name.trim()) return null;
            const basic = auditName(name);
            const karma = NumerologyHitchcock.calculateKarma(name);

            let lifePath = null;
            let challenges = null;
            let pinnacles = null;

            if (birthDate) {
                const date = new Date(birthDate);
                if (!isNaN(date.getTime())) {
                    // Fix timezone offset issue by treating input as UTC or fixing hours
                    // Simple fix: append T00:00:00 if not present, or use getUTCDate methods carefully (service uses getUTCDate)
                    // Let's assume input type="date" returns YYYY-MM-DD. 
                    // New Date('YYYY-MM-DD') results in UTC midnight (or local?). 
                    // Actually new Date('2023-01-01') is usually UTC. 
                    // We need to ensure the Day/Month are correct. Service uses getUTCDate().
                    lifePath = NumerologyHitchcock.calculateLifePath(date);
                    challenges = NumerologyHitchcock.calculateChallenges(date);
                    pinnacles = NumerologyHitchcock.calculatePinnaclePeriods(date);
                }
            }

            return { ...basic, karma, lifePath, challenges, pinnacles };
        }
        return null;
    }, [name, birthDate, mode]);

    // Persistir el resultado en la persona elegida, solo mientras el form
    // siga con sus datos exactos (si el usuario edita, no se guarda nada).
    useEffect(() => {
        if (!user || !selectedPerson || !audit || mode !== 'audit') return;
        if (name.trim() !== selectedPerson.name) return;
        if (birthDate !== selectedPerson.birthDate) return;
        // La API calcula el inputHash con los datos actuales de la persona.
        savePersonChart(selectedPerson.id, 'numerology', {
            engineVersion: NUMEROLOGY_ENGINE_VERSION,
            payload: audit,
        }).catch(err => console.error('[Numerología] Error guardando el resultado:', err));
    }, [user, selectedPerson, audit, name, birthDate, mode]);

    const handleReverseSearch = () => {
        if (mode === 'reverse' && typeof targetNumber === 'number') {
            setIsRevealing(true);
            setHasSearched(true);
            // Simulate small delay
            setTimeout(() => {
                setSuggestedWords(findWordsForNumber(targetNumber));
                setIsRevealing(false);
            }, 800);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (mode === 'audit' && name.trim()) {
                setIsRevealing(true);
                setTimeout(() => setIsRevealing(false), 1500);
            } else if (mode === 'reverse' && targetNumber) {
                handleReverseSearch();
            }
        }
    };

    const [report, setReport] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);

    const handleGenerateReport = async () => {
        if (!name) return;
        setGenerating(true);
        try {
            const res = await fetch('/api/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            const data = await res.json();
            if (data.report) {
                setReport(data.report);
                // Scroll to report
                setTimeout(() => {
                    document.getElementById('report-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setGenerating(false);
        }
    };

    const renderNumberCard = (
        titulo: string,
        subtitulo: string,
        valor: number,
        valorBruto: number,
        colorAccent: string
    ) => {
        const significado = NUMBER_MEANINGS[valor] || "Vibración única en sintonización.";
        const arquetipo = NUMBER_ARCHETYPES[valor < 10 ? valor : 0] || {};

        return (
            <div
                className="glass"
                style={{
                    padding: 'clamp(1.25rem, 4.2vw, 2rem)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Accent top border */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `linear-gradient(90deg, ${colorAccent}, transparent)`
                }} />

                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1.5rem'
                }}>
                    <div>
                        <span style={{
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            color: colorAccent
                        }}>
                            {subtitulo}
                        </span>
                        <h3 style={{
                            fontSize: '1.3rem',
                            color: 'white',
                            marginTop: '0.25rem'
                        }}>
                            {titulo}
                        </h3>
                    </div>

                    {/* Big Number */}
                    <div style={{
                        fontSize: '3.5rem',
                        fontWeight: 800,
                        color: colorAccent,
                        lineHeight: 1,
                        textShadow: `0 0 30px ${colorAccent}40`
                    }}>
                        {valor}
                    </div>
                </div>

                {/* Calculation note */}
                <p style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255,255,255,0.4)',
                    marginBottom: '1rem'
                }}>
                    Valor bruto: {valorBruto} → reducido según sistema Pitagórico
                </p>

                {/* Meaning */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    borderLeft: `3px solid ${colorAccent}`
                }}>
                    <p style={{
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: '0.95rem',
                        lineHeight: 1.6,
                        fontStyle: 'italic'
                    }}>
                        "{significado}"
                    </p>
                </div>

                {/* Keywords */}
                {valor < 10 && arquetipo.keywords && (
                    <div style={{ marginTop: '1.5rem' }}>
                        <span style={{
                            fontSize: '0.65rem',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            color: 'rgba(255,255,255,0.4)'
                        }}>
                            Arquetipos Visuales
                        </span>
                        <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            flexWrap: 'wrap',
                            marginTop: '0.75rem'
                        }}>
                            {arquetipo.keywords?.map((kw: string) => (
                                <span
                                    key={kw}
                                    style={{
                                        fontSize: '0.7rem',
                                        padding: '0.3rem 0.8rem',
                                        borderRadius: '100px',
                                        border: `1px solid ${colorAccent}40`,
                                        color: colorAccent
                                    }}
                                >
                                    {kw}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="animate-fade" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Glow effect matching Home */}
            <div style={{
                position: 'absolute',
                top: '20%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(157,78,221,0.15) 0%, rgba(123,44,191,0.05) 40%, rgba(0,0,0,0) 70%)',
                filter: 'blur(50px)',
                zIndex: -1,
                pointerEvents: 'none'
            }} />
            {/* Back link */}
            {/* Back link */}
            <div style={{ marginBottom: '3rem' }}>
                <BackButton label="Volver al Inicio" />
            </div>

            {/* Header */}
            <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <span style={{
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '4px',
                    color: '#c77dff'
                }}>
                    Auditoría Numerológica
                </span>
                <h1 style={{
                    fontSize: 'clamp(2rem, 5vw, 3rem)',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #fff 0%, #c77dff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginTop: '0.5rem',
                    marginBottom: '1rem'
                }}>
                    {mode === 'audit' ? 'Revelá la Vibración de tu Nombre' : 'Buscador de Nombres de Poder'}
                </h1>
                <p style={{
                    color: 'rgba(255,255,255,0.6)',
                    maxWidth: '500px',
                    margin: '0 auto',
                    lineHeight: 1.6
                }}>
                    {mode === 'audit'
                        ? 'Cada letra tiene un valor numérico. Descubrí qué energías dominan tu nombre o proyecto.'
                        : 'Elegí un número objetivo y encontrá palabras que resuenen con esa frecuencia.'}
                </p>

                {/* Mode Switcher */}
                <div style={{
                    display: 'inline-flex',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '0.3rem',
                    borderRadius: '50px',
                    marginTop: '2rem',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <button
                        onClick={() => { setMode('audit'); setSuggestedWords([]); setHasSearched(false); }}
                        className="py-3 px-4 md:py-[0.6rem] md:px-6"
                        style={{
                            background: mode === 'audit' ? 'rgba(255,255,255,0.1)' : 'transparent',
                            color: mode === 'audit' ? 'white' : 'rgba(255,255,255,0.5)',
                            border: 'none',
                            borderRadius: '30px',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            fontWeight: 600,
                            fontSize: '0.85rem'
                        }}
                    >
                        Auditar Nombre
                    </button>
                    <button
                        onClick={() => { setMode('reverse'); setName(""); setReport(null); setSuggestedWords([]); setHasSearched(false); clearPersonSelection(); }}
                        className="py-3 px-4 md:py-[0.6rem] md:px-6"
                        style={{
                            background: mode === 'reverse' ? 'rgba(255,255,255,0.1)' : 'transparent',
                            color: mode === 'reverse' ? 'white' : 'rgba(255,255,255,0.5)',
                            border: 'none',
                            borderRadius: '30px',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            fontWeight: 600,
                            fontSize: '0.85rem'
                        }}
                    >
                        Buscar por Número
                    </button>
                </div>
            </header>

            {/* Input Section */}
            <div
                className="glass"
                style={{
                    padding: 'clamp(1.5rem, 6.3vw, 3rem)',
                    marginBottom: '3rem',
                    textAlign: 'center',
                    maxWidth: '600px',
                    margin: '0 auto 3rem'
                }}
            >
                {mode === 'audit' ? (
                    <>
                        {/* Selector de persona: prefill sin re-tipear nombre ni fecha */}
                        {user && (
                            <div style={{ marginBottom: '2rem', textAlign: 'left', position: 'relative', zIndex: 60 }}>
                                <PersonPicker key={pickerKey} onSelect={handlePersonSelect} />
                            </div>
                        )}
                        <label style={{
                            display: 'block',
                            marginBottom: '1.5rem',
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '0.8rem',
                            textTransform: 'uppercase',
                            letterSpacing: '3px'
                        }}>
                            Escribí el nombre completo
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => { clearPersonSelection(); setName(e.target.value); }}
                            onKeyDown={handleKeyDown}
                            placeholder="Nombre completo..."
                            style={{
                                width: '100%',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: '2px solid #c77dff',
                                color: 'white',
                                fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                                padding: '1rem 0',
                                outline: 'none',
                                fontFamily: 'var(--font-heading)',
                                textAlign: 'center',
                            }}
                        />

                        <label style={{
                            display: 'block',
                            margin: '2rem 0 1rem',
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '0.8rem',
                            textTransform: 'uppercase',
                            letterSpacing: '3px'
                        }}>
                            Fecha de Nacimiento (Opcional - Para Desafíos/Pináculos)
                        </label>
                        <input
                            type="date"
                            value={birthDate}
                            onChange={(e) => { clearPersonSelection(); setBirthDate(e.target.value); }}
                            onKeyDown={handleKeyDown}
                            style={{
                                width: '100%',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: '2px solid #22c55e',
                                color: 'white',
                                fontSize: '1.2rem',
                                padding: '0.5rem 0',
                                outline: 'none',
                                fontFamily: 'var(--font-heading)',
                                textAlign: 'center',
                                letterSpacing: '2px'
                            }}
                        />
                    </>
                ) : (
                    <>
                        <label style={{
                            display: 'block',
                            marginBottom: '1.5rem',
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '0.8rem',
                            textTransform: 'uppercase',
                            letterSpacing: '3px'
                        }}>
                            Ingresá tu Número Objetivo (1-9, 11, 22, 33)
                        </label>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
                            <input
                                type="number"
                                value={targetNumber}
                                onChange={(e) => setTargetNumber(parseInt(e.target.value) || "")}
                                onKeyDown={handleKeyDown}
                                placeholder="#"
                                style={{
                                    width: '120px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: '2px solid #00b4d8',
                                    color: '#00b4d8',
                                    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                                    padding: '0.5rem 0',
                                    outline: 'none',
                                    fontFamily: 'var(--font-heading)',
                                    textAlign: 'center',
                                    fontWeight: 'bold'
                                }}
                            />
                            <button
                                onClick={handleReverseSearch}
                                style={{
                                    background: 'rgba(0, 180, 216, 0.2)',
                                    color: '#00b4d8',
                                    border: '1px solid #00b4d8',
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    fontSize: '1.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s'
                                }}>
                                ➜
                            </button>
                        </div>
                    </>
                )}

                <p style={{
                    marginTop: '1rem',
                    fontSize: '0.75rem',
                    color: 'rgba(255,255,255,0.3)'
                }}>
                    Presioná Enter para {mode === 'audit' ? 'revelar' : 'buscar'}
                </p>
            </div >

            {/* Reverse Search Results */}
            {
                mode === 'reverse' && suggestedWords.length > 0 && (
                    <div className="animate-fade" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                        <h3 style={{ color: 'white', marginBottom: '2rem', fontSize: '1.5rem' }}>
                            Palabras de Poder con Vibración <span style={{ color: '#00b4d8' }}>{targetNumber}</span>
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
                            {suggestedWords.map((word, i) => (
                                <div key={i} className="glass glass-hover" style={{
                                    padding: '1rem 2rem',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontWeight: 600,
                                    letterSpacing: '1px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    cursor: 'default'
                                }}>
                                    {word}
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Reverse Search Empty/No Results */}
            {
                mode === 'reverse' && targetNumber !== "" && suggestedWords.length === 0 && !isRevealing && (
                    <div style={{ textAlign: 'center', opacity: 0.5 }}>
                        <p>Ingresá un número y presioná Enter para ver sugerencias.</p>
                    </div>
                )
            }

            {/* Results (Audit Mode) */}
            {
                mode === 'audit' && audit && (
                    <div
                        className="animate-fade"
                        style={{
                            opacity: isRevealing ? 0.5 : 1,
                            transition: 'opacity 0.5s'
                        }}
                    >
                        {/* Main Expression Number */}
                        <div style={{ marginBottom: '2rem' }}>
                            {renderNumberCard(
                                "Rescate",
                                "Tu Destino",
                                audit.expression,
                                audit.rawExpression,
                                "#c77dff"
                            )}
                        </div>

                        {/* Secondary Numbers Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '1.5rem'
                        }}>
                            {renderNumberCard(
                                "Impulso del Alma",
                                "Deseo Interior",
                                audit.soulUrge,
                                audit.rawSoulUrge,
                                "#00b4d8"
                            )}
                            {renderNumberCard(
                                "Personalidad",
                                "Imagen Pública",
                                audit.personality,
                                audit.rawPersonality,
                                "#ffd166"
                            )}
                        </div>

                        {/* Karma Section */}
                        <div className="glass" style={{ padding: '1.5rem', marginTop: '1.5rem', borderLeft: '3px solid #f87171' }}>
                            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.5)' }}>
                                Karma (Lecciones Faltantes)
                            </span>
                            <div style={{ marginTop: '0.75rem' }}>
                                {audit.karma && audit.karma.length > 0 ? (
                                    <>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                                            Estos números no aparecen en tu nombre. Representan lecciones que debés aprender o energías que te cuesta integrar naturalmente.
                                        </p>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {audit.karma.map((k: number) => (
                                                <span key={k} style={{
                                                    width: '30px', height: '30px', borderRadius: '50%',
                                                    background: 'rgba(248,113,113,0.2)', color: '#f87171',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 700, fontSize: '0.9rem'
                                                }}>
                                                    {k}
                                                </span>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <p style={{ color: '#22c55e', fontSize: '0.9rem', margin: 0 }}>
                                        ✨ ¡No tenés lecciones kármicas pendientes! Tu nombre integra todas las energías del 1 al 9.
                                    </p>
                                )}
                            </div>
                        </div>


                        {/* Challenges & Pinnacles Section (if birthDate present) */}
                        {audit.lifePath && (
                            <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

                                {/* Life Path Card */}
                                <div className="glass" style={{ padding: '1.5rem', borderLeft: '3px solid #8b5cf6' }}>
                                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.5)' }}>
                                        Sendero Natal (Life Path)
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
                                        <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#8b5cf6' }}>
                                            {audit.lifePath}
                                        </span>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: 0 }}>
                                            {NUMBER_MEANINGS[audit.lifePath] || "Tu camino de aprendizaje principal en esta vida."}
                                        </p>
                                    </div>
                                </div>

                                {/* Pinnacles */}
                                <div className="glass" style={{ padding: '1.5rem', borderLeft: '3px solid #f43f5e' }}>
                                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.5)' }}>
                                        Pináculos (Ciclos de Vida)
                                    </span>
                                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {audit.pinnacles?.map((p: any, i: number) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                                                <span>{i + 1}º (Edad {p.startAge}-{p.endAge !== null ? p.endAge : '∞'}):</span>
                                                <strong style={{ color: '#f43f5e' }}>{p.value}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Challenges */}
                                <div className="glass" style={{ padding: '1.5rem', borderLeft: '3px solid #eab308' }}>
                                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.5)' }}>
                                        Desafíos (Obstáculos)
                                    </span>
                                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                                        {audit.challenges?.map((c: number, i: number) => (
                                            <div key={i} style={{ textAlign: 'center' }}>
                                                <div style={{
                                                    width: '30px', height: '30px', borderRadius: '50%',
                                                    background: 'rgba(234,179,8,0.2)', color: '#eab308',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 700, fontSize: '0.9rem', margin: '0 auto 0.3rem'
                                                }}>
                                                    {c}
                                                </div>
                                                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                                                    {i === 0 ? '1º' : i === 1 ? '2º' : i === 2 ? 'Prin' : 'Fin'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <p style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                                        1º y 2º (Ciclos Menores), 3º (Desafío Principal), 4º (Final)
                                    </p>
                                </div>

                            </div>
                        )}

                        {/* Advanced Analysis Section */}
                        <div style={{ marginTop: '2rem' }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                gap: '1.5rem'
                            }}>
                                {/* Cornerstone */}
                                <div className="glass" style={{ padding: '1.5rem', borderLeft: '3px solid #22c55e' }}>
                                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.5)' }}>
                                        Piedra Angular
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
                                        <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#22c55e' }}>
                                            {audit.cornerstone.letter}
                                        </span>
                                        <div>
                                            <div style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>
                                                {audit.cornerstone.meaning?.attribute || 'N/A'}
                                            </div>
                                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                                                {audit.cornerstone.meaning?.usage || ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* First Vowel */}
                                <div className="glass" style={{ padding: '1.5rem', borderLeft: '3px solid #ff6b9d' }}>
                                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.5)' }}>
                                        Primera Vocal
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
                                        <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#ff6b9d' }}>
                                            {audit.firstVowel.letter || '—'}
                                        </span>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: 0 }}>
                                            {audit.firstVowel.meaning || 'Sin vocal detectada'}
                                        </p>
                                    </div>
                                </div>

                                {/* Master Type Badge */}
                                {(audit.isMasterExpression || audit.isMasterSoul || audit.isMasterPersonality) && (
                                    <div className="glass" style={{
                                        padding: '1.5rem',
                                        borderLeft: '3px solid #ffd166',
                                        background: 'linear-gradient(135deg, rgba(255,209,102,0.1), rgba(255,158,0,0.05))'
                                    }}>
                                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#ffd166' }}>
                                            ⭐ Número Maestro Detectado
                                        </span>
                                        <div style={{ marginTop: '0.75rem' }}>
                                            {audit.isMasterExpression && (
                                                <span style={{ display: 'block', color: 'white', fontWeight: 600 }}>
                                                    Expresión {audit.expression}: {audit.masterType || ''}
                                                </span>
                                            )}
                                            {audit.isMasterSoul && (
                                                <span style={{ display: 'block', color: '#00b4d8', fontSize: '0.9rem' }}>
                                                    Alma {audit.soulUrge}
                                                </span>
                                            )}
                                            {audit.isMasterPersonality && (
                                                <span style={{ display: 'block', color: '#ffd166', fontSize: '0.9rem' }}>
                                                    Personalidad {audit.personality}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Letter Breakdown */}
                            <div className="glass" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
                                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.5)' }}>
                                    Desglose de Letras
                                </span>
                                <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_1fr] mt-4">
                                    <div>
                                        <h5 style={{ color: '#00b4d8', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                                            Vocales (Alma): {audit.rawSoulUrge} → {audit.soulUrge}
                                        </h5>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {audit.vowelBreakdown.map((v, i) => (
                                                <span key={i} style={{
                                                    padding: '0.4rem 0.8rem',
                                                    background: 'rgba(0,180,216,0.2)',
                                                    borderRadius: '8px',
                                                    color: '#00b4d8',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {v.char}={v.value}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h5 style={{ color: '#ffd166', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                                            Consonantes (Personalidad): {audit.rawPersonality} → {audit.personality}
                                        </h5>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {audit.consonantBreakdown.map((c, i) => (
                                                <span key={i} style={{
                                                    padding: '0.4rem 0.8rem',
                                                    background: 'rgba(255,209,102,0.2)',
                                                    borderRadius: '8px',
                                                    color: '#ffd166',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {c.char}={c.value}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Report Generation Section */}
                        {audit.expression > 0 && (
                            <>
                                <div style={{ textAlign: 'center', marginTop: '4rem' }}>
                                    <button
                                        onClick={handleGenerateReport}
                                        disabled={generating}
                                        className="glass glass-hover"
                                        style={{
                                            background: 'linear-gradient(135deg, #9d4edd 0%, #7b2cbf 100%)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '1.2rem clamp(1.25rem, 6.3vw, 3rem)',
                                            maxWidth: '100%',
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            borderRadius: '100px',
                                            cursor: generating ? 'wait' : 'pointer',
                                            opacity: generating ? 0.7 : 1,
                                            boxShadow: '0 0 30px rgba(157,78,221,0.3)',
                                            letterSpacing: '1px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        {generating ? (
                                            <>
                                                <span className="typing-dot" style={{ background: 'white' }} />
                                                INVOCANDO AL ORÁCULO...
                                            </>
                                        ) : (
                                            <>✦ GENERAR REPORTE ESTELAR COMPLETO</>
                                        )}
                                    </button>
                                    <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
                                        Consultá a la Inteligencia Artificial del Oráculo para un análisis profundo de tu nombre.
                                    </p>
                                </div>

                                {report && (
                                    <div id="report-section" className="glass animate-fade" style={{
                                        marginTop: '4rem',
                                        padding: 'clamp(1.5rem, 8.4vw, 4rem)',
                                        textAlign: 'left',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        maxWidth: '900px',
                                        margin: '4rem auto 0'
                                    }}>
                                        <div style={{
                                            position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                                            background: 'linear-gradient(90deg, #9d4edd, #00b4d8, #ffd166)'
                                        }} />

                                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: 'rgba(255,255,255,0.9)' }}>
                                            {report.split('\n').map((line, i) => {
                                                if (line.startsWith('# ')) {
                                                    return <h2 key={i} style={{ fontSize: 'clamp(1.75rem, 5.3vw, 2.5rem)', color: 'white', marginTop: '2rem', marginBottom: '1.5rem', fontWeight: 800 }}>{line.replace('# ', '')}</h2>
                                                }
                                                if (line.startsWith('## ')) {
                                                    return <h3 key={i} style={{ fontSize: '1.5rem', color: '#c77dff', marginTop: '2.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>{line.replace('## ', '')}</h3>
                                                }
                                                if (line.startsWith('**')) {
                                                    return <p key={i} style={{ marginBottom: '1rem' }}>{line}</p> // Simple text render, markdown parsing would be better but keeping it simple
                                                }
                                                return <p key={i} style={{ marginBottom: '0.8rem', fontSize: '1.05rem', color: 'rgba(255,255,255,0.8)' }}>{line}</p>
                                            })}
                                        </div>

                                        <div style={{ marginTop: '4rem', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                                            — Reporte Generado por Astrolegia AI —
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )
            }

            {/* Empty State */}
            {
                !audit && (
                    <div style={{
                        textAlign: 'center',
                        padding: '4rem 2rem',
                        opacity: 0.3
                    }}>
                        <div style={{
                            fontSize: '4rem',
                            marginBottom: '1rem',
                            filter: 'grayscale(100%)'
                        }}>
                            ∞
                        </div>
                        <p style={{ color: 'white' }}>
                            La sabiduría de los números aguarda tu consulta.
                        </p>
                    </div>
                )
            }
        </div >
    );
}
