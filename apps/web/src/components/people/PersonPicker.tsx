"use client";

/**
 * PersonPicker — selector reutilizable "¿Para quién?".
 *
 * Dropdown con tres fuentes:
 *   1. "Yo": el perfil propio del usuario (useAuth().profile, NatalProfile con
 *      isSelf); se deshabilita si todavía no cargó sus datos.
 *   2. Personas guardadas: listPeople() de people-service (API).
 *   3. "Nueva persona": abre BirthDataForm inline y persiste con
 *      createPerson; la persona creada queda seleccionada.
 *
 * Props:
 *   - onSelect(person | null): requerido. null = "Yo".
 *   - allowSelf?: boolean (default true). false oculta la opción "Yo".
 *   - label?: string (default '¿Para quién?'). Pasá '' para ocultar el label.
 *   - className?: string en el contenedor raíz.
 *
 * El componente es no-controlado: mantiene su propia selección visual y
 * notifica cada cambio por onSelect.
 */

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, User, Users, UserPlus, Loader2, X } from 'lucide-react';
import type { NatalProfileWithChartsDTO } from '@astrolegia/contracts';
import { useAuth } from '@/context/AuthContext';
import { listPeople, createPerson } from '@/services/people-service';
import BirthDataForm, {
    emptyBirthDataFormValue,
    validateBirthDataForm,
    formValueToBirthFields,
    type BirthDataFormValue,
} from './BirthDataForm';
import { cityLabel, formatPersonBirthDate, errorMessage } from './person-chart';
import { FieldLabel } from './ui';

export interface PersonPickerProps {
    /** null = "Yo" (perfil propio); persona guardada o recién creada en otro caso. */
    onSelect: (person: NatalProfileWithChartsDTO | null) => void;
    /** default true; false oculta la opción "Yo". */
    allowSelf?: boolean;
    /** default '¿Para quién?'; '' oculta el label. */
    label?: string;
    className?: string;
}

type Selection = { kind: 'self' } | { kind: 'person'; person: NatalProfileWithChartsDTO } | null;

export default function PersonPicker({
    onSelect,
    allowSelf = true,
    label = '¿Para quién?',
    className = '',
}: PersonPickerProps) {
    const { user, profile } = useAuth();
    const [open, setOpen] = useState(false);
    const [people, setPeople] = useState<NatalProfileWithChartsDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [selection, setSelection] = useState<Selection>(null);

    // Alta inline
    const [creating, setCreating] = useState(false);
    const [formValue, setFormValue] = useState<BirthDataFormValue>(emptyBirthDataFormValue());
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const rootRef = useRef<HTMLDivElement>(null);

    // Cargar personas guardadas al montar (con usuario)
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        setLoading(true);
        listPeople()
            .then(list => { if (!cancelled) setPeople(list); })
            .catch(err => console.error('[PersonPicker] Error listando personas:', err))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [user]);

    // Cerrar al clickear afuera
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selfHasBirthData = !!profile;

    const pickSelf = () => {
        setSelection({ kind: 'self' });
        setOpen(false);
        onSelect(null);
    };

    const pickPerson = (person: NatalProfileWithChartsDTO) => {
        setSelection({ kind: 'person', person });
        setOpen(false);
        onSelect(person);
    };

    const handleCreate = async () => {
        if (!user) return;
        const error = validateBirthDataForm(formValue);
        if (error) { setFormError(error); return; }
        const fields = formValueToBirthFields(formValue);
        if (!fields) { setFormError('Datos inválidos.'); return; }

        setSaving(true);
        setFormError(null);
        try {
            const created = await createPerson(fields);
            setPeople(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            setCreating(false);
            setFormValue(emptyBirthDataFormValue());
            pickPerson(created);
        } catch (err) {
            console.error('[PersonPicker] Error creando persona:', err);
            setFormError(errorMessage(err, 'No se pudo guardar la persona.'));
        } finally {
            setSaving(false);
        }
    };

    const selfLabel = `Yo — ${profile?.name || user?.name || 'Mi carta'}`;
    const selectedLabel = selection === null
        ? 'Elegí una persona'
        : selection.kind === 'self'
            ? selfLabel
            : selection.person.name;

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            {label && (
                <div className="mb-2">
                    <FieldLabel>{label}</FieldLabel>
                </div>
            )}

            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="input-field flex items-center justify-between gap-3 text-left cursor-pointer hover:border-white/25 transition-colors"
            >
                <span className={`flex items-center gap-2 truncate ${selection === null ? 'text-white/40' : 'text-white'}`}>
                    {selection?.kind === 'self'
                        ? <User className="w-4 h-4 text-[var(--accent-secondary)] shrink-0" />
                        : <Users className="w-4 h-4 text-white/40 shrink-0" />}
                    <span className="truncate">{selectedLabel}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Panel */}
            {open && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0514] border border-white/20 rounded-xl shadow-2xl z-[90] overflow-hidden animate-fade-in">
                    <div className="max-h-72 overflow-y-auto custom-scrollbar">
                        {/* Yo */}
                        {allowSelf && (
                            <button
                                type="button"
                                onClick={pickSelf}
                                disabled={!selfHasBirthData}
                                className="w-full text-left p-3 px-4 flex items-center gap-3 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-b border-white/5"
                            >
                                <User className="w-4 h-4 text-[var(--accent-secondary)] shrink-0" />
                                <span className="flex flex-col">
                                    <span className="text-sm font-medium text-white">{selfLabel}</span>
                                    <span className="text-xs text-white/40">
                                        {selfHasBirthData
                                            ? 'Datos de tu perfil'
                                            : 'Todavía no cargaste tus datos de nacimiento'}
                                    </span>
                                </span>
                            </button>
                        )}

                        {/* Personas guardadas */}
                        {loading ? (
                            <div className="p-4 flex items-center gap-2 text-white/40 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" /> Cargando personas...
                            </div>
                        ) : people.length === 0 ? (
                            <div className="p-4 text-white/40 text-sm">Todavía no guardaste personas.</div>
                        ) : (
                            people.map(person => (
                                <button
                                    key={person.id}
                                    type="button"
                                    onClick={() => pickPerson(person)}
                                    className="w-full text-left p-3 px-4 flex items-center gap-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                                >
                                    <Users className="w-4 h-4 text-white/40 shrink-0" />
                                    <span className="flex flex-col">
                                        <span className="text-sm font-medium text-white">{person.name}</span>
                                        <span className="text-xs text-white/40">
                                            {formatPersonBirthDate(person)}
                                            {cityLabel(person) ? ` · ${cityLabel(person)}` : ''}
                                        </span>
                                    </span>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Nueva persona */}
                    <div className="border-t border-white/10">
                        {!creating ? (
                            <button
                                type="button"
                                onClick={() => setCreating(true)}
                                className="w-full text-left p-3 px-4 flex items-center gap-3 text-sm font-medium text-[var(--accent-primary)] hover:bg-white/10 transition-colors"
                            >
                                <UserPlus className="w-4 h-4 shrink-0" />
                                Nueva persona
                            </button>
                        ) : (
                            <div className="p-4 space-y-4 bg-black/30 max-md:max-h-[60vh] max-md:overflow-y-auto">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">Nueva persona</span>
                                    <button
                                        type="button"
                                        onClick={() => { setCreating(false); setFormError(null); }}
                                        className="text-white/40 hover:text-white transition-colors"
                                        aria-label="Cancelar"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <BirthDataForm
                                    value={formValue}
                                    onChange={setFormValue}
                                    onSubmit={handleCreate}
                                    submitLabel="Guardar y seleccionar"
                                    busy={saving}
                                />
                                {formError && <p className="text-xs text-red-400">{formError}</p>}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
