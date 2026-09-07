'use client';

import { usePathname } from 'next/navigation';

// =============================================
// LAYOUT CONTENT WRAPPER
// Conditionally applies container + padding for inner pages.
// Landing page (/) gets full-screen, no-padding rendering.
// Full-screen sections match by prefix (cover their subrutas).
// =============================================

const FULL_SCREEN_PREFIXES = ['/constelaciones', '/conocer', '/dna/guide', '/oracle-angels'];

export default function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isFullScreen =
        pathname === '/' ||
        FULL_SCREEN_PREFIXES.some(
            (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
        );

    if (isFullScreen) {
        return (
            <main className="animate-fade">
                {children}
            </main>
        );
    }

    // NOTE: the `!` (important) modifier is required: `.container` in globals.css
    // declares the shorthand `padding: 0 2rem` AFTER `@tailwind utilities`, so a
    // plain `pt-*` utility of equal specificity would be overridden (the previous
    // inline style won for the same reason). Desktop value stays exactly 160px.
    return (
        <main className="container animate-fade !pt-[120px] md:!pt-[160px]">
            {children}
        </main>
    );
}
