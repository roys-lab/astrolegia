import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Página no encontrada' };

export default function NotFound() {
    return (
        <main className="min-h-[70vh] flex items-center justify-center px-6 py-24">
            <div className="glass rounded-3xl px-8 py-12 md:px-16 text-center max-w-lg animate-fade-in-up">
                <p
                    className="text-gradient text-7xl md:text-8xl font-bold tracking-tight animate-float"
                    style={{ fontFamily: 'var(--font-heading)' }}
                >
                    404
                </p>
                <h1 className="mt-6 text-2xl md:text-3xl font-bold text-white">
                    Esta página se perdió entre las estrellas
                </h1>
                <p className="mt-3 text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>
                    La órbita que buscás no existe o cambió de dirección.
                </p>
                <div className="mt-8 flex justify-center">
                    <Link href="/" className="btn-primary">
                        Volver al inicio
                    </Link>
                </div>
            </div>
        </main>
    );
}
