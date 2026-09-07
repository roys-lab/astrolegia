"use client";

/**
 * Toast del sistema Cosmic Luxury — reemplazo de los alert() nativos.
 * Vive en system/ porque lo usan varias secciones (personas, proyectos,
 * red, auth). El caller puede manejar el estado a mano o usar useToast().
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export interface ToastState {
    msg: string;
    type: 'success' | 'error';
}

export const Toast = ({ toast, onClose }: { toast: ToastState; onClose: () => void }) => (
    <div
        className={`fixed bottom-4 inset-x-4 md:bottom-8 md:left-auto md:right-8 z-[100] p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 animate-fade-in-up ${toast.type === 'error' ? 'bg-red-900/40 border-red-500/30' : 'bg-green-900/40 border-green-500/30'}`}
    >
        {toast.type === 'error'
            ? <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            : <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />}
        <p className="text-white/85 text-sm max-w-xs">{toast.msg}</p>
        <button onClick={onClose} className="ml-2 text-white/40 hover:text-white transition-colors" aria-label="Cerrar">
            <X className="w-4 h-4" />
        </button>
    </div>
);

/** Estado de toast con auto-cierre (5s por defecto). */
export function useToast(autoHideMs = 5000) {
    const [toast, setToast] = useState<ToastState | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hideToast = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        setToast(null);
    }, []);

    const showToast = useCallback((msg: string, type: ToastState['type'] = 'error') => {
        if (timer.current) clearTimeout(timer.current);
        setToast({ msg, type });
        timer.current = setTimeout(() => setToast(null), autoHideMs);
    }, [autoHideMs]);

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    return { toast, showToast, hideToast };
}
