/**
 * Tokens del sistema visual "Cosmic Luxury" (Astrolegia) en formato JS.
 *
 * Transcripción 1:1 de `apps/web/src/app/globals.css` (:root) y
 * `apps/web/tailwind.config.js`. Sirve para:
 *   - consumir los mismos valores desde React Native / Expo (sin CSS vars ni Tailwind)
 *   - mantener una sola fuente de verdad si se decide abandonar el CSS global
 *
 * Si se cambia un color acá, cambiarlo también en globals.css (hex + triplete
 * RGB) y en tailwind.config.js, o mejor: generar esos archivos desde este.
 * Documento del sistema: docs/design/cosmic-luxury.md
 */

export const colors = {
    // Fondos
    bgDeep: '#03030b',        // "Pure Void" — fondo de página
    bgNebula: '#0a0a1f',      // superficies apenas levantadas

    // Acentos
    accentPrimary: '#d900ff',   // Electric Magenta — marca, estados activos
    accentSecondary: '#0088ff', // Azure Radiance — focus, links, info
    accentTertiary: '#ff0055',  // Radical Red — énfasis intenso
    accentGold: '#ffd700',      // Starlight Gold — scores, premium, identidad
    accentDanger: '#ff0055',    // alias semántico de Radical Red

    // Texto
    textPrimary: '#ffffff',
    textSecondary: '#a2a8d3',   // azul-gris cósmico
    textMuted: '#62668b',

    // Vidrio (glassmorphism)
    glassBase: 'rgba(10, 10, 20, 0.6)',
    glassBorder: 'rgba(255, 255, 255, 0.12)',
    glassHighlight: 'rgba(255, 255, 255, 0.08)',

    // Familia violeta para partículas/decoración (CosmicBackground) + cyan
    violet: ['#9d4edd', '#7b2cbf', '#c77dff', '#e0aaff'],
    cyan: '#00b4d8',

    // Semáforo de favorabilidad (Calendario / core/astrology getScoreDetails)
    favorability: {
        optimo: '#22c55e',
        favorable: '#84cc16',
        neutral: '#eab308',
        desafiante: '#f97316',
        noRecomendado: '#ef4444',
    },
} as const;

/** Tripletes "R G B" para componer con alpha: rgb(var(--x-rgb) / 0.5). */
export const colorsRgb = {
    accentPrimary: '217 0 255',
    accentSecondary: '0 136 255',
    accentTertiary: '255 0 85',
    accentGold: '255 215 0',
    accentDanger: '255 0 85',
    bgDeep: '3 3 11',
    bgNebula: '10 10 31',
} as const;

export const gradients = {
    aurora: 'linear-gradient(135deg, #d900ff 0%, #7209b7 50%, #0088ff 100%)',
    glass: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.00) 100%)',
    starsBackdrop: 'radial-gradient(circle at 50% 10%, #1a1a2e 0%, #050511 80%)',
} as const;

export const shadows = {
    neon: '0 0 20px rgba(217, 0, 255, 0.3), 0 0 40px rgba(0, 136, 255, 0.1)',
    card: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
    btnPrimary: '0 4px 15px rgba(217, 0, 255, 0.4)',
    btnPrimaryHover: '0 8px 25px rgba(0, 136, 255, 0.6)',
} as const;

export const typography = {
    // En web se cargan con next/font (Inter + Space Grotesk) y se exponen como
    // --font-inter / --font-space-grotesk. En Expo hay que cargarlas con expo-font.
    fontMain: "Inter, system-ui, -apple-system, sans-serif",
    fontHeading: "'Space Grotesk', sans-serif",
    bodyLineHeight: 1.7,
    bodySize: '1.05rem',
    h1: { size: '3.5rem', lineHeight: 1.1, letterSpacing: '-0.03em', weight: 700 },
    h2: { size: '2.5rem', lineHeight: 1.2, letterSpacing: '-0.03em', weight: 700 },
    h3: { size: '1.75rem', lineHeight: 1.3, letterSpacing: '-0.03em', weight: 700 },
    eyebrow: { size: '0.75rem', tracking: '4px', transform: 'uppercase' }, // PageHeader label
    fieldLabel: { size: '0.75rem', weight: 700, transform: 'uppercase', tracking: 'wider', opacity: 0.5 },
} as const;

export const radii = {
    pill: 100,   // botones, nav items
    card: 24,    // .glass
    input: 16,   // .input-field
    panel: 12,   // paneles anidados (rounded-xl)
} as const;

export const blur = {
    glass: 20,   // backdrop-filter: blur(20px)
} as const;

export const motion = {
    // Entradas: fade + leve subida. Loops ambientales lentos y sutiles.
    fadeIn: { duration: 500, rise: 10 },
    fadeInUp: { duration: 500, rise: 16 },
    staggerMs: [100, 200, 300],
    loops: { float: 6000, pulse: 4000, shimmer: 3000, aurora: 12000 },
    transitionRangeMs: [150, 500],
    // prefers-reduced-motion es obligatorio en toda animación nueva.
} as const;

export const layout = {
    containerMaxWidth: 1400,
    containerPaddingX: '2rem',
    breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1440 },
} as const;

export const cosmicLuxury = { colors, colorsRgb, gradients, shadows, typography, radii, blur, motion, layout } as const;
export type CosmicLuxuryTokens = typeof cosmicLuxury;
