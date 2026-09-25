/**
 * react-three-fiber v9 + React 19: los elementos de three (<group>, <mesh>,
 * <sphereGeometry>, …) que usa CelestialSphere.tsx se declaran extendiendo
 * JSX.IntrinsicElements con ThreeElements, como indica la guía de migración
 * de R3F v9. Sin esto, `next build` (tsc) no reconoce esos tags.
 */
import type { ThreeElements } from '@react-three/fiber';

declare module 'react' {
    namespace JSX {
        interface IntrinsicElements extends ThreeElements {}
    }
}
