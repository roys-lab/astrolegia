"use client";

/**
 * /people/[id] — Detalle de una persona.
 *
 * - Datos de nacimiento editables (BirthDataForm + PATCH /v1/client/people/:id).
 * - Carta natal renderizada (rueda propia ZodiacWheel; SVG de la API como
 *   referencia) + grilla de posiciones (ChartBodiesGrid).
 * - Botón regenerar (POST /v1/client/people/:id/charts/natal); banner si la
 *   carta guardada es de un motor anterior o si los datos cambiaron (el
 *   estado lo calcula la API y viaja en charts[].status).
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    ArrowLeft, Loader2, Sparkles, RefreshCw, AlertTriangle,
    Save, UserRound, Sun, MoonStar,
} from 'lucide-react';
import type { ChartCalculationDTO, NatalProfileWithChartsDTO } from '@astrolegia/contracts';
import { useAuth } from '@/context/AuthContext';
import { getPerson, updatePerson, getPersonChart, generateNatalChart } from '@/services/people-service';
import BirthDataForm, {
    personToFormValue,
    emptyBirthDataFormValue,
    validateBirthDataForm,
    formValueToBirthFields,
    type BirthDataFormValue,
} from '@/components/people/BirthDataForm';
import ChartBodiesGrid from '@/components/people/ChartBodiesGrid';
import ZodiacWheel from '@/components/astrology/ZodiacWheel';
import {
    natalStatus,
    natalPayload,
    sunSignFromChart,
    risingSignFromChart,
    cityLabel,
    formatPersonBirthDate,
    formatPersonBirthTime,
    errorMessage,
} from '@/components/people/person-chart';
import { GlassCard, PeopleToast, type ToastState } from '@/components/people/ui';

export default function PersonDetailPage() {
    const params = useParams<{ id: string }>();
    const personId = typeof params?.id === 'string' ? params.id : '';
    const { user, loading: authLoading } = useAuth();

    const [person, setPerson] = useState<NatalProfileWithChartsDTO | null>(null);
    const [chart, setChart] = useState<ChartCalculationDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const [formValue, setFormValue] = useState<BirthDataFormValue>(emptyBirthDataFormValue());
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);
    // Vista de la carta: rueda propia (ZodiacWheel) por defecto, SVG de la API como referencia
    const [showClassicChart, setShowClassicChart] = useState(false);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const load = useCallback(async (id: string) => {
        setLoading(true);
        try {
            const [p, c] = await Promise.all([
                getPerson(id),
                getPersonChart(id, 'natal'),
            ]);
            if (!p) {
                setNotFound(true);
                return;
            }
            setPerson(p);
            setFormValue(personToFormValue(p));
            setChart(c);
        } catch (err) {
            console.error('[Personas] Error cargando:', err);
            setToast({ msg: errorMessage(err, 'No se pudo cargar la persona.'), type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user && personId) void load(personId);
    }, [user, personId, load]);

    const handleSave = async () => {
        if (!user || !person) return;
        const error = validateBirthDataForm(formValue);
        if (error) { setToast({ msg: error, type: 'error' }); return; }
        const fields = formValueToBirthFields(formValue);
        if (!fields) return;

        setSaving(true);
        try {
            const updated = await updatePerson(person.id, fields);
            setPerson(updated);
            setFormValue(personToFormValue(updated));
            setToast({ msg: 'Datos de nacimiento actualizados.', type: 'success' });
        } catch (err) {
            console.error('[Personas] Error guardando:', err);
            setToast({ msg: errorMessage(err, 'No se pudieron guardar los cambios.'), type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleGenerate = async () => {
        if (!user || !person || generating) return;
        setGenerating(true);
        try {
            const { chart: newChart, profile } = await generateNatalChart(person.id);
            setPerson(profile);
            setFormValue(personToFormValue(profile));
            setChart(newChart);
            setToast({ msg: 'Carta natal generada con el motor actual.', type: 'success' });
        } catch (err) {
            console.error('[Personas] Error generando carta:', err);
            setToast({ msg: errorMessage(err, 'Error generando la carta.'), type: 'error' });
        } finally {
            setGenerating(false);
        }
    };

    if (authLoading || (loading && !notFound)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-[var(--accent-primary)] animate-spin mb-4" />
                <p className="text-white/40 text-sm">Cargando persona...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <UserRound className="w-12 h-12 text-white/20 mb-4" />
                <p className="text-white/60">Iniciá sesión para ver esta persona.</p>
            </div>
        );
    }

    if (notFound || !person) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <UserRound className="w-12 h-12 text-white/20 mb-4" />
                <h1 className="text-2xl font-heading font-bold text-white mb-2">Persona no encontrada</h1>
                <p className="text-white/50 mb-6">Puede haber sido eliminada.</p>
                <Link href="/people" className="btn-primary flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Volver a Personas
                </Link>
            </div>
        );
    }

    const status = natalStatus(person);
    const sunSign = sunSignFromChart(chart);
    const risingSign = risingSignFromChart(chart);
    const time = formatPersonBirthTime(person);
    const city = cityLabel(person);
    const payload = natalPayload(chart);
    const svg = payload?.chart;
    const wheelSubject = payload?.chart_data?.subject;

    return (
        <div className="max-w-7xl mx-auto pb-24 space-y-6 md:space-y-8 animate-fade-in-up">
            {/* HEADER */}
            <header className="space-y-4">
                <Link
                    href="/people"
                    className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Personas
                </Link>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-heading font-bold text-white">{person.name}</h1>
                        <p className="text-white/60 mt-1">
                            {formatPersonBirthDate(person)}
                            {time ? ` · ${time}` : ' · Hora desconocida'}
                            {city ? ` · ${city}` : ''}
                        </p>
                    </div>
                    {(sunSign || risingSign) && (
                        <div className="flex items-center flex-wrap gap-3">
                            {sunSign && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-[var(--accent-gold)]/30 text-sm text-white/80">
                                    <Sun className="w-4 h-4 text-[var(--accent-gold)]" />
                                    {sunSign}
                                </span>
                            )}
                            {risingSign && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-[var(--accent-secondary)]/30 text-sm text-white/80">
                                    <MoonStar className="w-4 h-4 text-[var(--accent-secondary)]" />
                                    ASC {risingSign}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </header>

            {/* BANNER DE CARTA DESACTUALIZADA */}
            {status === 'stale-engine' && (
                <div className="glass p-4 px-4 md:px-6 border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-sm text-white/80 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                        Carta calculada con una versión anterior del motor. Regenerala.
                    </p>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="self-start sm:self-auto px-4 py-3 md:py-1.5 rounded-full border border-[var(--accent-gold)]/50 text-xs uppercase tracking-wider text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/10 transition-all disabled:opacity-50"
                    >
                        {generating ? 'Regenerando...' : 'Regenerar ahora'}
                    </button>
                </div>
            )}
            {status === 'stale-data' && (
                <div className="glass p-4 px-4 md:px-6 border border-[var(--accent-secondary)]/30 bg-[var(--accent-secondary)]/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-sm text-white/80 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[var(--accent-secondary)] shrink-0" />
                        Los datos de nacimiento cambiaron desde que se calculó esta carta. Regenerala.
                    </p>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="self-start sm:self-auto px-4 py-3 md:py-1.5 rounded-full border border-[var(--accent-secondary)]/50 text-xs uppercase tracking-wider text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/10 transition-all disabled:opacity-50"
                    >
                        {generating ? 'Regenerando...' : 'Regenerar ahora'}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                {/* COL IZQUIERDA: DATOS EDITABLES */}
                <div className="lg:col-span-4 space-y-6">
                    <GlassCard className="relative overflow-visible z-30">
                        <h2 className="text-xl font-heading text-white mb-6 flex items-center gap-2">
                            <Save className="w-5 h-5 text-[var(--accent-primary)]" />
                            Datos de nacimiento
                        </h2>
                        <BirthDataForm
                            value={formValue}
                            onChange={setFormValue}
                            onSubmit={handleSave}
                            submitLabel="Guardar cambios"
                            busy={saving}
                        />
                    </GlassCard>
                </div>

                {/* COL DERECHA: CARTA */}
                <div className="lg:col-span-8 space-y-6">
                    {chart && (svg || wheelSubject) ? (
                        <>
                            {/* Rueda propia por defecto; la SVG de la API queda como referencia de validación */}
                            <GlassCard className="flex flex-col items-center justify-center bg-[#03030b] min-h-[340px] md:min-h-[500px] relative overflow-hidden border-[var(--accent-primary)]/20">
                                {wheelSubject && !showClassicChart ? (
                                    <div className="w-full max-w-[620px] py-2">
                                        <ZodiacWheel
                                            subject={wheelSubject}
                                            aspects={payload?.chart_data?.aspects}
                                        />
                                    </div>
                                ) : svg ? (
                                    <div
                                        dangerouslySetInnerHTML={{ __html: svg }}
                                        className="w-full h-full flex items-center justify-center transform scale-100 md:scale-110 origin-center max-md:[&_svg]:max-w-full max-md:[&_svg]:h-auto"
                                    />
                                ) : null}
                                {Boolean(wheelSubject) && Boolean(svg) && (
                                    <button
                                        onClick={() => setShowClassicChart(v => !v)}
                                        className="mt-4 text-[11px] uppercase tracking-wider text-white/35 hover:text-white/70 transition-colors"
                                    >
                                        {showClassicChart ? 'Ver rueda Astrolegia' : 'Ver carta clásica'}
                                    </button>
                                )}
                            </GlassCard>

                            <div className="flex items-center justify-between flex-wrap gap-y-2">
                                <p className="text-xs text-white/30 uppercase tracking-wider">
                                    Calculada el {new Date(chart.calculatedAt).toLocaleDateString('es-AR')}
                                </p>
                                <button
                                    onClick={handleGenerate}
                                    disabled={generating}
                                    className="flex items-center gap-2 px-4 py-2.5 md:py-2 rounded-full border border-[var(--accent-primary)]/40 text-sm text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-all disabled:opacity-50"
                                >
                                    {generating
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <RefreshCw className="w-4 h-4" />}
                                    {generating ? 'Regenerando...' : 'Regenerar carta'}
                                </button>
                            </div>

                            <ChartBodiesGrid subject={wheelSubject} />
                        </>
                    ) : (
                        <GlassCard className="flex flex-col items-center justify-center text-center p-12 max-md:p-6 min-h-[340px] md:min-h-[500px] border-dashed border-2 border-white/10">
                            <Sparkles className="w-12 h-12 text-white/20 mb-4" />
                            <h3 className="text-2xl font-heading font-bold text-white mb-2">Carta no generada</h3>
                            <p className="text-white/50 max-w-sm mb-8">
                                Generá la carta natal de {person.name.split(' ')[0]} para ver el mapa y las posiciones planetarias.
                            </p>
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="btn-primary flex items-center gap-2 disabled:opacity-50"
                            >
                                {generating
                                    ? <Loader2 className="w-5 h-5 animate-spin" />
                                    : <Sparkles className="w-5 h-5" />}
                                {generating ? 'Calculando...' : 'Generar carta natal'}
                            </button>
                        </GlassCard>
                    )}
                </div>
            </div>

            {toast && <PeopleToast toast={toast} onClose={() => setToast(null)} />}
        </div>
    );
}
