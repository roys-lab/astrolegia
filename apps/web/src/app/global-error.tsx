'use client';

// Reemplaza al layout raíz cuando el error ocurre ahí mismo, así que no puede
// depender de globals.css ni de los providers: estilos inline y HTML propio.
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="es">
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'radial-gradient(circle at 50% 10%, #1a1a2e 0%, #03030b 80%)',
                    color: '#ffffff',
                    fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
                    textAlign: 'center',
                    padding: '2rem',
                }}
            >
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>
                        Algo se desalineó en el cosmos
                    </h1>
                    <p style={{ color: '#a2a8d3', marginBottom: '2rem' }}>
                        Hubo un error inesperado. Probá recargando la página.
                    </p>
                    <button
                        onClick={reset}
                        style={{
                            cursor: 'pointer',
                            padding: '0.75rem 2rem',
                            borderRadius: '0.75rem',
                            border: 'none',
                            fontWeight: 700,
                            color: '#ffffff',
                            background: 'linear-gradient(135deg, #d900ff 0%, #7209b7 50%, #0088ff 100%)',
                        }}
                    >
                        Reintentar
                    </button>
                    {error.digest && (
                        <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#62668b' }}>
                            Código: {error.digest}
                        </p>
                    )}
                </div>
            </body>
        </html>
    );
}
