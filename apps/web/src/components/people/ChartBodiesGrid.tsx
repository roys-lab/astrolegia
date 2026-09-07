"use client";

/**
 * ChartBodiesGrid — grilla de posiciones de una carta natal.
 *
 * Recibe el `subject` crudo de la API (chart_data.subject) y renderiza los
 * cuerpos whitelisteados (planetas + Quirón/Nodos/Lilith) vía
 * extractChartBodies de src/lib/chart-display.ts, agrupados en Personales /
 * Sociales / Kármicos, más el Ascendente. Iconos lucide (sin emojis).
 */

import { Sun, Moon, Orbit, Sparkles, ArrowUp } from 'lucide-react';
import {
    extractChartBodies,
    translateSign,
    getAbsolutePosition,
    formatDegreeMinute,
    type DisplayBody,
} from '@astrolegia/core/astrology';
import { GlassCard } from './ui';

const PERSONAL_BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars'];
const SOCIAL_BODIES = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const KARMIC_BODIES = ['chiron', 'north_node', 'south_node', 'lilith'];

function BodyIcon({ id }: { id: string }) {
    if (id === 'sun') return <Sun className="w-4 h-4 text-[var(--accent-gold)]" />;
    if (id === 'moon') return <Moon className="w-4 h-4 text-gray-300" />;
    if (KARMIC_BODIES.includes(id)) return <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />;
    return <Orbit className="w-4 h-4 text-[var(--accent-secondary)]" />;
}

const BodyRow = ({ body }: { body: DisplayBody }) => {
    const detail = [body.degreeLabel, body.house !== null ? `Casa ${body.house}` : null]
        .filter(Boolean)
        .join(' · ');
    return (
        <div className="flex items-center justify-between p-3 px-4 md:px-6 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
                <span className="w-6 flex justify-center"><BodyIcon id={body.id} /></span>
                <span className="text-sm font-medium text-gray-300">{body.label}</span>
                {body.retrograde && (
                    <span className="text-xs font-bold text-[var(--accent-gold)]" title="Retrógrado">R</span>
                )}
            </div>
            <div className="text-right">
                <div className="text-white font-bold">{body.signLabel}</div>
                {detail && <div className="text-xs text-[var(--accent-secondary)]">{detail}</div>}
            </div>
        </div>
    );
};

const GroupCard = ({ title, children, className = '' }: {
    title: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <GlassCard padded={false} className={`overflow-hidden ${className}`}>
        <div className="bg-white/5 p-3 px-4 md:px-6 border-b border-white/5 font-bold text-sm uppercase tracking-wider text-white/70">
            {title}
        </div>
        <div className="divide-y divide-white/5">{children}</div>
    </GlassCard>
);

export default function ChartBodiesGrid({ subject }: { subject: unknown }) {
    const bodies = extractChartBodies(subject);
    if (bodies.length === 0) return null;

    const pick = (ids: string[]) => bodies.filter(b => ids.includes(b.id));
    const personal = pick(PERSONAL_BODIES);
    const social = pick(SOCIAL_BODIES);
    const karmic = pick(KARMIC_BODIES);

    const record = subject && typeof subject === 'object' ? subject as Record<string, unknown> : null;
    const ascendant = record?.first_house;
    const ascRecord = ascendant && typeof ascendant === 'object' && !Array.isArray(ascendant)
        ? ascendant as Record<string, unknown>
        : null;
    const ascSign = translateSign(ascRecord?.sign);
    const ascAbsPos = getAbsolutePosition(ascendant);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <GroupCard title="Planetas Personales">
                {personal.map(b => <BodyRow key={b.id} body={b} />)}
            </GroupCard>
            <GroupCard title="Sociales y Transpersonales">
                {social.map(b => <BodyRow key={b.id} body={b} />)}
                {ascSign && (
                    <div className="flex items-center justify-between p-3 px-4 md:px-6 hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className="w-6 flex justify-center"><ArrowUp className="w-4 h-4 text-[var(--accent-secondary)]" /></span>
                            <span className="text-sm font-medium text-gray-300">Ascendente</span>
                        </div>
                        <div className="text-right">
                            <div className="text-white font-bold">{ascSign}</div>
                            {ascAbsPos !== null && (
                                <div className="text-xs text-[var(--accent-secondary)]">{formatDegreeMinute(ascAbsPos)}</div>
                            )}
                        </div>
                    </div>
                )}
            </GroupCard>
            {karmic.length > 0 && (
                <GroupCard title="Nodos y Puntos Kármicos" className="md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y divide-white/5 md:divide-y-0">
                        {karmic.map(b => <BodyRow key={b.id} body={b} />)}
                    </div>
                </GroupCard>
            )}
        </div>
    );
}
