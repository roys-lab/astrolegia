'use client';

import JourneySection from '@/components/home/JourneySection';
import ToolShowcase from '@/components/home/ToolShowcase';
import CosmicStatusSection from '@/components/home/CosmicStatusSection';

// =============================================
// CONOCER PAGE — "Conocé a fondo Astrolegia"
// All the detail sections from the original home
// =============================================

export default function ConocerPage() {
    return (
        <main className="bg-[#03030b] text-white overflow-x-hidden">
            {/* Chapter 1: "Tu Viaje" — 3 pillars narrative */}
            <JourneySection />

            {/* Chapter 2: Tool showcase — tiered cards */}
            <ToolShowcase />

            {/* Chapter 3: Cosmic status + Final CTA */}
            <CosmicStatusSection />
        </main>
    );
}
