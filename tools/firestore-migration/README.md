# Migración Firestore (Astrolegia v1) → PostgreSQL

Herramienta de una sola corrida para traer las personas y cartas cacheadas de
Astrolegia v1 (Firestore) al modelo de PostgreSQL (`NatalProfile` +
`ChartCalculation`). No forma parte del runtime; no la usan ni la API ni la web.

> Estado: escrita contra el esquema documentado en
> [docs/migration/modelo-de-datos-firestore-v1.md](../../docs/migration/modelo-de-datos-firestore-v1.md),
> **todavía no ejecutada** (requiere la service account del proyecto de Firebase).
> Probar primero contra el Postgres local.

## 1. Exportar desde Firestore

Colocá el archivo de la service account (`serviceAccount.json`) en `tools/firestore-migration/serviceAccount.json` (o definí `GOOGLE_APPLICATION_CREDENTIALS`).

Para exportar **todos los usuarios** de una sola vez:
```bash
pnpm db:firestore:export
```

O para exportar un usuario específico:
```bash
FIRESTORE_UID=<uid> pnpm db:firestore:export
```

Genera los archivos JSON en `tools/firestore-migration/exports/<uid>.json` con el perfil propio, la carta propia y todas las personas con sus cartas cacheadas.

## 2. Importar a PostgreSQL

Para importar **todas las exportaciones** a PostgreSQL automáticamente:
```bash
pnpm db:firestore:import
```

O para importar un archivo específico para un usuario concreto:
```bash
IMPORT_EMAIL=roy@royslab.com IMPORT_FILE=exports/<uid>.json pnpm db:firestore:import
```

Reglas:

- Cada `Person` se convierte en un `NatalProfile` con `source = imported` y
  `legacyRefs = { firestore: { uid, personId, ... } }`.
- Dedupe por nombre normalizado + fecha de nacimiento (mismo criterio que v1,
  `@astrolegia/core/people`): si ya existe, no se duplica.
- Las cartas conservan `engineVersion`, `inputHash` y `computedAt` originales;
  la API decide después si están vigentes (`status`).
- El perfil propio (`birthData` del usuario) pasa a un `NatalProfile` con
  `isSelf = true`, con su carta natal si existía.
- Correrlo dos veces es seguro: lo ya importado se omite.
