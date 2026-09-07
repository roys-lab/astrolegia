[← Volver al Índice de Tecnología](../README.md) | [← Volver al Índice Principal](../../index.md)

# ADR-0001: Migración de Astrolegia v1 (Next.js + Firebase) al monorepo

## Status

proposed — propuesto por Santos el 2026-09-05; revisión de Roy pendiente.
Actualizado el 2026-09-07: la persistencia en PostgreSQL y la identidad con
Better Auth quedaron implementadas (paso 2 de abajo). Firebase ya no existe en
el repo.

## Context

Astrolegia v1 era una app Next.js 16 (App Router) + Tailwind 3 + Firebase
(Google Auth + Firestore) con módulos ya funcionando y probados: home,
dashboard, personas con carta natal (rueda zodiacal SVG propia), numerología
(motor Hitchcock) y calendario de favorabilidad (efemérides locales verificadas
contra JPL Horizons). Vino empaquetada como un set cerrado de 94 archivos con
215 tests en verde.

El monorepo define otra arquitectura (docs/technology + `.AGENTS`): una única
API backend (`apps/api`), PostgreSQL como única fuente de verdad, Google SSO con
Better Auth, cliente en Expo (`apps/client`), admin en Vite (`apps/admin`),
Design System en `packages/ui`, sin estilos inline, sin iconos ASCII/emoji.

## Decision Drivers

* Aprovechar código probado (motores + tests) en vez de reescribirlo.
* Tener algo desplegable para trabajar de a dos sobre el mismo repo.
* Cumplir `.AGENTS` donde se puede ya y dejar el resto explícito, con plan.
* Que los motores sirvan también a `apps/api` y a `apps/client` (Expo).
* Que Roy pueda aprovisionar Railway con un esquema y una API definitivos.

## Considered Options

### Option 1: Pegar la app entera en `apps/web` tal cual
* **Pros**: un día de trabajo, cero riesgo de romper algo.
* **Cons**: duplica primitivas y motores dentro de una app (viola §1), nada
  reutilizable desde la API ni desde Expo, Firebase permanente.

### Option 2: Portar todo a Expo + API + PostgreSQL antes de integrar
* **Pros**: cumple la arquitectura objetivo desde el primer commit.
* **Cons**: semanas sin nada desplegable; alto riesgo de regresión en la rueda
  zodiacal y la numerología sin una referencia corriendo.

### Option 3 (elegida): Repartir por capas en dos pasos
1. Motores puros → `packages/core`; primitivas y tokens → `packages/ui`; la app
   → `apps/web` con Firebase transitorio (2026-09-05).
2. Esquema de Prisma con migraciones, Better Auth en la API, endpoints
   `/v1/client/*`, y la web consumiendo la API sin Firebase (2026-09-07).

* **Pros**: cada paso deja el repo verificable; los incumplimientos de
  `.AGENTS` quedan listados con su plan.
* **Cons**: durante dos días convivieron Firebase (web) y PostgreSQL (API).

## Decision

### Paso 1 (2026-09-05): capas

| Destino | Qué es | Origen en el pack v1 |
|---|---|---|
| `packages/core` (`@astrolegia/core`) | Motores puros + tipos + 132 tests. Subpaths `./astrology`, `./numerology`, `./people`, `./types`. | `lib/astrology.ts`, `lib/zodiac-wheel.ts`, `lib/chart-display.ts`, `lib/numerology*.ts`, `lib/branding-logic.ts`, `services/numerology-hitchcock.ts`, `services/people-core.ts`, `services/profile-store.ts`, `types/*` y sus tests. |
| `packages/ui/src/cosmic` + `tokens` | Primitivas Cosmic Luxury (`GlassCard`, `PageHeader`, `StatBadge`, `Toast`) y tokens `cosmicLuxury`. | `components/system/*`, `design-system/tokens.ts` |
| `apps/web` (`@astrolegia/web`, puerto 3003) | La app Next.js: páginas, layout, `globals.css`, componentes de dominio. | `app-web/` |
| `docs/design/cosmic-luxury.md` | Documento del sistema visual. | `design-system/MASTER.md` |

Podas para no linkear a módulos de v1 que no vinieron (perfil propio, red,
sinastría, oráculo, constelaciones, Diseño Humano, Kin Maya,
proyectos/branding/naming/ADN, Mercurio, admin): Navbar, dashboard, `/conocer`
(herramientas "Próximamente"), numerología. El calendario dejó de usar emojis.

### Paso 2 (2026-09-07): PostgreSQL + Better Auth + API

**Esquema (`packages/database/prisma/schema.prisma`, migraciones versionadas en
`prisma/migrations/`):**

| Modelo | Decisión |
|---|---|
| `User`, `Session`, `Account`, `Verification` | Esquema base de Better Auth (nombres exactos del adapter de Prisma) + `role` (enum `UserRole`) para RBAC. `name` pasa a obligatorio; ids generados por PostgreSQL (uuid). |
| `NatalProfile` | Equivale a `Person` de v1: `birthDate` como `date`; `birthTime` "HH:MM" opcional con `birthTimeKnown`; lugar opcional (`city`, `country`, `latitude`, `longitude`, `timezone`); `tags`, `notes`; `isSelf` (perfil del propio usuario, uno por usuario); `source` (`manual` / `imported`) y `legacyRefs` (origen Firestore). |
| `ChartCalculation` | Una fila por perfil y `type` (`natal`, `numerology`, `humanDesign`, `mayanKin`) con `engineVersion`, `inputHash` (djb2 de fecha + hora conocida + lat/lng/timezone, la misma función de v1 en `@astrolegia/core/people`) y `payload` completo; `planetaryPositions`, `houseCusps`, `planetaryAspects`, `ascendantSign` pasan a derivados opcionales. |

`db push` se reemplaza por migraciones: `pnpm db:migrate` en local,
`prisma migrate deploy` en Railway (`clean-project.bat` usa `migrate:reset`).

**Contratos (`packages/contracts`):** `NatalProfileSchema` (DTO persistido),
`CreateNatalProfileSchema` / `UpdateNatalProfileSchema`, `ChartCalculationSchema`
(+ `status`), `ChartSummarySchema`, `SaveChartSchema`, `MeSchema`, geocoding e
interpretación, envelope `{ data, meta } / { error, meta }` y `ENGINE_VERSIONS`.
Los nombres de campo son los de Prisma (§4).

**Identidad (`packages/auth` + `apps/api`):** Better Auth con el adapter de
Prisma, Google como único proveedor, montado en `/v1/auth/*`, sesiones de 30
días con renovación, vinculación automática de cuentas por email verificado (los
super admins del seed entran con Google sin pasos extra), plugin `bearer` para
Expo, rate limit propio en producción, cookies cross-site opcionales
(`AUTH_CROSS_SITE_COOKIES`). Middlewares `attachSession`, `requireUser`,
`requireRole`; `/v1/admin/*` exige rol administrativo y asignar roles exige
`super_admin`. El admin (`apps/admin`) reemplazó el bypass por el login real.

**API (`apps/api`, Express):** `env.ts` valida variables; envelope y
`X-Request-Id` en `http.ts`; CORS con orígenes explícitos y `credentials`;
`helmet`; rate limit general (100/min por IP) y de cálculo (10/min por usuario).
Rutas: `GET /health`, `GET /v1/capabilities`, `/v1/admin/users` (+ assign-role),
`/v1/client/me` (+ `PUT /profile`), `/v1/client/people` (CRUD),
`/v1/client/people/:id/charts/:type` (GET, PUT para cartas calculadas en el
cliente, DELETE), `POST /v1/client/people/:id/charts/natal` (RapidAPI desde la
API), `GET /v1/client/geocoding?q=`, `POST /v1/client/astrology/interpret`.
Los módulos server de v1 (`astrologer.ts`, `ai-gateway.ts`,
`knowledge-retrieval.ts`) se mudaron con sus tests. `scripts/smoke.ts` recorre el
flujo completo contra una base real.

**Web (`apps/web`):** sin Firebase ni route handlers. `lib/api.ts` (fetch con
credenciales y cabeceras `X-App-*`), `lib/auth-client.ts` (Better Auth React),
`AuthContext` expone `user { id, email, name, image, role }` y `profile`
(perfil propio con resumen de cartas); `services/people-service.ts` habla con
la API; las páginas usan los DTOs con los nombres de Prisma (`name`,
`birthDate` ISO, `city`…). El estado de vigencia de cada carta viene de la API.

**Migración de datos (`tools/firestore-migration`):** export con firebase-admin
(service account) e import idempotente con Prisma (dedupe nombre + fecha,
`source = imported`, `legacyRefs`). Escrita, no ejecutada todavía.

## Verificación

| Fecha | Chequeo | Resultado |
|---|---|---|
| 2026-09-05 | `pnpm --filter @astrolegia/core test` | 6 archivos, 132 tests OK |
| 2026-09-07 | `pnpm --filter @astrolegia/api test` | 5 archivos, 85 tests OK (envelope, guards, Better Auth montado, hash y estados, pipeline de fecha/hora, ai-gateway, RAG) |
| 2026-09-07 | `pnpm --filter @astrolegia/api smoke` (Postgres 16 en Docker) | 20 checks OK: 401 sin token, `/me`, CRUD de personas, cartas, `stale-data`, perfil propio, 404/409, admin con rol, borrado |
| 2026-09-07 | `prisma migrate dev` desde base vacía + seed | migración `init_identity_and_natal_profiles` aplicada, 7 tablas, 2 super admins |
| 2026-09-07 | `tsc --noEmit` en `core`, `ui`, `auth`, `api`, `tools`; `tsup` de `api`, `contracts`, `database` | sin errores |
| 2026-09-07 | `next build` de `apps/web` | OK, 12 rutas (ninguna `/api`) |
| 2026-09-07 | `tsc && vite build` de `apps/admin` | OK |
| 2026-09-07 | `eslint` de `apps/web` | solo avisos preexistentes de v1 (`no-explicit-any`, `set-state-in-effect`, `no-img-element`) |
| pendiente | Login real con Google | requiere el OAuth client de Google (ver próximos pasos) |
| pendiente | Cálculo de carta natal | requiere `RAPIDAPI_KEY` en la API; sin ella responde `CONFIGURATION_ERROR` |

## Consequences

### Cumplimiento de `.AGENTS` en `apps/web`

| Regla | Estado | Qué falta |
|---|---|---|
| §1 Primitivas en `packages/ui` | Parcial | Mover `components/cosmic/*`, `AstrolegiaLogo`, `ZodiacWheel`, `ChartBodiesGrid`, `BirthDataForm`, `Calendar` (requiere que `packages/ui` acepte `framer-motion`, `date-fns` y `@astrolegia/core`). |
| §2 Sin estilos inline | No cumple | ~200 `style={{}}` en 18 archivos (`numerology/page.tsx` 117, `dashboard/page.tsx` 32). Los colores data-driven necesitan clases por nivel. |
| §3 Iconos SVG, sin ASCII/emoji | Casi | Emojis en `Calendar.tsx` (🌕/🌑) y `numerology/page.tsx`; el campo `emoji` de `FavorabilityFactor` en `core/astrology` ya no tiene consumidores y se puede quitar. Los glifos de `ZodiacWheel` son `<text>` dentro de `<svg>`. |
| §4 PostgreSQL única fuente de verdad | **Cumple** | La web solo lee y escribe vía `/v1/client/*`; no usa `localStorage`. |
| §4 Nombres = schema Prisma | **Cumple** | DTOs de `@astrolegia/contracts` con los nombres de Prisma; el estado de la web usa esos DTOs. |
| §5 Única API backend | **Cumple** | Sin route handlers en la web; toda ruta de datos exige sesión; rate limit y CORS explícito. |
| §5 Sin buckets | Cumple | Nada persiste archivos. |

### Positive
* Identidad y datos en un solo lugar (PostgreSQL), con roles verificados en el
  servidor y auditoría de cambios de rol.
* Motores y contratos compartidos; la API ya calcula y cachea cartas.
* Web desplegable en Vercel apuntando a la API; admin con login real.
* Roy tiene migraciones, variables de entorno, healthcheck y smoke test para
  Railway.

### Negative
* La web todavía no tiene página de perfil propio: `PUT /v1/client/me/profile`
  existe pero ninguna pantalla lo usa (el dashboard muestra el CTA a Personas).
* El botón "Generar informe" de numerología apunta a `/api/report`, que nunca
  existió en el pack: sigue muerto.
* Lint de `apps/web` en rojo por deuda de v1 (`any`, `setState` en effects).

### Risks
* Cookies entre dominios distintos (web en `*.vercel.app`, API en Railway):
  el login funciona solo con `AUTH_CROSS_SITE_COOKIES=true` y HTTPS.
  *Mitigation*: usar `astrolegia.com` + `api.astrolegia.com` (mismo sitio) en
  producción; la variable cubre las previews.
* Regresiones visuales al mover componentes a `packages/ui`.
  *Mitigation*: mover de a uno, con `next build` + revisión en `/people/[id]`
  y `/astrology`.

## Lo que Roy necesita para Railway

1. Servicio PostgreSQL y servicio `api` con root `apps/api`.
   Build: `pnpm install && pnpm --filter @astrolegia/database generate && pnpm --filter @astrolegia/database build && pnpm --filter @astrolegia/contracts build && pnpm --filter @astrolegia/api build`.
   Pre-deploy: `pnpm --filter @astrolegia/database migrate:deploy`.
   Start: `pnpm --filter @astrolegia/api start`. Healthcheck: `GET /health`.
2. Variables (lista completa en `apps/api/.env.example`): `DATABASE_URL`,
   `BETTER_AUTH_URL` (URL pública de la API), `BETTER_AUTH_SECRET`,
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `WEB_URL`, `ADMIN_URL`,
   `CLIENT_URL`, `AUTH_TRUSTED_ORIGINS`, `AUTH_CROSS_SITE_COOKIES`,
   `RAPIDAPI_KEY`, `RAPIDAPI_HOST`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`.
3. Seed inicial: `pnpm db:seed` (super admins roy@royslab.com y
   santos.dlc@gmail.com).
4. OAuth client de Google (Google Cloud Console → APIs y servicios →
   Credenciales → Crear credenciales → ID de cliente de OAuth, tipo
   "Aplicación web"). Sirve cualquier proyecto de Google Cloud, no hace falta
   el de Firebase de v1. Redirect URI: `<BETTER_AUTH_URL>/v1/auth/callback/google`
   (la API la imprime al arrancar). Mientras la pantalla de consentimiento esté
   "En prueba", agregar los correos de ambos socios como usuarios de prueba.
   El ID y el secreto van a `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
5. Web (`apps/web`): Vercel con Root Directory `apps/web` (o un servicio
   Node en Railway con `pnpm --filter @astrolegia/web build` / `start`).
   Variable `NEXT_PUBLIC_API_URL` = URL pública de la API. En la API, esa URL
   de la web va en `WEB_URL`. Si web y API no comparten dominio raíz (p. ej.
   `*.vercel.app` contra `*.up.railway.app`), poner `AUTH_CROSS_SITE_COOKIES=true`
   en la API; con `astrolegia.com` + `api.astrolegia.com` no hace falta.
6. Claves de proveedores (`RAPIDAPI_KEY`, `RAPIDAPI_HOST`, `GEMINI_API_KEY`,
   `ANTHROPIC_API_KEY`): son las mismas de Astrolegia v1; Santos las pasa por
   un canal seguro, nunca por el repo ni por el PR.
7. Primera prueba en línea: entrar con Google en la web (los dos correos del
   seed quedan como `super_admin`), crear una persona en Personas y generar su
   carta. Después, correr `tools/firestore-migration` contra esa base para
   traer los datos de v1.

## Decisiones abiertas (para resolver entre socios)

1. **Identidad visual.** Tres paletas conviven: doc 04 (Azul Medianoche,
   Púrpura Astral, Oro Celestial), Cosmic Luxury en `apps/web` y los
   indigo/slate de `packages/ui`. Elegir una y regenerar tokens.
2. **Superficie web de consultantes.** ¿`apps/web` (Next.js) es la web
   definitiva o un puente hasta que `apps/client` (Expo Web) tenga estas
   pantallas? La rueda se porta a `react-native-svg` sobre `core/astrology`.
3. **Hosting de la web.** Los docs dicen Railway; `apps/web` va a Vercel.
4. **Efemérides.** Carta natal por RapidAPI (Astrologer API v5) + tránsitos con
   `astronomy-engine` local; doc 18 deja abierto swisseph.
5. **IA.** `ai-gateway` (Gemini + Claude con fallback) vive ahora en la API;
   definir si el informe de numerología también pasa por la API.
6. **Baseline de lint.** Corregir los `no-explicit-any` de v1 o relajar la regla
   para los archivos legacy hasta que se migren.
7. **Cuándo correr la migración de datos** de Santos (tools/firestore-migration)
   y contra qué base (staging o producción).

## Próximos pasos sugeridos

1. Commit + push; PR para revisar este ADR.
2. OAuth client de Google (Santos) y proyecto en Vercel para `apps/web`.
3. Railway (Roy) con la checklist de arriba.
4. Correr la migración de datos y verificar cartas `current` en la web.
5. Página de perfil propio en la web (`PUT /v1/client/me/profile`).
6. Estilos inline → clases; mover componentes a `packages/ui`; limpieza de lint.

## References

* [`.AGENTS`](../../../.AGENTS)
* [04-design-system.md](../04-design-system.md), [05-data-architecture.md](../05-data-architecture.md), [06-monorepo-structure.md](../06-monorepo-structure.md), [07-authentication.md](../07-authentication.md), [08-better-auth.md](../08-better-auth.md), [13-api-design.md](../13-api-design.md), [15-security.md](../15-security.md), [18-decisions-log.md](../18-decisions-log.md)
* [docs/design/cosmic-luxury.md](../../design/cosmic-luxury.md)
* [docs/migration/modelo-de-datos-firestore-v1.md](../../migration/modelo-de-datos-firestore-v1.md)
* [tools/firestore-migration/README.md](../../../tools/firestore-migration/README.md)
