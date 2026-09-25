import { UserProfile, NatalChartDoc } from '../types/user';

// ==============================================
// PROFILE STORE — PURE LOGIC (no Firestore here)
// ==============================================
// Splits the user profile into:
//   - LIGHT profile  -> root doc users/{uid} (canonical, listened to by AuthContext)
//   - HEAVY payload  -> users/{uid}/charts/natal (raw API response with SVG + AI analysis)
// Keeping this module free of Firebase imports makes it unit-testable with plain objects.

/** Fields that must NEVER live in the root user doc (heavy payload, 1MB doc-limit risk) */
export const HEAVY_CHART_FIELDS = ['chartData', 'aiAnalysis', 'chartMeta'] as const;

export type HeavyChartField = typeof HEAVY_CHART_FIELDS[number];

/** Any object shaped like a profile write payload (may still carry legacy heavy fields) */
export type ProfilePayload = Partial<UserProfile> & Record<string, any>;

export interface SplitProfileResult {
    /** Light profile: safe to write to the root doc. Never contains heavy chart fields. */
    lightProfile: ProfilePayload;
    /** Heavy chart payload destined for users/{uid}/charts/natal, or null if none present. */
    heavyChart: NatalChartDoc | null;
}

const isHeavyField = (key: string): key is HeavyChartField =>
    (HEAVY_CHART_FIELDS as readonly string[]).includes(key);

/**
 * Splits a profile payload into the light profile (root doc) and the heavy chart payload
 * (charts/natal). Undefined values are dropped entirely (Firestore rejects `undefined`).
 * If chartMeta came embedded inside chartData (Phase 1 format), it is lifted out to
 * its own field so charts/natal stores it at the top level.
 */
export function splitProfilePayload(payload: ProfilePayload | null | undefined): SplitProfileResult {
    const lightProfile: ProfilePayload = {};
    const heavy: NatalChartDoc = {};

    if (payload && typeof payload === 'object') {
        for (const [key, value] of Object.entries(payload)) {
            if (value === undefined) continue; // Firestore-safe: never forward undefined
            if (isHeavyField(key)) {
                (heavy as Record<string, any>)[key] = value;
            } else {
                lightProfile[key] = value;
            }
        }
    }

    // Phase 1 stored chartMeta INSIDE chartData ({...apiResult, chartMeta}); lift it out
    if (
        heavy.chartData && typeof heavy.chartData === 'object' && !Array.isArray(heavy.chartData) &&
        heavy.chartData.chartMeta && heavy.chartMeta === undefined
    ) {
        const { chartMeta, ...chartDataRest } = heavy.chartData;
        heavy.chartMeta = chartMeta;
        heavy.chartData = chartDataRest;
    }

    return {
        lightProfile,
        heavyChart: Object.keys(heavy).length > 0 ? heavy : null
    };
}

/** True when the root doc still carries legacy embedded heavy fields (needs cleanup). */
export function hasEmbeddedHeavyFields(rootDoc: Record<string, any> | null | undefined): boolean {
    if (!rootDoc || typeof rootDoc !== 'object') return false;
    return HEAVY_CHART_FIELDS.some(field => rootDoc[field] !== undefined && rootDoc[field] !== null);
}

/**
 * Extracts the legacy embedded chart payload from a root doc (pre-migration format).
 * Returns null when the root doc carries no heavy fields.
 */
export function extractLegacyChart(rootDoc: Record<string, any> | null | undefined): NatalChartDoc | null {
    if (!rootDoc || typeof rootDoc !== 'object') return null;

    const candidate: NatalChartDoc = {};
    if (rootDoc.chartData !== undefined && rootDoc.chartData !== null) candidate.chartData = rootDoc.chartData;
    if (rootDoc.aiAnalysis !== undefined && rootDoc.aiAnalysis !== null) candidate.aiAnalysis = rootDoc.aiAnalysis;
    if (rootDoc.chartMeta !== undefined && rootDoc.chartMeta !== null) candidate.chartMeta = rootDoc.chartMeta;

    if (Object.keys(candidate).length === 0) return null;

    // Reuse the splitter to lift an embedded chartMeta out of chartData (Phase 1 format)
    return splitProfilePayload(candidate).heavyChart;
}

/**
 * Migration trigger: only when the root doc has an embedded chartData AND
 * users/{uid}/charts/natal does not exist yet. If charts/natal already exists,
 * the copy step is skipped (only the root cleanup applies).
 */
export function needsChartMigration(
    rootDoc: Record<string, any> | null | undefined,
    chartDoc: Record<string, any> | null | undefined
): boolean {
    if (!rootDoc || typeof rootDoc !== 'object') return false;
    if (rootDoc.chartData === undefined || rootDoc.chartData === null) return false;
    return chartDoc === null || chartDoc === undefined;
}

/**
 * Read merge with fallback: prefers users/{uid}/charts/natal; the legacy chart embedded
 * in the root doc only fills fields the chart doc does not have. Returns null when
 * neither source has chart data.
 */
export function resolveNatalChart(
    chartDoc: Record<string, any> | null | undefined,
    rootDoc?: Record<string, any> | null
): NatalChartDoc | null {
    const legacy = extractLegacyChart(rootDoc);
    if (chartDoc === null || chartDoc === undefined) return legacy;

    const merged: NatalChartDoc = {};
    for (const field of HEAVY_CHART_FIELDS) {
        const preferred = (chartDoc as Record<string, any>)[field];
        const fallback = legacy ? (legacy as Record<string, any>)[field] : undefined;
        const value = preferred !== undefined && preferred !== null ? preferred : fallback;
        if (value !== undefined) (merged as Record<string, any>)[field] = value;
    }
    const hasChartContent = HEAVY_CHART_FIELDS.some(f => (merged as Record<string, any>)[f] !== undefined);
    if (!hasChartContent) return null;

    if (typeof chartDoc.updatedAt === 'string') merged.updatedAt = chartDoc.updatedAt;
    return merged;
}
