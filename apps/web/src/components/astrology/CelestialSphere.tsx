"use client";

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Text, Line } from '@react-three/drei';
import * as THREE from 'three';

// Data interfaces
interface PlanetData {
    name: string;
    angle: number; // 0-360 degrees
    color: string;
    size: number;
}

// Planet configuration
const PLANET_CONFIG: Record<string, { color: string; size: number }> = {
    'Sun': { color: '#ffd60a', size: 2.5 },
    'Moon': { color: '#f0f0f0', size: 1.5 },
    'Mercury': { color: '#ffd166', size: 0.8 },
    'Venus': { color: '#ffbd00', size: 1.2 },
    'Mars': { color: '#ef476f', size: 1.0 },
    'Jupiter': { color: '#118ab2', size: 2.2 },
    'Saturn': { color: '#073b4c', size: 2.0 },
    'Uranus': { color: '#06d6a0', size: 1.4 },
    'Neptune': { color: '#118ab2', size: 1.4 },
    'Pluto': { color: '#9d4edd', size: 0.6 },
};

function Planet({ name, degree, signIndex, radius }: { name: string; degree: number; signIndex: number; radius: number }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const config = PLANET_CONFIG[name] || { color: '#ffffff', size: 0.5 };

    // Calculate total angle (each sign is 30 degrees)
    const totalAngle = (signIndex * 30) + degree;
    const rad = (totalAngle * Math.PI) / 180;

    const x = Math.cos(rad) * radius;
    const z = Math.sin(rad) * radius;

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.01;
            meshRef.current.position.y = Math.sin(state.clock.elapsedTime + totalAngle) * 0.2;
        }
    });

    const points = useMemo(() => [[0, 0, 0], [x, 0, z]] as [number, number, number][], [x, z]);

    return (
        <group position={[0, 0, 0]}>
            <group position={[x, 0, z]}>
                <mesh ref={meshRef}>
                    <sphereGeometry args={[config.size * 0.15, 32, 32]} />
                    <meshStandardMaterial
                        color={config.color}
                        emissive={config.color}
                        emissiveIntensity={0.8}
                    />
                </mesh>
                <Html distanceFactor={15}>
                    <div className="text-xs font-bold text-white/90 bg-black/60 px-2 py-1 rounded-full backdrop-blur-sm whitespace-nowrap border border-white/10">
                        {name}
                    </div>
                </Html>
            </group>
            <Line
                points={points}
                color={config.color}
                transparent
                opacity={0.15}
                lineWidth={1}
            />
        </group>
    );
}

function ZodiacRing({ radius }: { radius: number }) {
    return (
        <group rotation={[Math.PI / 2, 0, 0]}>
            <mesh>
                <torusGeometry args={[radius, 0.05, 16, 100]} />
                <meshStandardMaterial color="#ffffff" transparent opacity={0.1} />
            </mesh>
            {/* Zodiac markers could go here */}
        </group>
    );
}

const SIGN_ORDER = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

function Scene({ positions }: { positions?: any[] }) {
    return (
        <>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#c77dff" />

            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            <group rotation={[0.4, 0, 0]}>
                <ZodiacRing radius={6} />
                {positions?.map((pos: any, i: number) => {
                    const signIndex = SIGN_ORDER.indexOf(pos.sign);
                    return (
                        <Planet
                            key={i}
                            name={pos.body}
                            signIndex={signIndex >= 0 ? signIndex : 0}
                            degree={pos.degree}
                            radius={6}
                        />
                    );
                })}
            </group>

            <OrbitControls enableZoom={true} enablePan={false} autoRotate autoRotateSpeed={0.5} minDistance={5} maxDistance={20} />
        </>
    );
}

export default function CelestialSphere({ positions }: { positions?: any[] }) {
    return (
        <div className="w-full h-[500px] border border-white/10 rounded-3xl overflow-hidden bg-black/40 relative">
            <div className="absolute top-4 left-4 z-10">
                <h3 className="text-white font-heading text-lg">Modelo Celeste 3D</h3>
                <p className="text-white/50 text-xs">Interactúa para explorar</p>
            </div>

            <Canvas camera={{ position: [0, 5, 12], fov: 45 }}>
                <Scene positions={positions} />
            </Canvas>
        </div>
    );
}
