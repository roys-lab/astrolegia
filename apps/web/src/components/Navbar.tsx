"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import AstrolegiaLogo from '@/components/AstrolegiaLogo';
import { Users, Menu, X, LayoutDashboard, LogOut } from 'lucide-react';

// Solo las rutas que existen en esta app. Red, Sinergia, Oráculo y
// Constelaciones son módulos de v1 que todavía no se migraron (ver ADR-0001).
const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: null },
    { name: 'Personas', path: '/people', icon: <Users size={16} /> },
    { name: 'Calendario', path: '/astrology', icon: null },
];

export default function Navbar() {
    const pathname = usePathname();
    const { user, logout, signInWithGoogle } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const mobilePanelRef = useRef<HTMLDivElement>(null);
    const mobileButtonRef = useRef<HTMLButtonElement>(null);
    const shouldReduceMotion = useReducedMotion();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
            if (
                mobilePanelRef.current && !mobilePanelRef.current.contains(event.target as Node) &&
                mobileButtonRef.current && !mobileButtonRef.current.contains(event.target as Node)
            ) {
                setMobileOpen(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Close the mobile panel on navigation
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Close menus with Escape
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMobileOpen(false);
                setMenuOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Lock body scroll while the mobile panel is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [mobileOpen]);

    // If the viewport grows to desktop, discard the mobile panel state
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)');
        const handleChange = (event: MediaQueryListEvent) => {
            if (event.matches) setMobileOpen(false);
        };
        mq.addEventListener('change', handleChange);
        return () => mq.removeEventListener('change', handleChange);
    }, []);

    // Hide Navbar on Landing Page (After hooks to avoid React errors)
    if (pathname === '/') return null;

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out border-b ${scrolled
                ? 'bg-[#050511]/80 backdrop-blur-xl border-white/5 py-3 shadow-2xl shadow-indigo-500/10'
                : 'bg-transparent border-transparent py-6'
                }`}
        >
            <div className="container flex items-center justify-between">

                {/* Logo Area */}
                {/* Logo Area */}
                <Link href="/dashboard" className="flex items-center gap-3 group">
                    <div className="relative w-[140px] md:w-[180px]">
                        <div className="absolute inset-0 bg-accent-primary blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
                        <AstrolegiaLogo width="100%" priority />
                    </div>
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-full p-1.5 border border-white/5 backdrop-blur-md shadow-inner shadow-black/20">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 relative overflow-hidden flex items-center gap-2 ${isActive
                                    ? 'text-white shadow-lg bg-gradient-to-r from-accent-primary to-accent-secondary'
                                    : 'text-white/60 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {item.icon}
                                {item.name}
                            </Link>
                        );
                    })}
                </div>

                {/* User Profile / Actions */}
                <div className="flex items-center gap-4 text-white">
                    {user ? (
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="flex items-center gap-3 hover:bg-white/5 p-1 pr-3 rounded-full transition-colors border border-transparent hover:border-white/10"
                            >
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-accent-primary to-accent-secondary p-[1px] relative overflow-hidden">
                                    {user.image ? (
                                        <img src={user.image} className="w-full h-full rounded-full object-cover" alt="User" />
                                    ) : (
                                        <div className="w-full h-full bg-bg-deep flex items-center justify-center text-xs font-bold rounded-full">
                                            {user.email[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <span className="text-sm font-medium hidden sm:block opacity-80">{user.name.split(' ')[0]}</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`}>
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            <AnimatePresence>
                                {menuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full right-0 mt-3 w-48 bg-[#0a0514] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-2 z-50 origin-top-right"
                                    >
                                        <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2" onClick={() => setMenuOpen(false)}>
                                            <LayoutDashboard size={16} /> Dashboard
                                        </Link>
                                        <div className="h-px bg-white/10 my-2"></div>
                                        <button
                                            onClick={() => logout()}
                                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                        >
                                            <LogOut size={16} /> Cerrar Sesión
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <button
                            onClick={() => signInWithGoogle()}
                            className="btn-primary text-xs px-6 py-2"
                        >
                            Acceder
                        </button>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button
                        ref={mobileButtonRef}
                        onClick={() => setMobileOpen((open) => !open)}
                        className="md:hidden w-11 h-11 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
                        aria-expanded={mobileOpen}
                        aria-controls="mobile-nav-panel"
                    >
                        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Panel */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        key="mobile-nav-panel"
                        id="mobile-nav-panel"
                        ref={mobilePanelRef}
                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
                        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className="md:hidden absolute top-full left-0 right-0 bg-[#050511]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl shadow-indigo-500/10 max-h-[75vh] overflow-y-auto"
                    >
                        <div className="container py-4 flex flex-col gap-1">
                            {navItems.map((item) => {
                                const isActive = pathname.startsWith(item.path);
                                return (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium transition-all duration-300 ${isActive
                                            ? 'text-white shadow-lg bg-gradient-to-r from-accent-primary to-accent-secondary'
                                            : 'text-white/70 hover:text-white hover:bg-white/10'
                                            }`}
                                    >
                                        {item.icon}
                                        {item.name}
                                    </Link>
                                );
                            })}

                            {user && (
                                <>
                                    <div className="h-px bg-white/10 my-3"></div>
                                    <button
                                        onClick={() => {
                                            setMobileOpen(false);
                                            logout();
                                        }}
                                        className="flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                    >
                                        <LogOut size={16} /> Cerrar Sesión
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
