/**
 * Astrolegia Numerology Engine - FACHADA
 *
 * Todos los cálculos delegan en el motor canónico NumerologyHitchcock
 * (src/services/numerology-hitchcock.ts), basado en el libro de Helyn
 * Hitchcock, "Numerología, portal del destino": cada nombre se reduce POR
 * SEPARADO y luego se suman los reducidos; maestros 11/22/33 (el 44 NO es
 * maestro); la Y es vocal solo si su palabra no tiene otra vocal (WYNN,
 * LYNN) y consonante si la tiene (KENNEDY); la W es siempre consonante;
 * Ñ = 5 y los acentos se pliegan antes de mapear.
 *
 * Este archivo solo conserva los diccionarios de significados y la forma
 * pública de NumerologyAudit para no tocar a los callers.
 */
import { NumerologyHitchcock } from './hitchcock';

// Core vowels (Y is conditional; W is always a consonant per the book)
const CORE_VOWELS = ['A', 'E', 'I', 'O', 'U'];

// ==============================================
// CORNERSTONE (First Letter) Analysis
// ==============================================
export const CORNERSTONE_MEANINGS: Record<number, { letters: string; attribute: string; usage: string }> = {
    1: { letters: 'A, J, S', attribute: 'Independencia y Liderazgo', usage: 'Startups disruptivas, marcas personales' },
    2: { letters: 'B, K, T', attribute: 'Cooperación y Detalle', usage: 'Servicios de atención al cliente, mediación' },
    3: { letters: 'C, L, U', attribute: 'Comunicación y Brillo', usage: 'Agencias creativas, entretenimiento, moda' },
    4: { letters: 'D, M, V', attribute: 'Orden y Persistencia', usage: 'Construcción, logística, banca tradicional' },
    5: { letters: 'E, N, W', attribute: 'Versatilidad y Cambio', usage: 'Turismo, tecnología, redes sociales' },
    6: { letters: 'F, O, X', attribute: 'Responsabilidad y Armonía', usage: 'Salud, hogar, educación, estética' },
    7: { letters: 'G, P, Y', attribute: 'Análisis y Sabiduría', usage: 'Consultoría técnica, estudios esotéricos' },
    8: { letters: 'H, Q, Z', attribute: 'Poder y Resultados', usage: 'Alta dirección, lujo, finanzas' },
    9: { letters: 'I, R', attribute: 'Humanismo e Idealismo', usage: 'ONGs, arte, marcas con propósito global' }
};

// ==============================================
// FIRST VOWEL (Quick Reaction) Analysis
// ==============================================
export const FIRST_VOWEL_MEANINGS: Record<string, string> = {
    'A': 'Reacciona con acción inmediata y audacia.',
    'E': 'Reacciona con curiosidad y adaptabilidad.',
    'I': 'Reacciona con intuición y análisis profundo.',
    'O': 'Reacciona con cautela y sentido de responsabilidad.',
    'U': 'Reacciona con reserva o buscando el sentido oculto.'
};

// ==============================================
// MASTER NUMBER MEANINGS for Branding
// ==============================================
// Nota: el 44 NO es un número maestro canónico en Hitchcock y ya no se
// detecta como tal (la reducción canónica lo colapsa: 44 -> 8). La entrada
// 44 se conserva únicamente como texto de referencia/legado.
export const MASTER_BRAND_TYPES: Record<number, { type: string; description: string }> = {
    11: { type: 'Marca Faro', description: 'Ilumina e inspira. Intuición elevada y liderazgo espiritual.' },
    22: { type: 'Marca Arquitecta', description: 'Construye realidades físicas. Grandes logros materiales.' },
    33: { type: 'Marca Guía', description: 'Protección y servicio universal. Compasión elevada.' },
    44: { type: 'Marca Soberana', description: 'Poder material absoluto. Dominio y triunfo total.' }
};

// ==============================================
// MAIN AUDIT FUNCTION
// ==============================================
export interface NumerologyAudit {
    name: string;
    expression: number;
    soulUrge: number;
    personality: number;
    rawExpression: number;
    rawSoulUrge: number;
    rawPersonality: number;
    // Advanced analysis
    cornerstone: {
        letter: string;
        value: number;
        meaning: { attribute: string; usage: string } | null;
    };
    firstVowel: {
        letter: string | null;
        meaning: string | null;
    };
    isMasterExpression: boolean;
    isMasterSoul: boolean;
    isMasterPersonality: boolean;
    masterType: string | null;
    vowelBreakdown: { char: string; value: number }[];
    consonantBreakdown: { char: string; value: number }[];
}

export function auditName(name: string): NumerologyAudit {
    // Normalización canónica: mayúsculas, acentos plegados, Ñ preservada,
    // separada por palabras (la regla de la Y del libro opera dentro de
    // cada palabra).
    const parts = NumerologyHitchcock.getNameParts(name);

    let soulUrgeRaw = 0;
    let personalityRaw = 0;
    let expressionRaw = 0;
    let firstVowelLetter: string | null = null;

    const vowelBreakdown: { char: string; value: number }[] = [];
    const consonantBreakdown: { char: string; value: number }[] = [];

    for (const part of parts) {
        for (const char of part) {
            const value = NumerologyHitchcock.getLetterValue(char);
            expressionRaw += value;

            if (NumerologyHitchcock.isVowelLetter(char, part)) {
                soulUrgeRaw += value;
                vowelBreakdown.push({ char, value });
                // Track first vowel
                if (firstVowelLetter === null && CORE_VOWELS.includes(char)) {
                    firstVowelLetter = char;
                }
            } else {
                personalityRaw += value;
                consonantBreakdown.push({ char, value });
            }
        }
    }

    // Números reducidos: método canónico Hitchcock (cada nombre se reduce
    // POR SEPARADO y se suman los reducidos). Por eso pueden diferir de
    // reducir los raw* globales de arriba: ese es el comportamiento correcto
    // según el libro (ejemplo J. F. Kennedy, p. 48 — "podemos perder un once
    // o un veintidós" si se suma todo junto).
    const expression = NumerologyHitchcock.calculateDestiny(name);
    const soulUrge = NumerologyHitchcock.calculateSoulUrge(name);
    const personality = NumerologyHitchcock.calculatePersonality(name);

    // Analyze cornerstone (first letter)
    const firstLetter = parts.length > 0 ? parts[0][0] : '';
    const cornerstoneValue = firstLetter ? NumerologyHitchcock.getLetterValue(firstLetter) : 0;
    const cornerstoneMeaning = CORNERSTONE_MEANINGS[cornerstoneValue] || null;

    // Analyze first vowel
    const firstVowelMeaning = firstVowelLetter ? FIRST_VOWEL_MEANINGS[firstVowelLetter] || null : null;

    // Determine master status (solo 11/22/33: el 44 no es maestro en Hitchcock)
    const isMasterExpression = [11, 22, 33].includes(expression);
    const isMasterSoul = [11, 22, 33].includes(soulUrge);
    const isMasterPersonality = [11, 22, 33].includes(personality);

    const masterType = isMasterExpression ? MASTER_BRAND_TYPES[expression]?.type || null : null;

    return {
        name,
        expression,
        soulUrge,
        personality,
        rawExpression: expressionRaw,
        rawSoulUrge: soulUrgeRaw,
        rawPersonality: personalityRaw,
        cornerstone: {
            letter: firstLetter,
            value: cornerstoneValue,
            meaning: cornerstoneMeaning ? { attribute: cornerstoneMeaning.attribute, usage: cornerstoneMeaning.usage } : null
        },
        firstVowel: {
            letter: firstVowelLetter,
            meaning: firstVowelMeaning
        },
        isMasterExpression,
        isMasterSoul,
        isMasterPersonality,
        masterType,
        vowelBreakdown,
        consonantBreakdown
    };
}

// ==============================================
// NUMBER MEANINGS
// ==============================================
export const NUMBER_MEANINGS: Record<number, string> = {
    1: "Individualista, líder, independiente. Búsqueda de originalidad y coraje.",
    2: "Diplomático, equilibrado, sensible. Mediador natural y pacificador.",
    3: "Auto-expresión, placer, alegría. Talento en la comunicación y socialización.",
    4: "Seguro, práctico, honesto. Constructor metódico y disciplinado.",
    5: "Libertad, aventura, curiosidad. Amante del cambio y las experiencias.",
    6: "Hogar, familia, servicio. Protector y responsable.",
    7: "Intelectual, pensador profundo, misterio. Buscador de la verdad en soledad.",
    8: "Equilibrio material-espiritual, justicia. Relacionado con el éxito y grandes negocios.",
    9: "Amor universal, compasión, servicio a la humanidad. Hermano de todos.",
    11: "Maestro espiritual, inspiración. Intuición elevada y gran sensibilidad.",
    22: "Constructor maestro, fama internacional. Grandes logros en el plano material.",
    33: "Líder espiritual potente. Capacidad de recorrer nuevamente el camino con sabiduría.",
    44: "Dominio absoluto y triunfo. El más potente de los números maestros."
};

// ==============================================
// POWER WORDS DATABASE
// ==============================================
const POWER_WORDS = [
    "LIDER", "EXITO", "PODER", "FAMA", "ORO", "LUZ", "ALMA", "SOL", "REY", "UNO",
    "PAZ", "AMOR", "DUO", "UNION", "ALIANZA", "SOCIO", "CALMA", "LUNA",
    "ARTE", "VOZ", "LUJO", "CREAR", "VIDA", "COLOR", "JOY", "MIX", "POP",
    "BASE", "PLAN", "REAL", "CASA", "LEY", "ORDEN", "JEF", "ROOT",
    "LIBRE", "VIAJE", "VUELO", "AIRE", "NUEVO", "VELOZ", "FLIX", "ON",
    "HOGAR", "CUIDAR", "SALUD", "VERDAD", "HONOR", "CLAN", "NOBLE",
    "MENTE", "SABIO", "ZEN", "MITO", "FE", "ALTO", "CIMA", "EJE",
    "DINERO", "LOGRO", "JEFE", "VISION", "META", "ORO", "PLUS", "MAX",
    "MUNDO", "DAR", "TODO", "FINAL", "HEROE", "ASTRO", "GOD",
    "MAESTRO", "GUIA", "LUZ", "FARO", "ALFA", "MAGO",
    "GLOBAL", "FUTURO", "TOTAL", "TITAN", "MEGA", "HIPER",
    "YO", "AS", "TOP", "RED", "SI", "SOLO", "DATA",
    "DOS", "PAR", "ECO", "NET", "WEB", "SOFT",
    "MAR", "SKY", "OLA", "RAP", "SET",
    "SUR", "BOX", "KIT", "LAB", "PRO", "TEST",
    "GO", "NOW", "FUN", "HOT", "VIP", "JET",
    "LUX", "GEMA", "AVE", "BIO",
    "ODIN", "OM", "EGO", "TIC", "UVA",
    "ZAR", "BOSS", "COIN", "PAY", "CASH", "BANK", "RICH",
    "FIN"
];

export function findWordsForNumber(target: number): string[] {
    const matches: string[] = [];

    for (const word of POWER_WORDS) {
        const audit = auditName(word);
        if (audit.expression === target) {
            matches.push(word);
        }
    }

    return matches.sort(() => 0.5 - Math.random());
}

// ==============================================
// COMPATIBILITY
// ==============================================
interface CompatibilityResult {
    score: number;
    title: string;
    description: string;
}

export function calculateCompatibility(numA: number, numB: number): CompatibilityResult {
    // Reducción canónica (preserva 11/22/33; el 44 se colapsa a 8 porque no
    // es un número maestro en Hitchcock).
    const a = NumerologyHitchcock.reduce(numA);
    const b = NumerologyHitchcock.reduce(numB);

    if (a === b) {
        return {
            score: 90,
            title: "Espejo Vibracional",
            description: "Comparten la misma frecuencia. Entendimiento instantáneo, pero riesgo de potenciar los mismos defectos."
        };
    }

    // Master number synergies (solo 11/22/33; el 44 ya no llega hasta acá
    // porque la reducción canónica lo colapsa a 8)
    if ((a === 11 && b === 22) || (a === 22 && b === 11)) return { score: 98, title: "Visión + Construcción", description: "Combinación poderosa de inspiración y materialización." };

    // Business Power Matches
    if ((a === 1 && b === 8) || (a === 8 && b === 1)) return { score: 95, title: "Imperio", description: "La visión del 1 con la ejecución del 8. Imparables para negocios." };
    if ((a === 4 && b === 8) || (a === 8 && b === 4)) return { score: 88, title: "Estructura Sólida", description: "Construcción segura y escalable. Muy buena para largo plazo." };
    if ((a === 3 && b === 5) || (a === 5 && b === 3)) return { score: 92, title: "Marketing Puro", description: "Creatividad y expansión. Ideal para ventas, medios y publicidad." };

    // Challenges
    if ((a === 4 && b === 5) || (a === 5 && b === 4)) return { score: 30, title: "Fricción", description: "El 4 busca orden, el 5 libertad. Requiere mucha negociación." };
    if ((a === 1 && b === 2) || (a === 2 && b === 1)) return { score: 60, title: "Líder y Apoyo", description: "Funciona si el 2 acepta seguir y el 1 aprende a escuchar." };

    // Default Fallback
    const bothOdd = a % 2 !== 0 && b % 2 !== 0;
    const bothEven = a % 2 === 0 && b % 2 === 0;

    if (bothOdd || bothEven) {
        return {
            score: 75,
            title: "Armonía Natural",
            description: "Flujo de energía similar. Buena compatibilidad general."
        };
    }

    return {
        score: 50,
        title: "Complementarios",
        description: "Energías opuestas que pueden atraerse o repelerse. El equilibrio es la clave."
    };
}
