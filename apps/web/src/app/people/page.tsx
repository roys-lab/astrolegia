"use client";

/**
 * /people — Galería central de cartas de gente (propia y de otros).
 *
 * - Tarjetas .glass por persona: nombre, fecha, ciudad, chip de signo solar
 *   (resumen de la carta natal que ya viene en GET /v1/client/people).
 * - Acciones: Ver (detalle), Generar carta (la calcula la API), Eliminar
 *   (confirmación en dos pasos).
 * - Alta con BirthDataForm en modal.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Users, UserPlus, Eye, Trash2, Sparkles, Loader2, Sun, X,
    MapPin, CalendarDays, Clock,
} from 'lucide-react';
import type { NatalProfileWithChartsDTO } from '@astrolegia/contracts';
import { useAuth } from '@/context/AuthContext';
import {
    listPeople,
    createPerson,
    deletePerson,
    generateNatalChart,
} from '@/services/people-service';
import BirthDataForm, {
    emptyBirthDataFormValue,
    validateBirthDataForm,
    formValueToBirthFields,
    type BirthDataFormValue,
} from '@/components/people/BirthDataForm';
import {
    natalSummary,
    cityLabel,
    formatPersonBirthDate,
    formatPersonBirthTime,
    errorMessage,
} from '@/components/people/person-chart';
import { GlassCard, PeopleToast, type ToastState } from '@/components/people/ui';

export default function PeoplePage() {
    const { user, loading: authLoading } = useAuth();

    const [people, setPeople] = useState<NatalProfileWithChartsDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<ToastState | null>(null);

    // Alta (modal)
    const [showAddModal, setShowAddModal] = useState(false);
    const [formValue, setFormValue] = useState<BirthDataFormValue>(emptyBirthDataFormValue());
    const [saving, setSaving] = useState(false);

    // Acciones por tarjeta
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Auto-reset de la confirmación de borrado
    useEffect(() => {
        if (confirmDeleteId) {
            const timer = setTimeout(() => setConfirmDeleteId(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [confirmDeleteId]);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            setPeople(await listPeople());
        } catch (err) {
            console.error('[Personas] Error listando:', err);
            setToast({ msg: errorMessage(err, 'No se pudieron cargar las personas.'), type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) void reload();
    }, [user, reload]);

    const handleCreate = async () => {
        if (!user) return;
        const error = validateBirthDataForm(formValue);
        if (error) { setToast({ msg: error, type: 'error' }); return; }
        const fields = formValueToBirthFields(formValue);
        if (!fields) return;

        setSaving(true);
        try {
            await createPerson(fields);
            setShowAddModal(false);
            setFormValue(emptyBirthDataFormValue());
            setToast({ msg: `${fields.name} sumada a tu constelación de personas.`, type: 'success' });
            await reload();
        } catch (err) {
            console.error('[Personas] Error creando:', err);
            setToast({ msg: errorMessage(err, 'No se pudo guardar la persona.'), type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleGenerate = async (person: NatalProfileWithChartsDTO) => {
        if (!user || generatingId) return;
        setGeneratingId(person.id);
        try {
            const { profile } = await generateNatalChart(person.id);
            setPeople(prev => prev.map(p => (p.id === profile.id ? profile : p)));
            setToast({ msg: `Carta natal de ${person.name} generada.`, type: 'success' });
        } catch (err) {
            console.error('[Personas] Error generando carta:', err);
            setToast({ msg: errorMessage(err, 'Error generando la carta.'), type: 'error' });
        } finally {
            setGeneratingId(null);
        }
    };

    const handleDelete = async (person: NatalProfileWithChartsDTO) => {
        if (!user) return;
        if (confirmDeleteId !== person.id) {
            setConfirmDeleteId(person.id);
            return;
        }
        setConfirmDeleteId(null);
        try {
            await deletePerson(person.id);
            setPeople(prev => prev.filter(p => p.id !== person.id));
            setToast({ msg: `${person.name} eliminada.`, type: 'success' });
        } catch (err) {
            console.error('[Personas] Error eliminando:', err);
            setToast({ msg: errorMessage(err, 'No se pudo eliminar.'), type: 'error' });
        }
    };

    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-[var(--accent-primary)] animate-spin mb-4" />
                <p className="text-white/40 text-sm">Conectando con el cosmos...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Users className="w-12 h-12 text-white/20 mb-4" />
                <h1 className="text-2xl font-heading font-bold text-white mb-2">Personas</h1>
                <p className="text-white/60">Iniciá sesión para ver tu galería de cartas.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto pb-24 space-y-6 md:space-y-8 animate-fade-in-up">
            {/* HEADER */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <span className="text-xs uppercase tracking-[4px] text-[var(--accent-primary)] block mb-2">
                        Galería de cartas
                    </span>
                    <h1 className="text-3xl md:text-4xl font-heading font-bold text-white">Personas</h1>
                    <p className="text-white/60 mt-2">
                        Tu constelación de gente: cartas natales propias y de quienes te rodean.
                    </p>
                </div>
                <button
                    onClick={() => { setFormValue(emptyBirthDataFormValue()); setShowAddModal(true); }}
                    className="btn-primary flex items-center gap-2 self-start md:self-auto"
                >
                    <UserPlus className="w-5 h-5" />
                    Agregar persona
                </button>
            </header>

            {/* CONTENIDO */}
            {loading ? (
                <GlassCard className="flex items-center justify-center min-h-[300px]">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 text-[var(--accent-primary)] animate-spin" />
                        <p className="text-white/50 text-sm">Cargando personas...</p>
                    </div>
                </GlassCard>
            ) : people.length === 0 ? (
                <GlassCard className="flex flex-col items-center justify-center text-center p-12 max-md:p-6 min-h-[400px] border-dashed border-2 border-white/10">
                    <Users className="w-14 h-14 text-white/20 mb-4" />
                    <h2 className="text-2xl font-heading font-bold text-white mb-2">Todavía no hay personas</h2>
                    <p className="text-white/50 max-w-md mb-8">
                        Agregá a tu gente con sus datos de nacimiento para calcular cartas natales y numerología.
                    </p>
                    <button
                        onClick={() => { setFormValue(emptyBirthDataFormValue()); setShowAddModal(true); }}
                        className="btn-primary flex items-center justify-center gap-2"
                    >
                        <UserPlus className="w-5 h-5" />
                        Agregar persona
                    </button>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {people.map(person => {
                        const summary = natalSummary(person);
                        const time = formatPersonBirthTime(person);
                        const city = cityLabel(person);
                        const isGenerating = generatingId === person.id;
                        return (
                            <div key={person.id} className="glass glass-hover p-5 md:p-6 border border-white/5 bg-[#0a0514]/80 flex flex-col gap-4">
                                {/* Nombre + chips */}
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="text-lg font-heading font-bold text-white leading-tight">
                                        {person.name}
                                    </h3>
                                    {summary?.sunSign && (
                                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-[var(--accent-gold)]/30 text-xs text-white/80 shrink-0">
                                            <Sun className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                                            {summary.sunSign}
                                        </span>
                                    )}
                                </div>

                                {/* Datos */}
                                <div className="space-y-1.5 text-sm text-white/60 flex-1">
                                    <p className="flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4 text-white/30 shrink-0" />
                                        {formatPersonBirthDate(person)}
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-white/30 shrink-0" />
                                        {time ?? 'Hora desconocida'}
                                    </p>
                                    {city && (
                                        <p className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-white/30 shrink-0" />
                                            <span className="truncate">{city}</span>
                                        </p>
                                    )}
                                    {summary?.status === 'stale-engine' && (
                                        <p className="text-xs text-[var(--accent-gold)]">
                                            Carta de una versión anterior del motor
                                        </p>
                                    )}
                                    {summary?.status === 'stale-data' && (
                                        <p className="text-xs text-[var(--accent-secondary)]">
                                            Los datos cambiaron desde el cálculo: regenerá la carta
                                        </p>
                                    )}
                                </div>

                                {/* Acciones */}
                                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                    <Link
                                        href={`/people/${person.id}`}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 md:py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-all"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Ver
                                    </Link>
                                    <button
                                        onClick={() => handleGenerate(person)}
                                        disabled={isGenerating || generatingId !== null}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 md:py-2 rounded-xl border border-[var(--accent-primary)]/40 text-sm text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-all disabled:opacity-40"
                                    >
                                        {isGenerating
                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : <Sparkles className="w-4 h-4" />}
                                        {isGenerating ? 'Calculando' : 'Carta'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(person)}
                                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 md:py-2 rounded-xl border text-sm transition-all ${confirmDeleteId === person.id
                                            ? 'border-red-500/60 bg-red-500/15 text-red-300'
                                            : 'border-white/10 text-white/40 hover:text-red-400 hover:border-red-500/40'
                                            }`}
                                        title={confirmDeleteId === person.id ? 'Confirmá el borrado' : 'Eliminar'}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {confirmDeleteId === person.id && '¿Seguro?'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL: AGREGAR PERSONA */}
            {showAddModal && (
                <div
                    className="fixed inset-0 z-[80] flex items-start md:items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
                    onMouseDown={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}
                >
                    <div className="glass p-6 md:p-8 border border-white/10 bg-[#0a0514]/95 w-full max-w-lg my-4 md:my-8 max-md:max-h-[85vh] max-md:overflow-y-auto animate-fade-in-up">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-[var(--accent-primary)]" />
                                Nueva persona
                            </h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-white/40 hover:text-white transition-colors"
                                aria-label="Cerrar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <BirthDataForm
                            value={formValue}
                            onChange={setFormValue}
                            onSubmit={handleCreate}
                            submitLabel="Guardar persona"
                            busy={saving}
                        />
                    </div>
                </div>
            )}

            {toast && <PeopleToast toast={toast} onClose={() => setToast(null)} />}
        </div>
    );
}
