import { describe, it, expect } from 'vitest';
import {
    splitProfilePayload,
    needsChartMigration,
    resolveNatalChart,
    extractLegacyChart,
    hasEmbeddedHeavyFields,
    HEAVY_CHART_FIELDS
} from './profile-store';

// Plain-object fixtures — no Firestore involved
const birthData = {
    day: 21, month: 6, year: 1990, hour: 14, minute: 30,
    city: 'Buenos Aires', nation: 'AR',
    lat: -34.6037, lng: -58.3816, timezone: 'America/Argentina/Buenos_Aires'
};

const zodiac = {
    sun: { sign: 'Gemini', house: 10 },
    moon: { sign: 'Pisces', house: 7 },
    rising: { sign: 'Virgo' }
};

const chartMeta = {
    engineVersion: 'kerykeion-api-v5/pipeline-2',
    inputHash: 'abc123',
    computedAt: '2026-08-15T12:00:00.000Z'
};

// Raw API response shape (the SVG is the heavy part)
const apiChart = {
    chart: '<svg>...cientos de KB...</svg>',
    chart_data: { subject: { sun: { sign: 'Gem' } }, aspects: [] }
};

describe('splitProfilePayload', () => {
    it('puts light fields in lightProfile and heavy fields in heavyChart', () => {
        const { lightProfile, heavyChart } = splitProfilePayload({
            displayName: 'Santos',
            photoURL: 'https://example.com/p.jpg',
            birthData,
            zodiac,
            privacySettings: { showChartToPublic: false, showChartToFriends: true },
            chartData: apiChart,
            aiAnalysis: 'Sos intenso.',
            chartMeta
        });

        expect(lightProfile.displayName).toBe('Santos');
        expect(lightProfile.birthData).toEqual(birthData);
        expect(lightProfile.zodiac).toEqual(zodiac);
        expect(lightProfile.privacySettings).toEqual({ showChartToPublic: false, showChartToFriends: true });

        expect(heavyChart).not.toBeNull();
        expect(heavyChart!.chartData).toEqual(apiChart);
        expect(heavyChart!.aiAnalysis).toBe('Sos intenso.');
        expect(heavyChart!.chartMeta).toEqual(chartMeta);
    });

    it('lightProfile NEVER contains chartData, aiAnalysis or chartMeta', () => {
        const { lightProfile } = splitProfilePayload({
            displayName: 'Santos',
            chartData: apiChart,
            aiAnalysis: 'analysis',
            chartMeta
        });
        for (const field of HEAVY_CHART_FIELDS) {
            expect(lightProfile).not.toHaveProperty(field);
        }
    });

    it('returns heavyChart null when the payload has no heavy fields', () => {
        const { heavyChart } = splitProfilePayload({ displayName: 'Santos', birthData });
        expect(heavyChart).toBeNull();
    });

    it('drops undefined values entirely (Firestore rejects undefined)', () => {
        const { lightProfile, heavyChart } = splitProfilePayload({
            displayName: 'Santos',
            photoURL: undefined,
            chartData: undefined
        });
        expect(lightProfile).not.toHaveProperty('photoURL');
        expect(lightProfile.displayName).toBe('Santos');
        expect(heavyChart).toBeNull();
    });

    it('lifts a Phase-1 chartMeta embedded inside chartData out to its own field', () => {
        const phase1ChartData = { ...apiChart, chartMeta }; // old format: {...apiResult, chartMeta}
        const { heavyChart } = splitProfilePayload({ chartData: phase1ChartData });

        expect(heavyChart!.chartMeta).toEqual(chartMeta);
        expect(heavyChart!.chartData).not.toHaveProperty('chartMeta');
        expect(heavyChart!.chartData.chart).toBe(apiChart.chart);
    });

    it('an explicit top-level chartMeta wins over one embedded in chartData', () => {
        const embeddedMeta = { ...chartMeta, inputHash: 'old-hash' };
        const { heavyChart } = splitProfilePayload({
            chartData: { ...apiChart, chartMeta: embeddedMeta },
            chartMeta
        });
        expect(heavyChart!.chartMeta).toEqual(chartMeta);
    });

    it('handles null/empty payloads without throwing', () => {
        expect(splitProfilePayload(null)).toEqual({ lightProfile: {}, heavyChart: null });
        expect(splitProfilePayload(undefined)).toEqual({ lightProfile: {}, heavyChart: null });
        expect(splitProfilePayload({})).toEqual({ lightProfile: {}, heavyChart: null });
    });
});

describe('needsChartMigration', () => {
    it('triggers ONLY when the root doc has chartData and charts/natal does not exist', () => {
        const rootWithChart = { displayName: 'Santos', chartData: apiChart };
        expect(needsChartMigration(rootWithChart, null)).toBe(true);
        expect(needsChartMigration(rootWithChart, undefined)).toBe(true);
    });

    it('does NOT trigger when charts/natal already exists', () => {
        const rootWithChart = { displayName: 'Santos', chartData: apiChart };
        expect(needsChartMigration(rootWithChart, { chartData: apiChart })).toBe(false);
        expect(needsChartMigration(rootWithChart, {})).toBe(false); // existing (even empty) doc counts
    });

    it('does NOT trigger when the root doc has no chartData', () => {
        expect(needsChartMigration({ displayName: 'Santos' }, null)).toBe(false);
        expect(needsChartMigration({ displayName: 'Santos', chartData: null }, null)).toBe(false);
        // aiAnalysis alone is not the migration trigger
        expect(needsChartMigration({ aiAnalysis: 'texto' }, null)).toBe(false);
    });

    it('does NOT trigger for missing root docs', () => {
        expect(needsChartMigration(null, null)).toBe(false);
        expect(needsChartMigration(undefined, null)).toBe(false);
    });
});

describe('resolveNatalChart (read merge with fallback)', () => {
    it('prefers charts/natal over the legacy chart embedded in the root doc', () => {
        const newChart = { chartData: { ...apiChart, chart: '<svg>new</svg>' }, aiAnalysis: 'nuevo' };
        const rootWithLegacy = { displayName: 'Santos', chartData: apiChart, aiAnalysis: 'viejo' };

        const resolved = resolveNatalChart(newChart, rootWithLegacy);
        expect(resolved!.chartData.chart).toBe('<svg>new</svg>');
        expect(resolved!.aiAnalysis).toBe('nuevo');
    });

    it('falls back to the legacy embedded chart when charts/natal does not exist', () => {
        const rootWithLegacy = { displayName: 'Santos', chartData: apiChart, aiAnalysis: 'viejo' };
        const resolved = resolveNatalChart(null, rootWithLegacy);

        expect(resolved).not.toBeNull();
        expect(resolved!.chartData).toEqual(apiChart);
        expect(resolved!.aiAnalysis).toBe('viejo');
    });

    it('fills only the fields missing from charts/natal with legacy values', () => {
        const newChart = { chartData: { ...apiChart, chart: '<svg>new</svg>' } }; // no aiAnalysis yet
        const rootWithLegacy = { chartData: apiChart, aiAnalysis: 'viejo' };

        const resolved = resolveNatalChart(newChart, rootWithLegacy);
        expect(resolved!.chartData.chart).toBe('<svg>new</svg>'); // charts/natal wins
        expect(resolved!.aiAnalysis).toBe('viejo'); // hole filled from legacy
    });

    it('returns null when neither source has chart content', () => {
        expect(resolveNatalChart(null, null)).toBeNull();
        expect(resolveNatalChart(null, { displayName: 'Santos' })).toBeNull();
        expect(resolveNatalChart({}, { displayName: 'Santos' })).toBeNull();
    });

    it('works with a charts/natal doc and no root doc at all', () => {
        const resolved = resolveNatalChart({ chartData: apiChart, chartMeta }, null);
        expect(resolved!.chartData).toEqual(apiChart);
        expect(resolved!.chartMeta).toEqual(chartMeta);
    });
});

describe('extractLegacyChart', () => {
    it('extracts the embedded heavy payload and lifts a Phase-1 chartMeta', () => {
        const rootDoc = {
            displayName: 'Santos',
            birthData,
            chartData: { ...apiChart, chartMeta }, // Phase-1 format
            aiAnalysis: 'texto'
        };
        const legacy = extractLegacyChart(rootDoc);

        expect(legacy!.chartData).not.toHaveProperty('chartMeta');
        expect(legacy!.chartMeta).toEqual(chartMeta);
        expect(legacy!.aiAnalysis).toBe('texto');
    });

    it('returns null for a clean (light) root doc', () => {
        expect(extractLegacyChart({ displayName: 'Santos', birthData, zodiac })).toBeNull();
        expect(extractLegacyChart(null)).toBeNull();
    });
});

describe('hasEmbeddedHeavyFields', () => {
    it('detects any heavy field embedded in the root doc', () => {
        expect(hasEmbeddedHeavyFields({ chartData: apiChart })).toBe(true);
        expect(hasEmbeddedHeavyFields({ aiAnalysis: 'texto' })).toBe(true);
        expect(hasEmbeddedHeavyFields({ chartMeta })).toBe(true);
    });

    it('is false for clean root docs and null-ish values', () => {
        expect(hasEmbeddedHeavyFields({ displayName: 'Santos', birthData })).toBe(false);
        expect(hasEmbeddedHeavyFields({ chartData: null })).toBe(false);
        expect(hasEmbeddedHeavyFields(null)).toBe(false);
        expect(hasEmbeddedHeavyFields(undefined)).toBe(false);
    });
});
