/**
 * Astrolegia wordmark — inline SVG (replaces the boxed 1.5MB PNG).
 *
 * "ASTR" + ringed-planet O + "LeGIA" in the heading face (Space Grotesk via
 * --font-heading). textLength pins the layout so the planet stays aligned
 * even before the webfont loads. Transparent background by design.
 */

interface AstrolegiaLogoProps {
    width?: number | string;
    /** Kept for API compatibility with the previous next/image version. */
    priority?: boolean;
    className?: string;
}

export default function AstrolegiaLogo({
    width = 180,
    className = '',
}: AstrolegiaLogoProps) {
    return (
        <svg
            viewBox="0 0 620 120"
            width={width}
            style={{ height: 'auto', display: 'block' }}
            className={className}
            role="img"
            aria-label="Astrolegia"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="al-planet" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9d4edd" />
                    <stop offset="55%" stopColor="#d900ff" />
                    <stop offset="100%" stopColor="#7b2cbf" />
                </linearGradient>
                <linearGradient id="al-ring" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#c77dff" stopOpacity="0.35" />
                    <stop offset="60%" stopColor="#c77dff" />
                    <stop offset="100%" stopColor="#d900ff" />
                </linearGradient>
                <radialGradient id="al-sheen" cx="32%" cy="28%" r="75%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
                    <stop offset="35%" stopColor="#ffffff" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <filter id="al-glow" x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation="9" result="b" />
                    <feMerge>
                        <feMergeNode in="b" />
                    </feMerge>
                </filter>
            </defs>

            {/* Wordmark. textLength pins each half so the planet gap is stable. */}
            <text
                x="10"
                y="86"
                textLength="242"
                lengthAdjust="spacing"
                fill="#ffffff"
                fontSize="74"
                fontWeight="700"
                letterSpacing="1"
                style={{ fontFamily: 'var(--font-heading)' }}
            >
                ASTR
            </text>
            <text
                x="336"
                y="86"
                textLength="274"
                lengthAdjust="spacing"
                fill="#ffffff"
                fontSize="74"
                fontWeight="700"
                letterSpacing="1"
                style={{ fontFamily: 'var(--font-heading)' }}
            >
                LeGIA
            </text>

            {/* Planet "O" between the two halves */}
            <g transform="translate(294 60)">
                {/* soft glow behind the planet */}
                <circle r="26" fill="#d900ff" opacity="0.45" filter="url(#al-glow)" />
                {/* planet body */}
                <circle r="25" fill="url(#al-planet)" />
                <circle r="25" fill="url(#al-sheen)" />
                {/* orbit ring (behind-half masked by drawing planet edge again) */}
                <g transform="rotate(-24)">
                    <ellipse
                        rx="44"
                        ry="14"
                        fill="none"
                        stroke="url(#al-ring)"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                    />
                    {/* arrow tip riding the ring, top-right */}
                    <path
                        d="M 40.5 -8.5 l 10 -7.5 l -3.2 12.2"
                        fill="none"
                        stroke="#d900ff"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </g>
            </g>
        </svg>
    );
}
