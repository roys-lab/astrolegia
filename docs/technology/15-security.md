[← Volver al Índice de Tecnología](README.md) | [← Volver al Índice Principal](../index.md)

# 15 — Pragmatic Security Baseline

La arquitectura de **Astrolegia** adopta un modelo de **seguridad pragmática y esencial**. Se eliminan capas corporativas sobredimensionadas —como firewalls de aplicación web (WAF) complejos, escaneo antivirus asíncrono con ClamAV o flujos de cuarentena de archivos— y se focaliza la protección en los controles estándar más efectivos de la industria moderna.

---

## Comparativa de Simplificación de Seguridad

| Capa | Arquitectura Previa (Compleja) | Modelo Astrolegia (Pragmático) |
|---|---|---|
| **Subida de Archivos** | Contenedores ClamAV, colas BullMQ y carpetas de cuarentena | **Eliminado por diseño:** No hay subida de archivos de usuario; los PDFs se generan en memoria en runtime. |
| **Protección Perimetral** | Firewalls WAF dedicados y reglas de inspección profunda | Terminación TLS gestionada por Railway y cabeceras de seguridad HTTP estándar. |
| **Identidad y Credenciales** | 4 proveedores sociales (Google, Apple, Meta, IG) y secretos dispersos | **Google SSO único inicial** gestionado por Better Auth sobre PostgreSQL. |
| **Acceso a Datos** | Permisos IAM cruzados entre Railway, Cloud SQL y BigQuery | Conexión directa y privada a PostgreSQL con consultas parametrizadas. |

---

## Controles de Seguridad Principales

### 1. Autenticación y Autorización
- **Google SSO Exclusivo:** La autenticación se delega en la infraestructura de seguridad de Google. No existen contraseñas almacenadas, reduciendo a cero el riesgo de filtraciones de credenciales por ataques de fuerza bruta o robo de hashes.
- **RBAC en PostgreSQL:** Los endpoints administrativos (`/v1/admin/*`) exigen explícitamente un rol administrativo verificado (`viewer`, `editor`, `super_admin`) en la base de datos. Los usuarios finales no pueden acceder a funciones operativas.
- **Aislamiento de Recursos por Consultante:** En todas las consultas a `/v1/client/*`, el `userId` se obtiene estrictamente de la sesión autenticada validada en el servidor, impidiendo vulnerabilidades de referencia directa insegura a objetos (IDOR).

### 2. Sanitización y Validación de Entrada (Zod)
- Cada payload recibido por la API backend se valida en tiempo de ejecución utilizando los esquemas declarados en `packages/contracts`.
- Campos numéricos (latitud, longitud), fechas de nacimiento y cadenas de texto son fuertemente tipadas y sanitizadas antes de procesarse en la lógica astrológica.

### 3. Prevención de Inyecciones SQL (Prisma ORM)
- Todas las consultas a PostgreSQL se ejecutan mediante consultas parametrizadas generadas por Prisma.
- No se admite la interpolación manual de cadenas dentro de sentencias SQL dinámicas.

### 4. Transporte y CORS Estricto
- **TLS Obligatorio:** Todas las comunicaciones entre clientes, administración y la API viajan cifradas bajo HTTPS (TLS 1.3).
- **CORS Restringido:** La API únicamente permite peticiones con origen verificado:
  - `https://astrolegia.com`
  - `https://admin.astrolegia.com`
  - Esquema de desarrollo local y de Expo (`exp://*`).

### 5. Rate Limiting Básico
Para proteger el motor de cálculo astrológico y la autenticación contra abusos automatizados o ataques de denegación de servicio (DoS), se implementa limitación de tasa a nivel de API:

| Tipo de Endpoint | Límite por IP / Usuario | Acción al Superar |
|---|---|---|
| `/v1/auth/*` | 10 peticiones / minuto | HTTP 429 Too Many Requests |
| `/v1/client/astrology/*/pdf` (Streaming) | 5 peticiones / minuto por usuario | HTTP 429 Too Many Requests |
| Endpoints de lectura estándar | 100 peticiones / minuto | HTTP 429 Too Many Requests |

### 6. Registro de Auditoría (`admin_audit`)
Toda modificación realizada por operadores (cambios de configuración, edición de interpretaciones, asignación de roles) se registra con marca de tiempo, actor, payload e IP de origen en la tabla `admin_audit` de PostgreSQL.
