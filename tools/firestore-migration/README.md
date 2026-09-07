# Migración Firestore (Astrolegia v1) → PostgreSQL

Herramienta de una sola corrida para traer las personas y cartas cacheadas de
Astrolegia v1 (Firestore) al modelo de PostgreSQL (`NatalProfile` +
`ChartCalculation`). No forma parte del runtime; no la usan ni la API ni la web.

> Estado: escrita contra el esquema documentado en
> [docs/migration/modelo-de-datos-firestore-v1.md](../../docs/migration/modelo-de-datos-firestore-v1.md),
> **todavía no ejecutada** (requiere la service account del proyecto de Firebase).
> Probar primero contra el Postgres local.

## 1. Exportar desde Firestore

Necesitás una service account del proyecto de Firebase (Firebase Console →
Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada)
y el `uid` de Firebase Auth del usuario (Authentication → Users).

```bash
GOOGLE_APPLICATION_CREDENTIALS=C:/ruta/serviceAccount.json FIRESTORE_UID=<uid> pnpm --filter @astrolegia/firestore-migration export
```

Genera `tools/firestore-migration/exports/<uid>.json` con el perfil
(`users/{uid}` + `profile/main`), la carta propia (`charts/natal`) y todas las
personas (`people/*`) con sus cartas (`people/*/charts/*`). El archivo puede
pesar varios MB (los SVG de las cartas). La carpeta `exports/` está gitignoreada.

## 2. Importar a PostgreSQL

Con `DATABASE_URL` apuntando a la base destino (local o Railway) y el usuario ya
creado en `User` (el seed lo crea para los super admins; cualquier otro entra
con Google una vez):

```bash
DATABASE_URL=postgresql://... IMPORT_EMAIL=santos.dlc@gmail.com IMPORT_FILE=exports/<uid>.json pnpm --filter @astrolegia/firestore-migration import
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
