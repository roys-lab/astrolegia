import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Input,
  Select,
  Card,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  ShieldIcon,
  UserIcon,
  PlusIcon,
  RefreshCwIcon,
  CheckIcon,
  SparklesIcon,
  AlertCircleIcon,
  GoogleIcon,
  LogOutIcon,
} from '@astrolegia/ui';
import { ADMIN_ROLES, type UserDTO, type UserRole } from '@astrolegia/contracts';
import { API_BASE_URL, apiFetch, authClient, signInWithGoogle, signOut } from './auth';

// localStorage es solo caché de soporte (.AGENTS §4): la verdad es PostgreSQL vía la API.
const LOCAL_STORAGE_USERS_KEY = 'astrolegia_cached_users';

export default function App() {
  const { data: session, isPending } = authClient.useSession();
  const sessionUser = session?.user ?? null;
  const role = (sessionUser?.role ?? 'user') as UserRole;
  const isAdmin = !!sessionUser && ADMIN_ROLES.includes(role);

  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('viewer');
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sincronización con PostgreSQL (la API valida sesión y rol en cada petición)
  const fetchUsersFromDatabase = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/v1/admin/users');
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message || `La API respondió ${response.status}`);
      }
      const json = await response.json();
      const freshUsers: UserDTO[] = json.data;

      setUsers(freshUsers);
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(freshUsers));
    } catch (err: any) {
      console.error('Fallo en sincronización con la base de datos:', err);
      setFeedback({
        type: 'error',
        message: err?.message || `No se pudo sincronizar con la API en ${API_BASE_URL}. Verifica que el servidor esté activo.`,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      if (cached) {
        setUsers(JSON.parse(cached));
      }
    } catch (e) {
      console.warn('No se pudo leer la caché local:', e);
    }

    fetchUsersFromDatabase();
  }, [isAdmin, fetchUsersFromDatabase]);

  const handleLogout = async () => {
    await signOut();
    setUsers([]);
    setFeedback(null);
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setFeedback({ type: 'error', message: 'Por favor ingresa un correo electrónico válido' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await apiFetch('/v1/admin/users/assign-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), role: newRole }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Fallo al asignar el rol');
      }

      setFeedback({
        type: 'success',
        message: `Rol ${newRole} asignado y guardado en PostgreSQL para ${email}`,
      });
      setEmail('');
      await fetchUsersFromDatabase();
    } catch (err: any) {
      console.error('Error al guardar en base de datos:', err);
      setFeedback({ type: 'error', message: err.message || 'Error al conectar con la API' });
    } finally {
      setSubmitting(false);
    }
  };

  // Resolviendo la sesión con la API
  if (isPending) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        <RefreshCwIcon size={18} className="animate-spin mr-2" /> Verificando sesión…
      </div>
    );
  }

  // Pantalla de Inicio de Sesión SSO si no está autenticado
  if (!sessionUser) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-indigo-950/80 border border-indigo-700/50 rounded-2xl text-indigo-400 mb-2">
              <SparklesIcon size={36} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">ASTROLEGIA</h1>
            <p className="text-sm text-slate-400">Panel de Control & Administración</p>
          </div>

          <Card
            title="Iniciar Sesión"
            description="Acceso exclusivo para administradores, editores y operadores autorizados."
          >
            <div className="space-y-5">
              <div className="p-3.5 bg-indigo-950/40 border border-indigo-800/40 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold">
                  <ShieldIcon size={14} />
                  <span>Autenticación Centralizada Google SSO</span>
                </div>
                <p className="text-xs text-slate-400">
                  La sesión la emite la API (Better Auth) y el rol se verifica en PostgreSQL. Solo entran los correos con rol administrativo.
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  // El cliente de Better Auth devuelve { data, error } en vez de lanzar
                  const result = await signInWithGoogle();
                  if (result.error) {
                    setFeedback({
                      type: 'error',
                      message: result.error.status === 404
                        ? 'El login con Google no está configurado en la API (faltan GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).'
                        : result.error.message || 'No se pudo iniciar sesión con Google.',
                    });
                  }
                }}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-slate-800 hover:bg-slate-100 rounded-xl font-medium text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <GoogleIcon size={20} />
                <span>Continuar con Google</span>
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Autenticado pero sin rol administrativo (doc 03: 403)
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <Card title="Sin acceso" description="Tu cuenta de Google no tiene un rol administrativo asignado.">
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-xs">
                <UserIcon size={14} className="text-indigo-400" />
                <span className="text-slate-200 font-medium">{sessionUser.email}</span>
                <Badge variant="user" className="text-[10px]">{role}</Badge>
              </div>
              <p className="text-xs text-slate-400">
                Pedile a un super admin que te asigne el rol viewer, editor o super_admin y volvé a entrar.
              </p>
              <Button variant="outline" size="sm" icon={<LogOutIcon size={16} />} onClick={handleLogout}>
                Salir
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-8">

        {/* Cabecera del Panel */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-950/80 border border-indigo-700/50 rounded-xl text-indigo-400">
              <SparklesIcon size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Astrolegia — Administración</h1>
              <p className="text-sm text-slate-400">Control operativo y gestión de roles en PostgreSQL ({API_BASE_URL})</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Usuario autenticado */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <UserIcon size={14} className="text-indigo-400" />
              <span className="text-slate-200 font-medium">{sessionUser.email}</span>
              <Badge variant={role} className="text-[10px]">
                {role}
              </Badge>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCwIcon size={16} className={loading ? 'animate-spin' : ''} />}
              onClick={fetchUsersFromDatabase}
              disabled={loading}
            >
              Sincronizar BD
            </Button>

            <a
              href={`${API_BASE_URL}/v1/astrology/natal-chart/sample/pdf`}
              target="_blank"
              rel="noreferrer"
              className="no-underline"
            >
              <Button variant="secondary" size="sm" icon={<SparklesIcon size={16} />}>
                Test Stream PDF
              </Button>
            </a>

            <Button
              variant="danger"
              size="sm"
              icon={<LogOutIcon size={16} />}
              onClick={handleLogout}
            >
              Salir
            </Button>
          </div>
        </header>

        {/* Notificaciones y Feedback */}
        {feedback && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? <CheckIcon size={20} /> : <AlertCircleIcon size={20} />}
            <span className="flex-1">{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs opacity-70 hover:opacity-100 uppercase font-bold"
            >
              Cerrar
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Formulario de Asignación de Roles (solo super_admin en la API) */}
          <div className="lg:col-span-1">
            <Card
              title="Asignar Rol a Usuario"
              description="Ingresa el correo del operador o consultante para registrarlo o actualizarlo en la base de datos PostgreSQL. Requiere rol super_admin."
            >
              <form onSubmit={handleAssignRole} className="space-y-4">
                <Input
                  label="Correo Electrónico Google"
                  placeholder="ejemplo@royslab.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<UserIcon size={18} />}
                  required
                />

                <Select
                  label="Rol Asignado"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  options={[
                    { value: 'viewer', label: 'Viewer (Solo Lectura)' },
                    { value: 'editor', label: 'Editor (Contenidos & Orbes)' },
                    { value: 'super_admin', label: 'Super Admin (Control Total)' },
                    { value: 'user', label: 'User (Consultante Estándar)' },
                  ]}
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-2"
                  loading={submitting}
                  disabled={role !== 'super_admin'}
                  icon={<PlusIcon size={18} />}
                >
                  Guardar en Base de Datos
                </Button>
              </form>
            </Card>
          </div>

          {/* Tabla de Usuarios Registrados en PostgreSQL */}
          <div className="lg:col-span-2">
            <Card
              title="Usuarios y Roles en el Sistema"
              description="Datos leídos en tiempo real desde la única fuente de la verdad (PostgreSQL)."
              headerExtra={
                <Badge variant="default">
                  {users.length} Registros
                </Badge>
              }
            >
              {users.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <UserIcon size={32} className="mx-auto opacity-40" />
                  <p className="text-sm">No hay usuarios cargados aún.</p>
                  <p className="text-xs">Usa el formulario lateral o corre el seed para agregar super-admins.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Registrado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-slate-200">
                          <div className="flex items-center gap-2">
                            <UserIcon size={16} className="text-slate-500" />
                            <span>{u.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.role} icon={<ShieldIcon size={12} />}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
}
