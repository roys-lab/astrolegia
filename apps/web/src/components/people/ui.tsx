"use client";

/**
 * Primitivas visuales compartidas de la sección Personas.
 * Siguen el sistema "Cosmic Luxury": .glass, labels uppercase con tracking,
 * acentos vía variables CSS (--accent-primary / --accent-secondary / --accent-gold).
 */

// GlassCard y Toast ahora viven en el sistema de componentes
// (src/components/system). Se re-exportan desde acá por compatibilidad
// con los imports existentes.
export { GlassCard, type GlassCardProps } from '@astrolegia/ui';
export { Toast as PeopleToast, type ToastState } from '@astrolegia/ui';

export const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="text-xs font-bold uppercase tracking-wider text-white/50">{children}</label>
);
