'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    alpha: number;
    color: string;
}

export default function CosmicBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: -9999, y: -9999 });
    const pathname = usePathname();

    // The landing page ('/') renders its own three.js hero — don't waste
    // frames animating an invisible canvas underneath it (same pattern as Navbar).
    const isHome = pathname === '/';

    useEffect(() => {
        if (isHome) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Logical (CSS pixel) dimensions — drawing happens in this space,
        // while the backing store is scaled by devicePixelRatio for sharpness.
        let width = window.innerWidth;
        let height = window.innerHeight;

        const resizeCanvas = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resizeCanvas();

        // Initialize particles
        const colors = ['#9d4edd', '#7b2cbf', '#c77dff', '#e0aaff', '#00b4d8'];
        const particles: Particle[] = [];

        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.5 + 0.2,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }

        const step = () => {
            particles.forEach(p => {
                // Mouse attraction
                const dx = mouseRef.current.x - p.x;
                const dy = mouseRef.current.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0 && dist < 200) {
                    const force = (200 - dist) / 200;
                    p.vx += (dx / dist) * force * 0.02;
                    p.vy += (dy / dist) * force * 0.02;
                }

                // Update position
                p.x += p.vx;
                p.y += p.vy;

                // Damping
                p.vx *= 0.99;
                p.vy *= 0.99;

                // Wrap around
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;
            });
        };

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            particles.forEach((p, i) => {
                // Draw particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.fill();

                // Draw connections
                particles.slice(i + 1).forEach(p2 => {
                    const d = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
                    if (d < 100) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = p.color;
                        ctx.globalAlpha = (100 - d) / 100 * 0.12;
                        ctx.stroke();
                    }
                });
            });

            ctx.globalAlpha = 1;
        };

        let animationId = 0;
        let running = false;

        const loop = () => {
            step();
            draw();
            animationId = requestAnimationFrame(loop);
        };

        const start = () => {
            if (running || prefersReducedMotion) return;
            running = true;
            animationId = requestAnimationFrame(loop);
        };

        const stop = () => {
            running = false;
            cancelAnimationFrame(animationId);
        };

        // Don't burn CPU/GPU while the tab is in the background.
        const handleVisibility = () => {
            if (document.hidden) stop();
            else start();
        };
        document.addEventListener('visibilitychange', handleVisibility);

        const handleResize = () => {
            resizeCanvas();
            if (prefersReducedMotion) draw();
        };
        window.addEventListener('resize', handleResize);

        // Mouse tracking (pointless without an animation loop)
        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        if (!prefersReducedMotion) {
            window.addEventListener('mousemove', handleMouseMove);
        }

        if (prefersReducedMotion) {
            // Static constellation: a single frame, no loop.
            draw();
        } else {
            start();
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('visibilitychange', handleVisibility);
            stop();
        };
    }, [isHome]);

    if (isHome) return null;

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: -1,
                background: 'linear-gradient(180deg, #030014 0%, #0a0520 50%, #150a30 100%)'
            }}
        />
    );
}
