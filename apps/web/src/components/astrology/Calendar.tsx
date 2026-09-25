'use client';

import { useState, useMemo } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { getMoonPhase, calculateFavorabilityIndex } from '@astrolegia/core/astrology';

interface CalendarProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    projectNumber?: number;
}

export default function Calendar({ selectedDate, onDateSelect, projectNumber }: CalendarProps) {
    const [viewDate, setViewDate] = useState(new Date(selectedDate));

    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(viewDate));
        const end = endOfWeek(endOfMonth(viewDate));
        return eachDayOfInterval({ start, end });
    }, [viewDate]);

    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const handlePrevMonth = () => setViewDate(subMonths(viewDate, 1));
    const handleNextMonth = () => setViewDate(addMonths(viewDate, 1));
    const handleToday = () => {
        const today = new Date();
        setViewDate(today);
        onDateSelect(today);
    };

    return (
        <div className="glass p-3 md:p-6">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between md:mb-6">
                <h2 className="text-[1.1rem] font-bold capitalize text-white md:text-[1.5rem]">
                    {format(viewDate, 'MMMM yyyy', { locale: es })}
                </h2>
                <div className="flex gap-1.5 md:gap-2">
                    <button onClick={handlePrevMonth} className="btn-icon min-h-[40px] min-w-[40px] md:min-h-0 md:min-w-0">←</button>
                    <button onClick={handleToday} className="btn-secondary min-h-[40px] px-3 py-2 text-[0.8rem] md:min-h-0 md:px-4 md:py-2">Hoy</button>
                    <button onClick={handleNextMonth} className="btn-icon min-h-[40px] min-w-[40px] md:min-h-0 md:min-w-0">→</button>
                </div>
            </div>

            {/* Week Days */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.5rem', textAlign: 'center' }}>
                {weekDays.map(day => (
                    <div key={day} className="text-[0.65rem] uppercase text-white/40 md:text-[0.8rem]">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
                {days.map((day) => {
                    const favorability = calculateFavorabilityIndex(day, projectNumber);
                    const moon = getMoonPhase(day);
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, viewDate);
                    const isDayToday = isToday(day);

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => onDateSelect(day)}
                            className="min-h-[44px] p-0.5 md:min-h-0 md:p-1"
                            style={{
                                aspectRatio: '1/1',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                background: isSelected
                                    ? `linear-gradient(135deg, ${favorability.color}40, rgba(255,255,255,0.1))`
                                    : 'rgba(255,255,255,0.02)',
                                border: isSelected
                                    ? `1px solid ${favorability.color}`
                                    : isDayToday
                                        ? '1px solid rgba(255,255,255,0.3)'
                                        : '1px solid transparent',
                                opacity: isCurrentMonth ? 1 : 0.3,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                transition: 'all 0.2s ease',
                                position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.background = `linear-gradient(135deg, ${favorability.color}20, rgba(255,255,255,0.05))`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.background = isSelected
                                    ? `linear-gradient(135deg, ${favorability.color}40, rgba(255,255,255,0.1))`
                                    : 'rgba(255,255,255,0.02)';
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span className="text-[0.7rem] md:text-[0.9rem]" style={{ fontWeight: 600, color: isSelected ? 'white' : 'rgba(255,255,255,0.8)' }}>
                                    {format(day, 'd')}
                                </span>
                                {moon.phase === 'Full Moon' && <span className="text-[0.65rem] md:text-[0.8rem]">🌕</span>}
                                {moon.phase === 'New Moon' && <span className="text-[0.65rem] md:text-[0.8rem]">🌑</span>}
                            </div>

                            {/* Favorability Dot */}
                            <div className="h-1.5 w-1.5 md:h-2 md:w-2" style={{
                                alignSelf: 'flex-end',
                                borderRadius: '50%',
                                background: favorability.color,
                                boxShadow: `0 0 5px ${favorability.color}`
                            }} />
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap justify-center gap-3 text-[0.7rem] text-white/50 md:mt-6 md:gap-4 md:text-[0.75rem]">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} /> Óptimo</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308' }} /> Neutral</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /> Evitar</div>
            </div>
        </div>
    );
}
