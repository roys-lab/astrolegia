[← Volver al Índice de Tecnología](README.md) | [← Volver al Índice Principal](../index.md)

# 10 — Railway Deployment & Topology

Todos los servicios de aplicación y la base de datos de **Astrolegia** se despliegan en **Railway**, aprovechando su red privada de baja latencia, aprovisionamiento automatizado y soporte nativo para proyectos en monorepo.

---

## Proyectos Aislados por Entorno

Para evitar riesgos de contaminación de datos y garantizar pruebas fiables, se utilizan dos proyectos de Railway completamente independientes:

| Proyecto en Railway | Propósito | Fuentes de Datos |
|---|---|---|
| **`astrolegia-staging`** | Pruebas de integración, QA, validación de builds de Expo y revisión | Base de datos PostgreSQL de Staging |
| **`astrolegia-production`** | Entorno de producción en vivo para consultantes y administración | Base de datos PostgreSQL de Producción |

---

## Servicios por Proyecto

La topología se reduce a los componentes mínimos indispensables:

```mermaid
flowchart TD
  subgraph railway["Railway — Proyecto Astrolegia"]
    API["Servicio: api<br/>(Node.js / NestJS)"]
    ADMIN["Servicio: admin-web<br/>(React Web)"]
    CLIENT_WEB["Servicio: client-web (Opcional)<br/>(Web responsiva cliente)"]
    PG[("Base de Datos: PostgreSQL<br/>(Railway Managed Postgres)")]
  end

  subgraph external["Dispositivos Externos"]
    MOBILE["App Móvil Consultante<br/>(Expo Go / Standalone)"]
    BROWSER["Navegador Administrador"]
  end

  MOBILE -->|HTTPS /v1/...| API
  BROWSER -->|HTTPS| ADMIN
  ADMIN -->|HTTPS /v1/admin/...| API
  CLIENT_WEB -.->|HTTPS /v1/...| API
  API <-->|Red Privada Interna (DATABASE_URL)| PG
```

| Servicio | Tipo en Railway | Descripción y Rol |
|---|---|---|
| **`api`** | Web Service | **Única API backend** de la plataforma. Expone endpoints de Better Auth, negocio, cartas y streaming de PDFs. |
| **`admin-web`** | Web Service | Interfaz estática/SSR en React para el panel administrativo de Astrolegia. |
| **`client-web`** | Web Service | Interfaz web responsiva para usuarios de navegador (opcional o paralela a Expo Go). |
| **`postgres`** | Database Service | Instancia administrada de PostgreSQL con copias de seguridad automáticas y red privada. |

> **Componentes Eliminados:** Se prescinde de `analytics-sync`, buckets de almacenamiento S3, `cloud-sql-proxy` y de la división previa entre `client-api` y `admin-api`.

---

## Variables de Entorno Clave

Las variables se configuran en el panel de Railway o mediante Terraform (`railway_variable`):

| Variable | Servicio | Descripción |
|---|---|---|
| `DATABASE_URL` | `api` | Cadena de conexión privada a PostgreSQL (`postgresql://...`) |
| `BETTER_AUTH_SECRET` | `api` | Clave secreta para firma y cifrado de sesiones |
| `GOOGLE_CLIENT_ID` | `api` | Client ID de Google OAuth |
| `GOOGLE_CLIENT_SECRET` | `api` | Client Secret de Google OAuth |
| `CLIENT_URL` | `api` | URL base del cliente web/móvil para CORS y redirecciones |
| `ADMIN_URL` | `api` | URL base del admin web para CORS y redirecciones |
| `PORT` | `api`, `admin-web` | Puerto de escucha asignado por Railway |
| `NODE_ENV` | Todos | `production` o `staging` |

---

## Configuración de Dominios

| Entorno | Web Cliente | Admin Web | API Backend |
|---|---|---|---|
| **Staging** | `staging.astrolegia.com` | `admin-staging.astrolegia.com` | `api-staging.astrolegia.com` |
| **Producción** | `astrolegia.com` | `admin.astrolegia.com` | `api.astrolegia.com` |

Railway provee certificados SSL/TLS automáticos para todos los dominios personalizados configurados.
