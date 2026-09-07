// Numerology API Integration - FACHADA
// Todos los cálculos delegan en el motor canónico NumerologyHitchcock
// (src/services/numerology-hitchcock.ts, método del libro de Helyn Hitchcock).

import { NumerologyHitchcock } from './hitchcock';

interface NumerologyResult {
    lifePath: number;
    destiny: number;
    soul: number;
    personality: number;
    expression: number;
    description?: string;
}

// Reduces a number to a single digit, preserving master numbers 11, 22, 33
// on every iteration (e.g. 29 -> 11 stays 11). Única fuente de verdad:
// NumerologyHitchcock.reduce. El 44 NO es maestro (44 -> 8).
export function reduceNumber(num: number): number {
    return NumerologyHitchcock.reduce(num);
}

// Calculate Life Path Number from birthdate
export function calculateLifePathNumber(day: number, month: number, year: number): number {
    return NumerologyHitchcock.calculateLifePath(new Date(Date.UTC(year, month - 1, day)));
}

// Calculate Destiny Number from full name.
// Método canónico del libro: cada nombre se reduce POR SEPARADO (vocales
// reducidas + consonantes reducidas) y se suman los reducidos — ya no es la
// suma global de todas las letras. Soporta Ñ (= 5) y acentos (á -> a).
export function calculateDestinyNumber(fullName: string): number {
    return NumerologyHitchcock.calculateDestiny(fullName);
}

// Numerology meanings for Life Path numbers
export const LIFE_PATH_MEANINGS: Record<number, { title: string; description: string; keywords: string[] }> = {
    1: {
        title: "El Líder",
        description: "Eres un pionero nato con energía de independencia y originalidad. Tu camino es liderar, innovar y abrir nuevos horizontes.",
        keywords: ["Liderazgo", "Independencia", "Originalidad", "Ambición"]
    },
    2: {
        title: "El Diplomático",
        description: "Tu misión es crear armonía y equilibrio. Eres sensible, cooperativo y excelente en las relaciones interpersonales.",
        keywords: ["Cooperación", "Sensibilidad", "Diplomacia", "Paz"]
    },
    3: {
        title: "El Comunicador",
        description: "Naciste para expresarte creativamente. Tu energía irradia optimismo, alegría y talento artístico.",
        keywords: ["Creatividad", "Expresión", "Alegría", "Comunicación"]
    },
    4: {
        title: "El Constructor",
        description: "Eres el arquitecto de la realidad. Tu fortaleza está en la disciplina, la organización y construir bases sólidas.",
        keywords: ["Estabilidad", "Trabajo duro", "Orden", "Lealtad"]
    },
    5: {
        title: "El Aventurero",
        description: "La libertad es tu oxígeno. Tu camino está lleno de cambios, viajes y experiencias que expanden tu conciencia.",
        keywords: ["Libertad", "Aventura", "Versatilidad", "Cambio"]
    },
    6: {
        title: "El Protector",
        description: "Tu corazón late por el amor, la familia y el hogar. Eres un sanador natural con profunda responsabilidad hacia otros.",
        keywords: ["Amor", "Responsabilidad", "Familia", "Servicio"]
    },
    7: {
        title: "El Buscador",
        description: "Tu mente busca la verdad más profunda. Eres un místico natural, analítico y profundamente espiritual.",
        keywords: ["Sabiduría", "Introspección", "Espiritualidad", "Análisis"]
    },
    8: {
        title: "El Manifestador",
        description: "Tienes el poder de materializar abundancia. Tu energía es de autoridad, éxito material y logros a gran escala.",
        keywords: ["Poder", "Abundancia", "Autoridad", "Éxito"]
    },
    9: {
        title: "El Humanitario",
        description: "Tu alma es antigua y compasiva. Vienes a servir a la humanidad con sabiduría universal y amor incondicional.",
        keywords: ["Compasión", "Humanitarismo", "Sabiduría", "Finalización"]
    },
    11: {
        title: "El Iluminador (Maestro)",
        description: "Portas una frecuencia espiritual elevada. Tu misión es inspirar y elevar la conciencia colectiva.",
        keywords: ["Intuición", "Inspiración", "Visión", "Maestría espiritual"]
    },
    22: {
        title: "El Arquitecto Maestro",
        description: "Puedes materializar visiones a escala mundial. Combinas la espiritualidad del 11 con el poder práctico del 4.",
        keywords: ["Visión global", "Construcción", "Legado", "Manifestación maestra"]
    },
    33: {
        title: "El Maestro Sanador",
        description: "El número más elevado de compasión. Tu presencia sana y eleva a todos los que te rodean.",
        keywords: ["Sanación", "Compasión infinita", "Servicio devoto", "Amor universal"]
    }
};

// Get complete numerology profile
export function getNumerologyProfile(name: string, day: number, month: number, year: number) {
    const lifePath = calculateLifePathNumber(day, month, year);
    const destiny = calculateDestinyNumber(name);
    const meaning = LIFE_PATH_MEANINGS[lifePath] || LIFE_PATH_MEANINGS[lifePath % 9 || 9];

    return {
        lifePath,
        destiny,
        meaning,
        compatibility: getCompatibleNumbers(lifePath)
    };
}

// Get compatible life path numbers
function getCompatibleNumbers(lifePath: number): number[] {
    const compatibilityMap: Record<number, number[]> = {
        1: [1, 3, 5],
        2: [2, 4, 8],
        3: [1, 3, 5, 9],
        4: [2, 4, 8],
        5: [1, 3, 5, 7],
        6: [2, 6, 8, 9],
        7: [5, 7],
        8: [2, 4, 6, 8],
        9: [3, 6, 9],
        11: [2, 4, 6],
        22: [4, 6, 8, 22],
        33: [6, 9, 33]
    };
    return compatibilityMap[lifePath] || [lifePath];
}
