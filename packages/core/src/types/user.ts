export interface BirthData {
    day: number;
    month: number;
    year: number;
    hour: number;
    minute: number;
    city: string;
    nation: string;
    lat: number;
    lng: number;
    timezone: string;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    bio?: string;

    // Core Birth Data
    birthData?: BirthData;

    // Computed / Cached Zodiac Data (for quick display)
    zodiac?: {
        sun: { sign: string; house?: number };
        moon: { sign: string; house?: number };
        rising: { sign: string }; // Ascendant
    };

    // Social Settings
    privacySettings?: {
        showChartToPublic: boolean;
        showChartToFriends: boolean;
    };

    updatedAt?: string;
    createdAt?: string;
    migrationStatus?: string;
}

// Versioning metadata for a computed chart (generated in profile page since Phase 1)
export interface ChartMeta {
    engineVersion: string;
    inputHash: string;
    computedAt: string;
}

// Heavy chart document stored at users/{uid}/charts/natal.
// The raw API response (with the SVG, hundreds of KB) lives HERE, never in the root user doc.
export interface NatalChartDoc {
    chartData?: any; // Raw response from the astrology API (includes the SVG chart)
    aiAnalysis?: string | null;
    chartMeta?: ChartMeta | null;
    updatedAt?: string;
    migratedFrom?: string; // Set when the doc was copied from a legacy location
}

export interface SocialConnection {
    id?: string; // Connection ID
    users: [string, string]; // [uid1, uid2] sorted
    status: 'pending' | 'connected' | 'rejected';
    requesterId: string;
    createdAt: string;
    updatedAt: string;
}

export interface PublicUser {
    uid: string;
    displayName: string;
    photoURL?: string;
    zodiac?: UserProfile['zodiac']; // Only show zodiac if allowed
}
