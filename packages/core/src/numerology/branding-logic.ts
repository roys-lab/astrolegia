export interface BrandArchetype {
    name: string;
    planet: string;
    colors: string[];
    shapes: string[];
    keywords: string[];
    description: string;
}

export const PLANETARY_ARCHETYPES: Record<string, BrandArchetype> = {
    "Sun": {
        name: "The Leader",
        planet: "Sun",
        colors: ["#FFD700", "#FFA500", "#FF8C00"], // Gold, Orange
        shapes: ["Circles", "Radiating lines", "Points"],
        keywords: ["Authority", "Vitality", "Identity", "Radiance"],
        description: "Centric, powerful, and essential. High impact."
    },
    "Moon": {
        name: "The Nurturer",
        planet: "Moon",
        colors: ["#C0C0C0", "#F0F8FF", "#E6E6FA"], // Silver, Light Blue, Lavender
        shapes: ["Crescents", "Soft curves", "Fluidity"],
        keywords: ["Emotion", "Comfort", "Intuition", "Safety"],
        description: "Responsive, caring, and rhythmic. Focus on experience."
    },
    "Mercury": {
        name: "The Messenger",
        planet: "Mercury",
        colors: ["#808080", "#ADD8E6", "#90EE90"], // Grey, Light Blue, Light Green
        shapes: ["Lines", "Thin fonts", "Interconnected nodes"],
        keywords: ["Communication", "Agility", "Intelligence", "Speed"],
        description: "Fast, adaptable, and clever. Focus on data and links."
    },
    "Venus": {
        name: "The Artist",
        planet: "Venus",
        colors: ["#FFC0CB", "#008080", "#20B2AA"], // Pink, Teal, Sea Green
        shapes: ["Harmonious proportions", "Symmetry", "Organic curves"],
        keywords: ["Beauty", "Value", "Harmony", "Luxury"],
        description: "Aesthetic, pleasant, and balanced. Focus on desire."
    },
    "Mars": {
        name: "The Warrior",
        planet: "Mars",
        colors: ["#FF0000", "#8B0000", "#FF4500"], // Red, Dark Red, OrangeRed
        shapes: ["Triangles", "Sharp angles", "Arrows"],
        keywords: ["Action", "Energy", "Courage", "Directness"],
        description: "Dynamic, assertive, and bold. Driven by results."
    },
    "Jupiter": {
        name: "The Explorer",
        planet: "Jupiter",
        colors: ["#800080", "#4B0082", "#EE82EE"], // Purple, Indigo, Violet
        shapes: ["Wide spans", "Expansive layouts", "Complex geometry"],
        keywords: ["Growth", "Wisdom", "Expansion", "Optimism"],
        description: "Abundant, philosophical, and large-scale. Focus on future."
    },
    "Saturn": {
        name: "The Architect",
        planet: "Saturn",
        colors: ["#000000", "#2F4F4F", "#A9A9A9"], // Black, Dark Slate Grey, Dark Grey
        shapes: ["Squares", "Rectangles", "Rigid structures"],
        keywords: ["Structure", "Discipline", "Legacy", "Time"],
        description: "Stable, enduring, and professional. Focus on foundations."
    }
};

export const NUMBER_ARCHETYPES: Record<number, Partial<BrandArchetype>> = {
    1: { keywords: ["Pioneer", "Independent", "Original"], shapes: ["Single point", "Vertical line"] },
    2: { keywords: ["Partner", "Cooperative", "Balanced"], shapes: ["Horizontal line", "Duo"] },
    3: { keywords: ["Creative", "Expressive", "Joyful"], shapes: ["Triangle", "Sparkle"] },
    4: { keywords: ["Stable", "Practical", "Hardworking"], shapes: ["Square", "Cube"] },
    5: { keywords: ["Free", "Dynamic", "Versatile"], shapes: ["Star", "Pentagon"] },
    6: { keywords: ["Responsible", "Harmonious", "Protective"], shapes: ["Hexagon", "Honeycomb"] },
    7: { keywords: ["Analytical", "Spiritual", "Reserved"], shapes: ["Septagon", "Overlapping circles"] },
    8: { keywords: ["Ambitious", "Efficient", "Judgment"], shapes: ["Octagon", "Infinity symbol"] },
    9: { keywords: ["Humanitarian", "Idealistic", "Generous"], shapes: ["Enneagon", "Global symbols"] }
};

export function getColorsForPlanet(planet: string): string[] {
    return PLANETARY_ARCHETYPES[planet]?.colors || ["#FFFFFF"];
}

export function getShapesForPlanet(planet: string): string[] {
    return PLANETARY_ARCHETYPES[planet]?.shapes || ["Point"];
}
