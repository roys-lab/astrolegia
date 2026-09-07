'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main className="min-h-[70vh] flex items-center justify-center px-6 py-24">
            <div className="glass rounded-3xl px-8 py-12 md:px-16 text-center max-w-lg animate-fade-in-up">
                <p
                    className="text-gradient text-5xl md:text-6xl font-bold tracking-tight"
                    style={{ fontFamily: 'var(--font-heading)' }}
                >
                    ✦
                </p>
                <h1 className="mt-6 text-2xl md:text-3xl font-bold text-white">
                    Algo se desalineó en el cosmos
                </h1>
                <p className="mt-3 text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>
                    Hubo un error inesperado. Probá de nuevo en un momento.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                    <button onClick={reset} className="btn-primary">
                        Reintentar
                    </button>
                    <Link
                        href="/"
                        className="px-6 py-3 rounded-xl border text-sm font-semibold text-white/80 hover:text-white transition-colors"
                        style={{ borderColor: 'var(--glass-border)' }}
                    >
                        Volver al inicio
                    </Link>
                </div>
                {error.digest && (
                    <p className="mt-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                        Código: {error.digest}
                    </p>
                )}
            </div>
        </main>
    );
}
