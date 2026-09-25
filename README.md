# Astrolegia

Monorepo de **Astrolegia** (Turborepo + pnpm workspaces). Antes de tocar código,
leer y cumplir las reglas obligatorias de [`.AGENTS`](.AGENTS). La arquitectura
está documentada en [`docs/technology`](docs/technology/README.md).

## Qué hay en el repo

| Ruta | Package | Qué es | Puerto local |
|---|---|---|---|
| `apps/api` | `@astrolegia/api` | Única API backend: Express + Prisma/PostgreSQL, Better Auth (Google SSO) en `/v1/auth/*`, `/v1/client/*` (personas, cartas, geocoding, IA), `/v1/admin/*` (RBAC), streaming de PDFs | 3000 |
| `apps/admin` | `@astrolegia/admin` | Panel de administración (Vite + React), login con Google | 3001 |
| `apps/client` | `@astrolegia/client` | App de consultantes (Expo Go / Expo Web) | 3002 (web) · 8081 (Metro) |
| `apps/web` | `@astrolegia/web` | Web de consultantes migrada de Astrolegia v1 (Next.js 16, Cosmic Luxury). Consume la API. Ver [ADR-0001](docs/technology/adr/0001-migracion-astrolegia-v1.md) | 3003 |
| `packages/core` | `@astrolegia/core` | Motores puros con tests: efemérides y favorabilidad, rueda zodiacal, numerología (Hitchcock), modelo de personas | — |
| `packages/ui` | `@astrolegia/ui` | Design System compartido: primitivas React + tokens | — |
| `packages/contracts` | `@astrolegia/contracts` | Esquemas Zod / DTOs compartidos (nombres = esquema de Prisma) | — |
| `packages/database` | `@astrolegia/database` | Prisma ORM, esquema, migraciones versionadas y seed de PostgreSQL | — |
| `packages/auth` | `@astrolegia/auth` | Configuración de Better Auth (Google) que monta la API | — |
| `packages/tsconfig` | `@astrolegia/tsconfig` | Configuraciones base de TypeScript | — |
| `tools/firestore-migration` | `@astrolegia/firestore-migration` | Migración de una sola corrida de los datos de Astrolegia v1 (Firestore) a PostgreSQL | — |

## Setup local

Requisitos: Node 20+, pnpm 10 (`corepack enable` alcanza), Docker para el
PostgreSQL local.

```bash
docker run --name astrolegia-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=astrolegia -p 5432:5432 -d postgres:16
```

```bash
pnpm install
```

```bash
cp packages/database/.env.example packages/database/.env
```

```bash
cp apps/api/.env.example apps/api/.env
```

En `apps/api/.env` completar al menos `BETTER_AUTH_SECRET` (cualquier string
aleatorio largo) y, para el login, `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
(la API imprime al arrancar la redirect URI que hay que registrar en Google
Cloud). Después:

```bash
pnpm db:generate && pnpm db:migrate && pnpm db:seed
```

La web no necesita `.env` en local (usa `http://localhost:3000` por defecto);
ver `apps/web/.env.example`.

## Comandos

```bash
pnpm dev                                  # todos los dev servers (turbo)
pnpm build                                # build de todo (requiere db:generate antes)
pnpm test                                 # vitest de core y api
pnpm lint
pnpm db:migrate                           # nueva migración + aplicar en local
pnpm db:migrate:deploy                    # aplicar migraciones (Railway / CI)
pnpm --filter @astrolegia/api dev         # solo la API: http://localhost:3000
pnpm --filter @astrolegia/api smoke       # prueba de humo contra la base real (usa el usuario del seed)
pnpm --filter @astrolegia/web dev         # solo la web: http://localhost:3003
```

En Windows: `run-all.bat` levanta API, admin, client y web a la vez;
`run-web.bat` solo la web; `run-expo.bat` solo Expo Go; `clean-project.bat`
instala, compila, resetea la base con las migraciones y hace el seed.

## Deploy

### API en Railway (Roy)

Checklist completa en el [ADR-0001](docs/technology/adr/0001-migracion-astrolegia-v1.md#lo-que-roy-necesita-para-railway):
servicio PostgreSQL + servicio `api` (root `apps/api`), pre-deploy
`prisma migrate deploy`, healthcheck `GET /health`, variables de
`apps/api/.env.example`, seed inicial y la redirect URI de Google.

### Web en Vercel

1. Importar el repo en [vercel.com/new](https://vercel.com/new).
2. **Root Directory:** `apps/web`. Framework: Next.js. Dejar activada la opción
   "Include source files outside of the Root Directory".
3. Variables: `NEXT_PUBLIC_API_URL` (la URL pública de la API) y
   `NEXT_PUBLIC_APP_VERSION`.
4. En la API: agregar el dominio de Vercel a `WEB_URL` o `AUTH_TRUSTED_ORIGINS`.
   Si la web y la API no comparten dominio raíz (p. ej. `*.vercel.app` contra
   Railway), poner `AUTH_CROSS_SITE_COOKIES=true` en la API.

## Estado de la migración de Astrolegia v1

Qué entró, dónde quedó cada archivo, qué reglas de `.AGENTS` faltan cumplir y
las decisiones abiertas entre socios:
[docs/technology/adr/0001-migracion-astrolegia-v1.md](docs/technology/adr/0001-migracion-astrolegia-v1.md).
El sistema visual de la web está documentado en
[docs/design/cosmic-luxury.md](docs/design/cosmic-luxury.md).
