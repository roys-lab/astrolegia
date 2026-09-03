[← Volver al Índice de Tecnología](README.md) | [← Volver al Índice Principal](../index.md)

# 01 — Architecture Overview

## Propósito del Sistema

**Astrolegia** es una plataforma moderna para servicios, consultas y reportes astrológicos, diseñada bajo una arquitectura ágil, mantenible y de componentes reducidos. 

El sistema atiende dos tipos de usuarios a través de dos frontends diferenciados:
1. **Frontend de Usuario Final (Cliente):** Experiencia para consultantes y miembros que acceden desde dispositivos móviles (iOS / Android mediante **Expo Go**) y navegadores web responsivos.
2. **Frontend de Administración (Staff / Operadores):** Panel de control web para la gestión de usuarios, contenidos, cartas y parámetros del sistema.

Ambos frontends consumen un **Design System unificado** (`@astrolegia/ui`) como librería compartida de componentes React, mientras que toda la lógica de negocio y acceso a datos está centralizada en una **única API backend**, respaldada por una base de datos **PostgreSQL**.

---

## Diagrama de Contexto del Sistema

```mermaid
flowchart TB
  subgraph users["Usuarios"]
    U_CLIENT["Usuario Final / Consultante<br/>(Mobile Expo Go / Web)"]
    U_ADMIN["Administrador / Operador<br/>(Admin Web)"]
  end

  subgraph shared["Librería Compartida"]
    DS["Design System (@astrolegia/ui)<br/>Componentes React & Tokens"]
  end

  subgraph astrolegia["Plataforma Astrolegia (Railway)"]
    C_APP["Frontend Cliente<br/>React + Expo Go + TS"]
    A_WEB["Frontend Admin<br/>React + TS Web"]
    API["Astrolegia API (Unificada)<br/>Node.js / NestJS / TypeScript"]
    PDF_ENGINE["Motor de Cálculo & PDF en Runtime<br/>(Streaming en memoria)"]
  end

  subgraph data["Capa de Datos"]
    PG[("PostgreSQL<br/>Base de Datos Única")]
  end

  subgraph identity["Identidad"]
    GOOG["Google OAuth / SSO"]
  end

  U_CLIENT --> C_APP
  U_ADMIN --> A_WEB

  C_APP -.->|Importa componentes| DS
  A_WEB -.->|Importa componentes| DS

  C_APP -->|Autenticación Google| GOOG
  A_WEB -->|Autenticación Google| GOOG

  C_APP -->|REST /v1/... + Cabeceras de Version| API
  A_WEB -->|REST /v1/admin/...| API

  API <-->|Prisma ORM| PG
  API --> PDF_ENGINE
  PDF_ENGINE -->|HTTP Stream (PDF)| C_APP
  PDF_ENGINE -->|HTTP Stream (PDF)| A_WEB
```

---

## Vista de Contenedores C4

| Contenedor | Tecnología | Responsabilidad |
|---|---|---|
| **Frontend Cliente** | React, Expo Go (React Native), TypeScript | Interfaz de usuario final para móviles y web. Consume `@astrolegia/ui` e inyecta su propio CSS/estilos para layout y navegación. |
| **Frontend Admin** | React, Vite / Next.js, TypeScript | Panel de administración y gestión operativa. Consume `@astrolegia/ui` con estilos CSS específicos para paneles y tablas de datos. |
| **Design System (`@astrolegia/ui`)** | React, TypeScript, Tailwind / Tokens | Paquete de componentes de UI reusables (botones, campos, modales, tipografía, navegación) empaquetado en el monorepo. |
| **Astrolegia API** | Node.js / NestJS, TypeScript, REST, OpenAPI 3.1 | **Única API backend** de la plataforma. Gestiona autenticación, endpoints públicos, endpoints de cliente, endpoints administrativos (RBAC) y lógica astrológica. |
| **Motor de Generación Runtime (PDF)** | Módulo interno en API (`pdfkit` / `@react-pdf/renderer`) | Genera cartas astrales y reportes en runtime en memoria RAM y los transmite vía streaming HTTP directo. **No requiere almacenamiento en disco o buckets**. |
| **PostgreSQL** | PostgreSQL administrado | Único sistema transaccional y fuente de la verdad para usuarios, sesiones, perfiles, cartas astrales y auditoría. |
| **Google SSO** | Better Auth con Google Provider | Single Sign-On inicial para ambos frontends. |

---

## Principios Fundamentales de la Arquitectura

1. **Monolito Modular en el Backend:** Una sola API backend concentra todas las operaciones. Se eliminan APIs separadas, proxies intermedios y workers de sincronización, reduciendo costos operativos y complejidad de despliegue.
2. **Design System Compartido con CSS Desacoplado:** Ambos frontends comparten componentes base a través de `@astrolegia/ui`, asegurando coherencia de marca, pero mantienen estilos CSS específicos para las necesidades particulares de cada superficie (móvil vs. desktop de gestión).
3. **Cero Almacenamiento Persistente de Documentos:** Los documentos y reportes (ej. interpretaciones astrológicas, cartas natales en PDF) no se almacenan en buckets ni en disco. Se computan en runtime y se sirven por streaming HTTP inmediato, reduciendo superficie de ataque y costos de almacenamiento.
4. **Soporte Multiversión Simultáneo de API:** La API garantiza el funcionamiento concurrente de la versión en producción ($N$) utilizada por los usuarios actuales y la versión en revisión ($N+1$) evaluada en las tiendas de aplicaciones (App Store / Google Play).
5. **SSO con Google Únicamente:** Autenticación inicial simplificada con Google SSO tanto para consultantes como para el personal administrativo, con control de roles (`viewer`, `editor`, `super_admin`) en PostgreSQL.
6. **Seguridad Pragmática:** Enfoque en controles esenciales (TLS estricto, CORS controlado, validación de esquemas Zod, rate limiting y queries parametrizadas) sin sobrecargar el sistema con firewalls complejos o escaneo antivirus de archivos innecesario.

---

## Enlaces a Documentos Relacionados

- [02-client-platform.md](./02-client-platform.md) — Plataforma de cliente.
- [03-admin-platform.md](./03-admin-platform.md) — Plataforma de administración.
- [04-design-system.md](./04-design-system.md) — Especificación del Design System unificado.
- [05-data-architecture.md](./05-data-architecture.md) — Base de datos PostgreSQL.
- [06-monorepo-structure.md](./06-monorepo-structure.md) — Estructura monorepo.
- [07-authentication.md](./07-authentication.md) — Estrategia de Google SSO.
- [09-runtime-document-generation.md](./09-runtime-document-generation.md) — Generación y streaming de documentos.
- [14-api-versioning.md](./14-api-versioning.md) — Versionamiento de API y ciclo de revisión en tiendas.
