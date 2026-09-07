import {
    Body,
    AstroTime,
    GeoVector,
    Ecliptic,
    SunPosition,
    EclipticGeoMoon,
    MakeTime
} from 'astronomy-engine';

export interface PlanetaryPosition {
    body: string;
    longitude: number; // 0-360
    sign: string;
    degree: number; // 0-30
    isRetrograde: boolean;
}

export const ZODIAC_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const BODIES = [
    Body.Sun,
    Body.Moon,
    Body.Mercury,
    Body.Venus,
    Body.Mars,
    Body.Jupiter,
    Body.Saturn,
    Body.Uranus,
    Body.Neptune,
    Body.Pluto
];

export function getZodiacSign(longitude: number): { sign: string; degree: number } {
    const normalized = (longitude % 360 + 360) % 360;
    const signIndex = Math.floor(normalized / 30);
    const degree = normalized % 30;
    return {
        sign: ZODIAC_SIGNS[signIndex],
        degree: degree
    };
}

export function isBodyRetrograde(body: Body, date: Date): boolean {
    if (body === Body.Sun || body === Body.Moon) return false;

    const time = MakeTime(date);
    const hourBefore = time.AddDays(-1 / 24);

    const pos1 = Ecliptic(GeoVector(body, hourBefore, true));
    const pos2 = Ecliptic(GeoVector(body, time, true));

    let diff = pos2.elon - pos1.elon;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    return diff < 0;
}

export function getPlanetaryPositions(date: Date): PlanetaryPosition[] {
    const time = MakeTime(date);

    return BODIES.map(body => {
        let longitude = 0;
        if (body === Body.Sun) {
            longitude = SunPosition(time).elon;
        } else if (body === Body.Moon) {
            longitude = EclipticGeoMoon(time).lon;
        } else {
            longitude = Ecliptic(GeoVector(body, time, true)).elon;
        }

        const { sign, degree } = getZodiacSign(longitude);

        return {
            body: body as string,
            longitude,
            sign,
            degree,
            isRetrograde: isBodyRetrograde(body, date)
        };
    });
}

/**
 * Checks if Mercury is retrograde for a given date
 */
export function isMercuryRetrograde(date: Date): boolean {
    return isBodyRetrograde(Body.Mercury, date);
}

/**
 * Returns the "Dignity" of a planet in a sign (simplified)
 */
export function getDignity(bodyName: string, sign: string): string | null {
    const dignities: Record<string, Record<string, string>> = {
        "Sun": { "Leo": "Rulership", "Aries": "Exaltation", "Aquarius": "Detriment", "Libra": "Fall" },
        "Moon": { "Cancer": "Rulership", "Taurus": "Exaltation", "Capricorn": "Detriment", "Scorpio": "Fall" },
        "Mercury": { "Gemini": "Rulership", "Virgo": "Rulership", "Sagittarius": "Detriment", "Pisces": "Detriment" }, // Virgo is also exaltation in some systems
        "Venus": { "Taurus": "Rulership", "Libra": "Rulership", "Pisces": "Exaltation", "Scorpio": "Detriment", "Aries": "Detriment", "Virgo": "Fall" },
        "Mars": { "Aries": "Rulership", "Scorpio": "Rulership", "Capricorn": "Exaltation", "Libra": "Detriment", "Taurus": "Detriment", "Cancer": "Fall" },
        "Jupiter": { "Sagittarius": "Rulership", "Pisces": "Rulership", "Cancer": "Exaltation", "Gemini": "Detriment", "Virgo": "Detriment", "Capricorn": "Fall" },
        "Saturn": { "Capricorn": "Rulership", "Aquarius": "Rulership", "Libra": "Exaltation", "Cancer": "Detriment", "Leo": "Detriment", "Aries": "Fall" }
    };


    return dignities[bodyName]?.[sign] || null;
}

// Phases ordered from New Moon (elongation 0°), one every 45°
const MOON_PHASES = [
    "New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
    "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"
];

// Maps a Sun-Moon elongation (degrees) to its phase.
// Each phase covers +/-22.5 degrees around its exact angle,
// so e.g. 359 deg and 1 deg are both "New Moon".
export function moonPhaseFromElongation(diff: number): { phase: string, isWaxing: boolean } {
    const normalized = (diff % 360 + 360) % 360;
    const idx = Math.round(normalized / 45) % 8;
    return { phase: MOON_PHASES[idx], isWaxing: idx < 4 };
}

export function getMoonPhase(date: Date): { phase: string, isWaxing: boolean } {
    const time = MakeTime(date);
    const sun = SunPosition(time).elon;
    const moon = EclipticGeoMoon(time).lon;

    let diff = moon - sun;
    if (diff < 0) diff += 360;

    return moonPhaseFromElongation(diff);
}

/**
 * Parses a 'YYYY-MM-DD' string as a LOCAL calendar day, using local noon
 * as the representative instant. (new Date('YYYY-MM-DD') is UTC midnight,
 * which shifts the day in western timezones like Argentina.)
 */
export function parseLocalDay(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Formats a Date as 'YYYY-MM-DD' using the LOCAL calendar day
 * (toISOString() would use the UTC day).
 */
export function formatLocalDay(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export interface PowerDate {
    date: Date;
    score: number;
    reasons: string[];
}

export function findPowerDates(startDate: Date, daysToCheck: number = 60): PowerDate[] {
    const dates: PowerDate[] = [];

    // Check one day at a time
    for (let i = 0; i < daysToCheck; i += 2) { // Skip every other day to save compute and give variety
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);

        const reasons: string[] = [];
        let score = 50; // Base score

        // 1. Mercury Retrograde (Huge Factor)
        if (isMercuryRetrograde(d)) {
            score -= 30;
            // reasons.push("Mercury Retrograde"); // Usually negative reasons are hidden in "Power Dates" logic, we just filter them out or score low
        } else {
            score += 10;
            reasons.push("Mercurio Directo");
        }

        // 2. Moon Phase
        const moon = getMoonPhase(d);
        if (moon.isWaxing) {
            score += 15;
            if (moon.phase === "New Moon" || moon.phase === "Waxing Crescent") {
                reasons.push("Luna Creciente (Ideal Inicios)");
            }
        }

        // 3. Jupiter Retrograde?
        const jupiterRx = isBodyRetrograde(Body.Jupiter, d);
        if (!jupiterRx) {
            score += 5;
        }

        if (score >= 70) {
            dates.push({ date: d, score, reasons });
        }
    }

    return dates.sort((a, b) => b.score - a.score).slice(0, 5);
}

// ============================================================
// ÍNDICE DE FAVORABILIDAD MEJORADO
// ============================================================

export interface FavorabilityIndex {
    score: number;          // 0-100
    label: string;          // "Excelente", "Favorable", etc.
    color: string;          // Hex color
    factors: FavorabilityFactor[];
    recommendation: string;
}

export interface FavorabilityFactor {
    name: string;
    impact: number;   // Can be positive or negative
    description: string;
    emoji: string;
}

// Planetary day rulers (traditional)
const DAY_RULERS: Record<number, string> = {
    0: 'Sun',       // Domingo
    1: 'Moon',      // Lunes
    2: 'Mars',      // Martes
    3: 'Mercury',   // Miércoles
    4: 'Jupiter',   // Jueves
    5: 'Venus',     // Viernes
    6: 'Saturn'     // Sábado
};

// Planetary hours (simplified first hour of day)
const BUSINESS_FRIENDLY_DAYS = [2, 3, 4, 5]; // Martes a Viernes

export function calculateFavorabilityIndex(
    date: Date,
    projectNumber?: number  // Optional: Brand's expression number
): FavorabilityIndex {
    const factors: FavorabilityFactor[] = [];
    let baseScore = 50;

    // 1. MERCURIO RETRÓGRADO (-20 a +12)
    const mercuryRx = isMercuryRetrograde(date);
    if (mercuryRx) {
        factors.push({
            name: 'Mercurio Retrógrado',
            impact: -18,
            description: 'Evitar lanzamientos, firmar contratos o comunicaciones importantes',
            emoji: '☿️⬇️'
        });
        baseScore -= 18;
    } else {
        factors.push({
            name: 'Mercurio Directo',
            impact: 12,
            description: 'Comunicaciones claras y avances fluidos',
            emoji: '☿️✨'
        });
        baseScore += 12;
    }

    // 2. FASE LUNAR (-8 a +15)
    const moon = getMoonPhase(date);
    const moonImpact = getMoonPhaseImpact(moon.phase);
    factors.push({
        name: `Luna: ${translateMoonPhase(moon.phase)}`,
        impact: moonImpact.impact,
        description: moonImpact.description,
        emoji: moonImpact.emoji
    });
    baseScore += moonImpact.impact;

    // 3. DÍA DE LA SEMANA (-5 a +10)
    const dayOfWeek = date.getDay();
    const dayRuler = DAY_RULERS[dayOfWeek];
    const businessDay = BUSINESS_FRIENDLY_DAYS.includes(dayOfWeek);

    if (businessDay) {
        factors.push({
            name: `Día de ${translatePlanet(dayRuler)}`,
            impact: dayRuler === 'Jupiter' ? 10 : dayRuler === 'Venus' ? 8 : 5,
            description: getDayDescription(dayRuler),
            emoji: getPlanetEmoji(dayRuler)
        });
        baseScore += dayRuler === 'Jupiter' ? 10 : dayRuler === 'Venus' ? 8 : 5;
    } else {
        factors.push({
            name: `Día de ${translatePlanet(dayRuler)}`,
            impact: dayOfWeek === 6 ? -3 : 0, // Sábado menos favorable
            description: getDayDescription(dayRuler),
            emoji: getPlanetEmoji(dayRuler)
        });
        baseScore += dayOfWeek === 6 ? -3 : 0;
    }

    // 4. NÚMERO UNIVERSAL DEL DÍA (-5 a +10)
    const universalDay = calculateUniversalDay(date);
    const dayCompatibility = projectNumber
        ? getNumberCompatibility(universalDay, projectNumber)
        : 0;

    factors.push({
        name: `Día Universal ${universalDay}`,
        impact: dayCompatibility,
        description: getUniversalDayMeaning(universalDay),
        emoji: getNumberEmoji(universalDay)
    });
    baseScore += dayCompatibility;

    // 5. JUPITER Y VENUS RETRÓGRADOS
    const jupiterRx = isBodyRetrograde(Body.Jupiter, date);
    const venusRx = isBodyRetrograde(Body.Venus, date);

    if (jupiterRx) {
        factors.push({
            name: 'Júpiter Retrógrado',
            impact: -8,
            description: 'Expansión y crecimiento ralentizados',
            emoji: '♃⬇️'
        });
        baseScore -= 8;
    }

    if (venusRx) {
        factors.push({
            name: 'Venus Retrógrado',
            impact: -6,
            description: 'No ideal para lanzar productos de belleza o relaciones comerciales',
            emoji: '♀️⬇️'
        });
        baseScore -= 6;
    }

    // 6. ESTACIÓN DEL AÑO (+2 a +8)
    const seasonBonus = getSeasonBonus(date);
    factors.push({
        name: seasonBonus.season,
        impact: seasonBonus.impact,
        description: seasonBonus.description,
        emoji: seasonBonus.emoji
    });
    baseScore += seasonBonus.impact;

    // 7. MES DEL AÑO (ciertos meses son más activos)
    const monthBonus = getMonthBonus(date.getMonth());
    if (monthBonus !== 0) {
        factors.push({
            name: monthBonus > 0 ? 'Mes Activo' : 'Mes Pausado',
            impact: monthBonus,
            description: monthBonus > 0 ? 'Actividad comercial elevada' : 'Período de menor actividad',
            emoji: monthBonus > 0 ? '📈' : '📉'
        });
        baseScore += monthBonus;
    }

    // Clamp score between 0-100
    const finalScore = Math.max(0, Math.min(100, baseScore));

    // Generate label, color, and recommendation
    const { label, color, recommendation } = getScoreDetails(finalScore);

    return {
        score: Math.round(finalScore),
        label,
        color,
        factors,
        recommendation
    };
}

function getMoonPhaseImpact(phase: string): { impact: number; description: string; emoji: string } {
    switch (phase) {
        case 'New Moon':
            return { impact: 12, description: 'Ideal para iniciar nuevos proyectos', emoji: '🌑' };
        case 'Waxing Crescent':
            return { impact: 15, description: 'Energía en expansión, momento de acción', emoji: '🌒' };
        case 'First Quarter':
            return { impact: 10, description: 'Superar obstáculos, tomar decisiones', emoji: '🌓' };
        case 'Waxing Gibbous':
            return { impact: 8, description: 'Refinar y ajustar planes', emoji: '🌔' };
        case 'Full Moon':
            return { impact: 5, description: 'Culminación, visibilidad máxima', emoji: '🌕' };
        case 'Waning Gibbous':
            return { impact: 0, description: 'Gratitud y compartir logros', emoji: '🌖' };
        case 'Last Quarter':
            return { impact: -5, description: 'Soltar lo que no funciona', emoji: '🌗' };
        case 'Waning Crescent':
            return { impact: -8, description: 'Descanso y reflexión, evitar lanzamientos', emoji: '🌘' };
        default:
            return { impact: 0, description: '', emoji: '🌙' };
    }
}

function translateMoonPhase(phase: string): string {
    const translations: Record<string, string> = {
        'New Moon': 'Luna Nueva',
        'Waxing Crescent': 'Creciente',
        'First Quarter': 'Cuarto Creciente',
        'Waxing Gibbous': 'Gibosa Creciente',
        'Full Moon': 'Luna Llena',
        'Waning Gibbous': 'Gibosa Menguante',
        'Last Quarter': 'Cuarto Menguante',
        'Waning Crescent': 'Menguante'
    };
    return translations[phase] || phase;
}

function translatePlanet(planet: string): string {
    const translations: Record<string, string> = {
        'Sun': 'el Sol', 'Moon': 'la Luna', 'Mercury': 'Mercurio',
        'Venus': 'Venus', 'Mars': 'Marte', 'Jupiter': 'Júpiter', 'Saturn': 'Saturno'
    };
    return translations[planet] || planet;
}

function getPlanetEmoji(planet: string): string {
    const emojis: Record<string, string> = {
        'Sun': '☀️', 'Moon': '🌙', 'Mercury': '☿️',
        'Venus': '♀️', 'Mars': '♂️', 'Jupiter': '♃', 'Saturn': '♄'
    };
    return emojis[planet] || '🪐';
}

function getDayDescription(planet: string): string {
    const descriptions: Record<string, string> = {
        'Sun': 'Día de liderazgo, ego y visibilidad',
        'Moon': 'Día emocional, cuidado y nutrición',
        'Mars': 'Día de acción, competencia y energía',
        'Mercury': 'Día de comunicación y comercio',
        'Jupiter': 'Día de expansión, suerte y abundancia',
        'Venus': 'Día de belleza, armonía y relaciones',
        'Saturn': 'Día de estructura pero restricciones'
    };
    return descriptions[planet] || '';
}

function calculateUniversalDay(date: Date): number {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    let sum = day + month + year;
    while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
        sum = String(sum).split('').reduce((acc, n) => acc + parseInt(n), 0);
    }
    return sum;
}

function getNumberCompatibility(dayNumber: number, projectNumber: number): number {
    // Same number = very compatible
    if (dayNumber === projectNumber) return 10;

    // Compatible pairs
    const compatibilityMap: Record<number, number[]> = {
        1: [1, 3, 5, 9],
        2: [2, 4, 6, 8],
        3: [1, 3, 5, 9],
        4: [2, 4, 6, 8],
        5: [1, 3, 5, 7, 9],
        6: [2, 4, 6, 8],
        7: [5, 7],
        8: [2, 4, 6, 8],
        9: [1, 3, 5, 9],
        11: [2, 4, 6, 11, 22],
        22: [4, 8, 11, 22],
        33: [6, 9, 33]
    };

    if (compatibilityMap[projectNumber]?.includes(dayNumber)) return 6;
    return -2;
}

function getUniversalDayMeaning(num: number): string {
    const meanings: Record<number, string> = {
        1: 'Día de nuevos comienzos e iniciativas',
        2: 'Día de colaboración y paciencia',
        3: 'Día de creatividad y comunicación',
        4: 'Día de trabajo duro y organización',
        5: 'Día de cambios y aventuras',
        6: 'Día de amor, familia y servicio',
        7: 'Día de introspección y análisis',
        8: 'Día de negocios y manifestación',
        9: 'Día de culminación y humanitarismo',
        11: 'Día de inspiración espiritual',
        22: 'Día de construcción a gran escala',
        33: 'Día de maestría compasiva'
    };
    return meanings[num] || '';
}

function getNumberEmoji(num: number): string {
    const emojis: Record<number, string> = {
        1: '1️⃣', 2: '2️⃣', 3: '3️⃣', 4: '4️⃣', 5: '5️⃣',
        6: '6️⃣', 7: '7️⃣', 8: '8️⃣', 9: '9️⃣', 11: '🔮', 22: '🏛️', 33: '👼'
    };
    return emojis[num] || '🔢';
}

function getSeasonBonus(date: Date): { season: string; impact: number; description: string; emoji: string } {
    const month = date.getMonth();
    // Southern hemisphere seasons (Argentina)
    if (month >= 2 && month <= 4) {
        return { season: 'Otoño', impact: 4, description: 'Período de cosecha y consolidación', emoji: '🍂' };
    } else if (month >= 5 && month <= 7) {
        return { season: 'Invierno', impact: 2, description: 'Tiempo de planificación y estrategia', emoji: '❄️' };
    } else if (month >= 8 && month <= 10) {
        return { season: 'Primavera', impact: 8, description: 'Renacimiento, ideal para lanzamientos', emoji: '🌸' };
    } else {
        return { season: 'Verano', impact: 5, description: 'Energía alta pero audiencias distraídas', emoji: '☀️' };
    }
}

function getMonthBonus(month: number): number {
    // Commercial activity by month (0 = January)
    const bonuses = [
        -3, // Enero - vacaciones
        -2, // Febrero
        5,  // Marzo - inicio año fiscal
        5,  // Abril
        3,  // Mayo
        2,  // Junio
        -2, // Julio - vacaciones invierno
        3,  // Agosto
        5,  // Septiembre - primavera
        6,  // Octubre
        8,  // Noviembre - Black Friday
        -5  // Diciembre - fiestas
    ];
    return bonuses[month] || 0;
}

function getScoreDetails(score: number): { label: string; color: string; recommendation: string } {
    if (score >= 85) {
        return {
            label: 'Óptimo',
            color: '#22c55e',
            recommendation: 'Excelente momento para lanzamientos, acuerdos y decisiones importantes.'
        };
    } else if (score >= 70) {
        return {
            label: 'Favorable',
            color: '#84cc16',
            recommendation: 'Buen momento para avanzar con proyectos y comunicaciones.'
        };
    } else if (score >= 55) {
        return {
            label: 'Neutral',
            color: '#eab308',
            recommendation: 'Proceder con cautela, revisar detalles antes de actuar.'
        };
    } else if (score >= 40) {
        return {
            label: 'Desafiante',
            color: '#f97316',
            recommendation: 'Se recomienda posponer decisiones críticas si es posible.'
        };
    } else {
        return {
            label: 'No Recomendado',
            color: '#ef4444',
            recommendation: 'Evitar lanzamientos importantes. Enfocarse en planificación y revisión.'
        };
    }
}
