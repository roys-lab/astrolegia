[← Volver al Índice de Tecnología](README.md) | [← Volver al Índice Principal](../index.md)

# 18 — Decisions Log (Astrolegia Baseline)

Registro de las decisiones arquitectónicas consolidadas que definen la plataforma **Astrolegia**. Este documento establece la arquitectura base del proyecto y actúa como referencia para futuras iteraciones.

---

## Registro de Decisiones Confirmadas

| Identificador | Título y Decisión | Razón y Beneficio | Documento de Detalle |
|---|---|---|---|
| **ADR-01** | **Única API Backend Centralizada** | En lugar de mantener APIs separadas para clientes y administración, una sola API backend (Node.js / NestJS con TypeScript) centraliza la lógica de negocio y las conexiones. Reduce costos de hosting, simplifica despliegues y elimina la necesidad de proxies intermedios. | [01-architecture-overview.md](./01-architecture-overview.md), [13-api-design.md](./13-api-design.md) |
| **ADR-02** | **PostgreSQL como Almacén Único (Sin BigQuery)** | Se elimina BigQuery y todos los pipelines de sincronización periódica (ETL / `analytics-sync`). Toda la información transaccional, cálculos astrológicos y métricas operativas se atienden directamente en PostgreSQL. | [05-data-architecture.md](./05-data-architecture.md), [11-database-connectivity.md](./11-database-connectivity.md) |
| **ADR-03** | **Design System Unificado con CSS Desacoplado** | Se crea la librería compartida `@astrolegia/ui` (`packages/ui`) para que ambos frontends compartan componentes React como una librería, manteniendo cada aplicación su propia capa de estilos CSS para responder a necesidades específicas (móvil vs. administración de escritorio). | [04-design-system.md](./04-design-system.md) |
| **ADR-04** | **Google SSO Exclusivo Inicial** | Tanto consultantes como administradores se autentican únicamente con Google Single Sign-On (Better Auth). Se descartan Apple, Facebook e Instagram. Los roles administrativos (`viewer`, `editor`, `super_admin`) se autorizan en PostgreSQL. | [07-authentication.md](./07-authentication.md), [08-better-auth.md](./08-better-auth.md) |
| **ADR-05** | **Cero Almacenamiento Persistente & Streaming de PDFs en Runtime** | Se prescinde de buckets S3 o almacenamiento de archivos. Los informes y cartas natales en PDF se generan en memoria al vuelo y se sirven mediante HTTP streaming directo (`chunked`), reduciendo costos y eliminando riesgos de fuga de archivos. | [09-runtime-document-generation.md](./09-runtime-document-generation.md) |
| **ADR-06** | **Versionamiento Simultáneo: Producción y Review en Tiendas** | La API garantiza la coexistencia activa de la versión en producción ($N$) y la versión en proceso de evaluación en las tiendas ($N+1$), negociada mediante prefijos de ruta (`/v1`, `/v2`), cabeceras (`X-App-Build`) y el endpoint `GET /capabilities`. | [14-api-versioning.md](./14-api-versioning.md) |
| **ADR-07** | **Seguridad Pragmática sin Sobrecarga** | Se eliminan contenedores de escaneo antivirus (ClamAV), flujos de cuarentena y firewalls WAF corporativos. Se priorizan controles estándar de alto impacto: HTTPS estricto, CORS controlado, sanitización con Zod, consultas parametrizadas con Prisma y rate limiting. | [15-security.md](./15-security.md) |
| **ADR-08** | **Desarrollo Móvil Ágil con Expo Go** | La app de consultantes se desarrolla con React Native y Expo Go, permitiendo pruebas instantáneas en dispositivos físicos sin compilar binarios nativos en local. La publicación final se gestiona mediante EAS Build en la nube. | [02-client-platform.md](./02-client-platform.md), [17-expo-development.md](./17-expo-development.md) |

---

## Decisiones Abiertas para Futuras Iteraciones

- **Soporte Offline en App Móvil:** Determinar qué porción de la Carta Natal debe quedar disponible en caché local cuando el consultante no tenga conexión a internet.
- **Motor de Cálculos Astronómicos:** Evaluar si las efemérides planetarias se calculan mediante librerías WebAssembly nativas (`swisseph`) dentro de la API o mediante micro-módulos optimizados en TypeScript.
- **Internacionalización (i18n):** Estrategia de traducción de interpretaciones astrológicas entre español e inglés.
