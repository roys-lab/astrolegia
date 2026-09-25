/**
 * Acentos del sistema "Cosmic Luxury" compartidos por los componentes de
 * src/components/system. Mapean a los tokens Tailwind accent-* definidos en
 * tailwind.config.js (que a su vez leen las variables --accent-*-rgb de
 * src/app/globals.css).
 */

export type SystemAccent = 'primary' | 'secondary' | 'gold';

export const ACCENT_TEXT: Record<SystemAccent, string> = {
    primary: 'text-accent-primary',
    secondary: 'text-accent-secondary',
    gold: 'text-accent-gold',
};

/**
 * Borde izquierdo de acento (3px). Usa `!important` porque `.glass`
 * (definido en globals.css DESPUÉS de @tailwind utilities) pisa los
 * utilities de borde de igual especificidad.
 */
export const ACCENT_BORDER_L: Record<SystemAccent, string> = {
    primary: '!border-l-[3px] !border-l-accent-primary',
    secondary: '!border-l-[3px] !border-l-accent-secondary',
    gold: '!border-l-[3px] !border-l-accent-gold',
};
