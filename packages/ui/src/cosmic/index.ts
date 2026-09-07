/**
 * Primitivas del sistema visual "Cosmic Luxury" (ver docs/design/cosmic-luxury.md).
 * Componentes class-driven: la estructura vive acá, el CSS (.glass, accent-*,
 * animate-fade-in-up) lo aporta la hoja de estilos de cada app.
 */
export { GlassCard, type GlassCardProps } from './GlassCard';
export { PageHeader, type PageHeaderProps } from './PageHeader';
export { StatBadge, type StatBadgeProps } from './StatBadge';
export { Toast, useToast, type ToastState } from './Toast';
export { ACCENT_TEXT, ACCENT_BORDER_L, type SystemAccent } from './accents';
