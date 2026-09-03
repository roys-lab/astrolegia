import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Circle } from 'react-native-svg';

const API_BASE_URL = 'http://localhost:3000';
const CLIENT_STORAGE_KEY = 'astrolegia_client_user';

// Icono Google SVG (Cero ASCII)
const GoogleSvgIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <Path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <Path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <Path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </Svg>
);

// Icono Astral SVG
const AstralStarIcon = ({ size = 48 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"
      stroke="#D4AF37"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx={12} cy={12} r={3} stroke="#A855F7" strokeWidth={1.5} />
  </Svg>
);

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [loadingApi, setLoadingApi] = useState<boolean>(false);

  // 1. Manejo y sincronización de rutas (Soporte Web + Native)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const initialPath = window.location.pathname || '/';
      setCurrentPath(normalizePath(initialPath));

      const handlePopState = () => {
        setCurrentPath(normalizePath(window.location.pathname || '/'));
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  const normalizePath = (p: string) => {
    const trimmed = p.trim();
    if (trimmed === '' || trimmed === '/') return '/';
    if (trimmed.startsWith('/login')) return '/login/';
    if (trimmed.startsWith('/profile')) return '/profile/';
    return '/';
  };

  const navigate = (path: string) => {
    const norm = normalizePath(path);
    setCurrentPath(norm);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.pushState(null, '', norm);
    }
  };

  // 2. Verificar API Backend en puerto 3000
  const checkApi = async () => {
    setLoadingApi(true);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/capabilities`);
      if (res.ok) {
        const json = await res.json();
        setApiStatus(json.data);
      } else {
        setApiStatus(null);
      }
    } catch {
      setApiStatus(null);
    } finally {
      setLoadingApi(false);
    }
  };

  useEffect(() => {
    checkApi();
  }, []);

  // 3. Simulación de SSO Bypass para Google
  const handleGoogleLoginBypass = () => {
    const consultanteUser = {
      email: 'consultante@astrolegia.com',
      name: 'Consultante Astral',
    };
    setUser(consultanteUser);
    navigate('/profile/');
  };

  const handleLogout = () => {
    setUser(null);
    navigate('/login/');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Barra de Navegación de Rutas Superior */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navItem, currentPath === '/' && styles.navItemActive]}
          onPress={() => navigate('/')}
        >
          <Text style={[styles.navText, currentPath === '/' && styles.navTextActive]}>
            / (Inicio)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentPath === '/login/' && styles.navItemActive]}
          onPress={() => navigate('/login/')}
        >
          <Text style={[styles.navText, currentPath === '/login/' && styles.navTextActive]}>
            /login/
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentPath === '/profile/' && styles.navItemActive]}
          onPress={() => navigate('/profile/')}
        >
          <Text style={[styles.navText, currentPath === '/profile/' && styles.navTextActive]}>
            /profile/
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ======================================================== */}
        {/* VISTA 1: / (Home - Hello World) */}
        {/* ======================================================== */}
        {currentPath === '/' && (
          <View style={styles.viewBlock}>
            <View style={styles.iconWrapper}>
              <AstralStarIcon size={56} />
            </View>

            <Text style={styles.title}>ASTROLEGIA</Text>
            <Text style={styles.helloWorldBadge}>Hello World — Cliente Frontend</Text>
            <Text style={styles.subtitle}>
              Bienvenido al portal astrológico para consultantes. Conectado a la API unificada y base de datos PostgreSQL.
            </Text>

            {/* Tarjeta de Estado del Backend */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Conexión con Backend API (:3000)</Text>
              {loadingApi ? (
                <ActivityIndicator size="small" color="#D4AF37" />
              ) : apiStatus ? (
                <View style={styles.statusOnline}>
                  <Text style={styles.statusTextOnline}>
                    ✓ Online — Versión {apiStatus.apiVersion} (Build {apiStatus.latestBuild})
                  </Text>
                </View>
              ) : (
                <Text style={styles.statusTextOffline}>
                  Backend no detectado en http://localhost:3000
                </Text>
              )}
            </View>

            {/* Accesos Directos */}
            <View style={styles.actionsBox}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigate('/login/')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Ir a Iniciar Sesión (/login/)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigate('/profile/')}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryButtonText}>Ver Mi Perfil (/profile/)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* VISTA 2: /login/ (Single Sign-On Google Bypass) */}
        {/* ======================================================== */}
        {currentPath === '/login/' && (
          <View style={styles.viewBlock}>
            <View style={styles.iconWrapper}>
              <AstralStarIcon size={44} />
            </View>

            <Text style={styles.title}>Acceso de Consultantes</Text>
            <Text style={styles.subtitle}>Ruta: /login/</Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Single Sign-On Google</Text>
              <Text style={styles.cardDescription}>
                Inicia sesión con tu cuenta de Google para acceder a tu perfil astral y calcular tus cartas natales.
              </Text>

              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  Modo Bypass Activo: Haz clic en el botón inferior para ingresar directamente como consultante sin requerir credenciales en Google Cloud.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleLoginBypass}
                activeOpacity={0.85}
              >
                <GoogleSvgIcon size={20} />
                <Text style={styles.googleButtonText}>Continuar con Google</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.linkButton} onPress={() => navigate('/')}>
              <Text style={styles.linkButtonText}>← Volver a Inicio (/)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ======================================================== */}
        {/* VISTA 3: /profile/ (Perfil del Consultante) */}
        {/* ======================================================== */}
        {currentPath === '/profile/' && (
          <View style={styles.viewBlock}>
            <View style={styles.iconWrapper}>
              <AstralStarIcon size={44} />
            </View>

            <Text style={styles.title}>Perfil del Consultante</Text>
            <Text style={styles.subtitle}>Ruta: /profile/</Text>

            {user ? (
              <View style={styles.card}>
                <View style={styles.profileHeader}>
                  <Text style={styles.profileName}>{user.name}</Text>
                  <Text style={styles.profileEmail}>{user.email}</Text>
                </View>

                <View style={styles.profileDataBox}>
                  <Text style={styles.profileSectionTitle}>Carta Natal Activa:</Text>
                  <Text style={styles.profileDataText}>• Sol: 12° Aries</Text>
                  <Text style={styles.profileDataText}>• Luna: 28° Cáncer</Text>
                  <Text style={styles.profileDataText}>• Ascendente: 04° Escorpio</Text>
                </View>

                <View style={styles.pdfBanner}>
                  <Text style={styles.pdfText}>
                    Stream directo de PDF disponible en API backend:
                  </Text>
                  <Text style={styles.pdfSubtext}>
                    http://localhost:3000/v1/astrology/natal-chart/sample/pdf
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.dangerButton}
                  onPress={handleLogout}
                  activeOpacity={0.85}
                >
                  <Text style={styles.dangerButtonText}>Cerrar Sesión</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Sesión no iniciada</Text>
                <Text style={styles.cardDescription}>
                  Debes iniciar sesión con Google para visualizar la información de tu perfil astrológico.
                </Text>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => navigate('/login/')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Ir a Iniciar Sesión (/login/)</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.linkButton} onPress={() => navigate('/')}>
              <Text style={styles.linkButtonText}>← Volver a Inicio (/)</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
    paddingTop: 40,
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  navItem: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  navItemActive: {
    backgroundColor: '#312E81',
    borderColor: '#4F46E5',
  },
  navText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  navTextActive: {
    color: '#FFFFFF',
  },
  viewBlock: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    marginTop: 20,
  },
  iconWrapper: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#1E1B4B',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#4338CA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 4,
    textAlign: 'center',
  },
  helloWorldBadge: {
    fontSize: 12,
    color: '#D4AF37',
    fontWeight: '600',
    backgroundColor: '#2A1B4E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  card: {
    width: '100%',
    backgroundColor: '#161B22',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30363D',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  statusOnline: {
    marginTop: 4,
  },
  statusTextOnline: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  statusTextOffline: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '500',
    marginTop: 4,
  },
  actionsBox: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '500',
  },
  noticeBox: {
    backgroundColor: '#1E1B4B',
    borderColor: '#3730A3',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    width: '100%',
  },
  noticeText: {
    fontSize: 11,
    color: '#C7D2FE',
    textAlign: 'center',
    lineHeight: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
  },
  googleButtonText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '600',
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkButtonText: {
    color: '#818CF8',
    fontSize: 13,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileEmail: {
    fontSize: 12,
    color: '#818CF8',
    marginTop: 2,
  },
  profileDataBox: {
    backgroundColor: '#0D1117',
    padding: 12,
    borderRadius: 10,
    width: '100%',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#21262D',
  },
  profileSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#E2E8F0',
    marginBottom: 6,
  },
  profileDataText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  pdfBanner: {
    backgroundColor: '#1E1B4B',
    padding: 10,
    borderRadius: 8,
    width: '100%',
    marginBottom: 16,
  },
  pdfText: {
    fontSize: 11,
    color: '#C7D2FE',
    fontWeight: '600',
  },
  pdfSubtext: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  dangerButton: {
    backgroundColor: '#991B1B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
