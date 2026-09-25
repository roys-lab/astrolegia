"use client";

/**
 * Sesión del usuario (Better Auth en la API) + su perfil natal propio.
 *
 *   user     { id, email, name, image, role }  — campos del modelo User de Prisma
 *   profile  NatalProfile con isSelf (o null si todavía no cargó sus datos)
 *
 * Reemplaza al AuthContext de Firebase de Astrolegia v1: ya no hay Firestore ni
 * auto-migraciones; la verdad es PostgreSQL vía GET /v1/client/me.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { MeDTO, NatalProfileWithChartsDTO, UserRole } from '@astrolegia/contracts';
import { Toast, useToast } from '@astrolegia/ui';
import { authClient } from '@/lib/auth-client';
import { api, ApiError } from '@/lib/api';

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    image: string | null;
    role: UserRole;
}

interface AuthContextType {
    user: AuthUser | null;
    profile: NatalProfileWithChartsDTO | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    /** Vuelve a pedir /v1/client/me (p. ej. después de guardar el perfil propio). */
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signInWithGoogle: async () => { },
    logout: async () => { },
    refreshProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const { data: session, isPending } = authClient.useSession();
    const [me, setMe] = useState<MeDTO | null>(null);
    const [meLoading, setMeLoading] = useState(false);
    const { toast, showToast, hideToast } = useToast();

    const sessionUser = session?.user ?? null;
    const sessionUserId = sessionUser?.id ?? null;

    const refreshProfile = useCallback(async () => {
        if (!sessionUserId) {
            setMe(null);
            return;
        }
        setMeLoading(true);
        try {
            setMe(await api<MeDTO>('/v1/client/me'));
        } catch (err) {
            console.error('[Auth] No se pudo cargar /v1/client/me:', err);
            if (err instanceof ApiError && err.status === 401) setMe(null);
        } finally {
            setMeLoading(false);
        }
    }, [sessionUserId]);

    useEffect(() => {
        void refreshProfile();
    }, [refreshProfile]);

    // Objeto estable: los consumidores lo usan como dependencia de efectos.
    const user = useMemo<AuthUser | null>(() => {
        if (!sessionUser) return null;
        const sessionRole = (sessionUser as { role?: string | null }).role;
        return {
            id: sessionUser.id,
            email: sessionUser.email,
            name: sessionUser.name,
            image: sessionUser.image ?? null,
            role: (me?.user.role ?? sessionRole ?? 'user') as UserRole,
        };
    }, [sessionUser, me?.user.role]);

    const profile = me?.user.id === sessionUserId ? me?.profile ?? null : null;
    const loading = isPending || (!!sessionUserId && me === null && meLoading);

    const signInWithGoogle = useCallback(async () => {
        try {
            // El cliente de Better Auth no lanza: devuelve { data, error }.
            const result = await authClient.signIn.social({
                provider: 'google',
                callbackURL: `${window.location.origin}/dashboard`,
            });
            if (result.error) {
                console.error('Error signing in with Google', result.error);
                showToast(result.error.status === 404
                    ? 'El inicio de sesión con Google no está configurado en la API todavía.'
                    : (result.error.message || 'No pudimos iniciar sesión. Probá de nuevo en un momento.'));
            }
        } catch (error) {
            console.error('Error signing in with Google', error);
            showToast('No pudimos conectar con la API para iniciar sesión.');
        }
    }, [showToast]);

    const logout = useCallback(async () => {
        try {
            await authClient.signOut();
            setMe(null);
        } catch (error) {
            console.error('Error signing out', error);
        }
    }, []);

    const value = useMemo<AuthContextType>(
        () => ({ user, profile, loading, signInWithGoogle, logout, refreshProfile }),
        [user, profile, loading, signInWithGoogle, logout, refreshProfile],
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
            {toast && <Toast toast={toast} onClose={hideToast} />}
        </AuthContext.Provider>
    );
};
