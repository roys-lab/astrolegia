[← Volver al Índice de Tecnología](README.md) | [← Volver al Índice Principal](../index.md)

# 13 — API Design (REST & OpenAPI 3.1)

La **única API backend** de **Astrolegia** expone una interfaz **REST** basada en HTTP/JSON, completamente documentada y validada mediante la especificación **OpenAPI 3.1**.

---

## Estructura de Espacios de Nombres (Namespaces)

Al consolidar los servicios en una sola API, las rutas se organizan con prefijos claros bajo la versión `/v1`:

| Prefijo de Ruta | Audiencia | Propósito |
|---|---|---|
| `/v1/auth/*` | Pública / Frontends | Endpoints de Better Auth (Google SSO, sesiones, callbacks). |
| `/v1/capabilities` | Frontends (Móvil y Web) | Verificación de características activas, versión de API y builds mínimos. |
| `/v1/client/*` | Usuarios Finales (Autenticados) | Perfiles natales, cartas astrales, cálculos y streaming de reportes en PDF. |
| `/v1/admin/*` | Administradores (RBAC) | Gestión de consultantes, configuración de orbes, plantillas y auditoría. |

---

## Endpoint Obligatorio: `GET /v1/capabilities`

Este endpoint es fundamental para el ciclo de vida de las aplicaciones cliente (especialmente la app móvil en Expo Go). Debe invocarse en el arranque de la app (*cold start*) y después de iniciar sesión:

```json
{
  "data": {
    "apiVersion": "1.0.0",
    "minSupportedBuild": 10,
    "latestBuild": 15,
    "features": {
      "pdfStreaming": true,
      "synastry": false,
      "maintenanceMode": false
    }
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

---

## Formato Estándar de Peticiones y Respuestas

Todas las respuestas exitosas y de error mantienen una estructura JSON homogénea:

### Respuesta Exitosa
```json
{
  "data": {
    "id": "profile_123",
    "name": "Carta Natal Principal",
    "sunSign": "Aries",
    "ascendant": "Scorpio"
  },
  "meta": {
    "requestId": "req_87654321",
    "timestamp": "2026-09-02T21:00:00.000Z"
  }
}
```

### Respuesta de Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "La fecha de nacimiento no es válida",
    "details": [
      {
        "field": "birthDate",
        "issue": "Expected ISO-8601 date string"
      }
    ]
  },
  "meta": {
    "requestId": "req_87654321"
  }
}
```

---

## Códigos de Estado HTTP Utilizados

| Código | Significado | Caso de Uso en Astrolegia |
|---|---|---|
| **`200 OK`** | Éxito | Consultas y actualizaciones estándar. También utilizado para iniciar el streaming de PDFs. |
| **`201 Created`** | Creado | Creación exitosa de un perfil natal o recurso. |
| **`400 Bad Request`** | Error de Validación | Parámetros inválidos rechazados por esquemas Zod. |
| **`401 Unauthorized`** | No Autenticado | Token de Google SSO faltante o sesión expirada. |
| **`403 Forbidden`** | Prohibido | Usuario final intentando acceder a `/v1/admin/*` o sin rol suficiente. |
| **`404 Not Found`** | No Encontrado | Perfil natal o entidad inexistente. |
| **`429 Too Many Requests`** | Rate Limit | Exceso de peticiones en endpoints de autenticación o cálculo. |
| **`500 Internal Error`** | Error Interno | Fallo inesperado en el servidor. |

---

## Validación Tipada con Zod (`packages/contracts`)

Los esquemas de validación de parámetros y cuerpos de petición se declaran en el paquete compartido `packages/contracts`. Esto garantiza que la validación en la API y el tipado en los frontends utilicen exactamente la misma definición TypeScript:

```typescript
// packages/contracts/src/natal-profile.dto.ts
import { z } from 'zod';

export const CreateNatalProfileSchema = z.object({
  name: z.string().min(2).max(100),
  birthDate: z.string().datetime(),
  birthTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(2),
});

export type CreateNatalProfileDTO = z.infer<typeof CreateNatalProfileSchema>;
```
