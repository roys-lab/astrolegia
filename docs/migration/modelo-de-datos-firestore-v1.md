[← Volver al Índice de Tecnología](../technology/README.md)

> **Referencia histórica (actualizado 2026-09-07).** Este es el esquema de
> Firestore de Astrolegia v1. Desde el 2026-09-07 `apps/web` ya no usa
> Firebase: la persistencia es PostgreSQL vía `apps/api` (modelos
> `NatalProfile` y `ChartCalculation`, ver
> [ADR-0001](../technology/adr/0001-migracion-astrolegia-v1.md)). El documento
> se conserva porque describe la fuente que lee la herramienta de migración
> `tools/firestore-migration` (export con firebase-admin, import con Prisma).
> Los tipos `Person`/`PersonChart` que menciona viven en `@astrolegia/core/types`.

# Modelo de datos de Astrolegia (Fase 2)

Estado al 2026-08-15. Este documento describe el esquema objetivo de la
colección canónica `people`, qué está implementado, cómo correr la migración
y los pendientes (incluido el bloqueante de `firebase-admin`).

---

## 1. Esquema objetivo

### 1.1. `users/{uid}/people/{personId}` — colección canónica de personas ✅ implementada

Unifica los 4 almacenes desconectados detectados en la auditoría:

| # | Almacén legacy | Ruta | Estado |
|---|---|---|---|
| 1 | Amigos | `users/{uid}/friends/{friendUid}` | Sigue vivo (red social); se copia a `people` con `source: 'friend'` |
| 2 | Socios por proyecto | `users/{uid}/projects/{pid}/partners/{id}` | Sigue vivo (páginas de proyectos); se copia con `source: 'partner'` |
| 3 | Pool global "individuals" | `users/{uid}/individuals/{id}` | Sin callers en la app; se copia con `source: 'individual'` |
| 4 | Entidades manuales de sinastría | (no se persisten hoy) | En Fase 3 la sinastría debería crear `people` con `source: 'manual'` |

Documento `Person` (ver `src/types/people.ts`):

```ts
{
    id: string,
    fullName: string,
    birthDate: { year, month, day },
    birthTime?: { hour, minute },      // ausente = hora desconocida
    birthTimeKnown: boolean,           // false => sin casas/ascendente confiables
    birthPlace?: { city, country?, latitude?, longitude?, timezone? },
    tags: string[],
    notes?: string,
    linkedAccountUid?: string,         // si es un usuario real de la red
    source: 'manual' | 'friend' | 'partner' | 'individual' | 'self',
    legacyRefs?: {                     // trazabilidad de la migración
        partnerIds?: { projectId, partnerId }[],
        individualId?: string,
        friendUid?: string
    },
    createdAt: string,                 // ISO 8601
    updatedAt: string
}
```

Campos índice internos (prefijo `_`, se quitan al leer): `_nameKey` (nombre
normalizado) y `_birthDateKey` (`YYYY-MM-DD`). Permiten el dedupe con queries
de igualdad sin índice compuesto.

### 1.2. `users/{uid}/people/{personId}/charts/{type}` — cartas cacheadas ✅ implementada

Un doc por tipo (`natal` | `humanDesign` | `mayanKin` | `numerology`), con el
patrón `engineVersion`/`inputHash` de la Fase 1 (mismo djb2 que
`human-design-service.ts` y `mayan-kin-service.ts`):

```ts
{ type, payload, engineVersion, inputHash, computedAt }
```

`inputHash` = djb2 de (fecha | hora | lat | lng | timezone). Si cambia el
engine o los datos de nacimiento, `isChartCurrent()` da false y hay que
recalcular. El caché nunca se invalida borrando: se sobreescribe al recalcular.

### 1.3. `groups` (Fase 3, ⏳ no implementado)

Grupos transversales de personas (no atados a un proyecto):
`users/{uid}/groups/{groupId}` con `{ name, personIds: string[], kind }`.
Los `WorkGroup`/`GroupMembership` legacy de `db.ts` (bajo projects) quedan
como están hasta esa fase.

---

## 2. Qué está implementado ya (esta fase)

| Pieza | Archivo |
|---|---|
| Tipos `Person`, `PersonChart` | `src/types/people.ts` |
| Funciones puras (normalización, dedupe, conversiones, hash) | `src/services/people-core.ts` |
| CRUD + charts + `findByBirthData` + migraciones | `src/services/people-service.ts` (re-exporta people-core) |
| Tests unitarios (sin Firestore) | `src/services/people-service.test.ts` |
| Reglas de Firestore versionadas | `firestore.rules` + `firebase.json` |

**NO cableado todavía** (a propósito, llega con el dashboard de Fase 3):
ninguna página llama a la migración ni al CRUD de `people`.

---

## 3. Migración no destructiva

Reglas de oro (ver encabezado de `people-service.ts`):

- Se escribe en el lugar nuevo (`people`); el almacén legacy **jamás se borra**
  ni se modifica.
- Dedupe por **nombre normalizado + fecha de nacimiento** (`personDedupeKey`):
  mayúsculas, acentos y espacios extra no cuentan; misma clave = misma persona.
- Si el candidato ya existe, no se duplica: solo se **enriquecen** sus
  `legacyRefs`/`linkedAccountUid` (agregando, nunca pisando) y cuenta como
  `skipped`.
- Idempotente: correrla dos veces solo suma `skipped`.

Cómo correrla (desde cualquier código cliente autenticado, p. ej. una página
de admin temporal o la consola del navegador con la app cargada):

```ts
import { migrateAllPeople } from '@/services/people-service';

const { created, skipped } = await migrateAllPeople(user.uid);
console.log(`Migradas: ${created} creadas, ${skipped} salteadas`);
```

También se pueden correr por separado: `migrateFromFriends(uid)`,
`migrateFromPartners(uid)`, `migrateFromIndividuals(uid)`.

Casos que se saltean (cuentan como `skipped`): amigos sin `birthData` en su
perfil, partners sin nombre o sin año de nacimiento, individuals con
`birthDate` no parseable.

---

## 4. Reglas de Firestore (`firestore.rules`)

Reflejan el comportamiento actual de la app:

- `users/{uid}` y todo su subárbol: read/write solo del dueño, **excepto**:
  - **(a)** el doc raíz `users/{uid}` y `users/{uid}/profile/main` son
    **legibles por cualquier autenticado** — lo requieren la búsqueda de
    usuarios, las tarjetas de amigos y la sinastría, que leen perfiles ajenos.
    **Tradeoff documentado** (TODO privacySettings, Fase 3): hoy la
    `birthData` completa de un usuario es legible por cualquier autenticado;
    en Fase 3 hay que respetar `profile.privacySettings`.
  - **(b)** `users/{otroUid}/friends/{miUid}` es **escribible por miUid** —
    `acceptRequest()` crea la amistad bilateral escribiendo en el árbol del
    otro usuario.
- `friend_requests/{id}`: create por autenticados (con `from == auth.uid`);
  read/update/delete solo si `auth.uid` es el `from` o el `to`.
- `dna_profiles/{uid}`: solo dueño (`uid` del doc == `auth.uid`).
- `oracle_history/{docId}`: solo dueño vía campo `userId`.
- Todo lo demás: denegado por defecto.

Deploy: `firebase deploy --only firestore:rules` (con `firebase.json` ya
apuntando a `firestore.rules`).

### Cómo probar las reglas (no hay tests automatizados de rules)

Las reglas **no se pueden testear con vitest sin emulador**; se validó solo la
sintaxis a ojo. Si querés probarlas de verdad:

```bash
npm i -g firebase-tools          # si no está instalado
firebase emulators:start --only firestore
# la app puede apuntar al emulador con connectFirestoreEmulator(db, 'localhost', 8080)
```

Para tests programáticos de reglas, el paquete oficial es
`@firebase/rules-unit-testing` (se corre contra el emulador). El
`firebase.json` ya incluye la config del emulador (puerto 8080 + UI).

---

## 5. ⚠️ PENDIENTE BLOQUEADO: rutas API server-side sin auth (`firebase-admin`)

**Esto es lo más importante antes de deployar las reglas.**

Hoy estas rutas API de Next.js escriben en Firestore **desde el servidor con
el SDK cliente y SIN usuario autenticado** (`request.auth == null`):

| Ruta API | Servicio | Colección afectada |
|---|---|---|
| `/api/oracle/angels` | `src/lib/memory-service.ts` | `oracle_history` (write + read) |
| `/api/dna/profile`, `/api/dna/guide/chat` | `src/services/dna-service.ts` | `dna_profiles` (write + read) |

Con las reglas nuevas deployadas, **esas operaciones van a FALLAR con
permission-denied** (hoy probablemente ya fallan silenciosamente o dependen de
reglas abiertas: ambos servicios tragan el error con `console.warn/error` y
siguen). La app no crashea, pero el historial del oráculo y el ADN dejan de
persistirse.

**Solución (requiere acción del usuario):** migrar esas rutas a
`firebase-admin` (Admin SDK, que bypasea las reglas):

1. Generar una **service account key** en la consola de Firebase
   (Configuración del proyecto → Cuentas de servicio → Generar nueva clave
   privada). *Esto lo tiene que hacer el usuario; la clave no va al repo.*
2. Guardarla como variable de entorno (p. ej. `FIREBASE_SERVICE_ACCOUNT_KEY`
   en `.env.local`, que ya está gitignoreado).
3. Crear `src/lib/firebase-admin.ts` que inicialice `firebase-admin` con esa
   credencial y reescribir `memory-service.ts` / `dna-service.ts` (o solo sus
   entrypoints server-side) para usar el Admin SDK, verificando además el ID
   token del usuario en la request para saber a qué `userId` escribir.

Hasta entonces, **no hay que deployar `firestore.rules` a producción** si se
quiere conservar la persistencia del oráculo/ADN — o aceptar temporalmente esa
pérdida (funcionalidad degradada, no rota).

---

## 6. Decisiones de diseño registradas

- `birthPlace.latitude/longitude/timezone` son opcionales porque los
  almacenes legacy no siempre los tienen (Partner solo guarda `birthCity`).
  Un lugar "completo" habilita cartas precisas; uno parcial solo etiqueta.
- `birthTimeKnown` es un flag explícito (y no solo la ausencia de
  `birthTime`) para que la UI de Fase 3 pueda distinguir "hora desconocida"
  de "todavía no cargada" y degradar las cartas (sin casas/ascendente).
- La ñ se pliega a n en la normalización de dedupe: preferimos un falso
  duplicado revisable a dos fichas de la misma persona.
- Borrar una `Person` del modelo nuevo está permitido (`deletePerson`); la
  política de no destrucción aplica a los almacenes **legacy**, que son la
  fuente de verdad histórica hasta terminar la Fase 3.

---

## 7. Modelo de administración: `admin/config`

Colección `admin` a nivel raíz, con un doc de configuración:

```ts
// admin/config
{
    allowedEmails: string[]   // emails (de Google, verificados) habilitados
                              // a entrar al panel de administración
}
```

### Roles y semántica

- **Superadmin**: el email `santos.dlc@gmail.com`, hardcodeado en
  `firestore.rules` (función `isSuperAdmin()`) y usable como constante en el
  cliente. Es un **identificador, no un secreto**: conocerlo no da acceso;
  las reglas exigen `request.auth.token.email == ese email` **y**
  `email_verified == true`, o sea una sesión de Google real de esa cuenta.
- **Whitelisted**: cualquier email listado en `allowedEmails`. Puede **leer**
  `admin/config` (lo necesita el cliente para pasar el gate del panel), pero
  no escribirlo ni leer nada más bajo `/admin/**`.
- **Usuario común**: la lectura de `admin/config` le da `permission-denied`.
  La denegación ES la respuesta ("sin acceso"); un usuario común ni siquiera
  puede ver quiénes están en la whitelist.

### Quién puede qué

| Operación | Superadmin | Whitelisted | Usuario común |
|---|---|---|---|
| Leer `admin/config` | ✅ | ✅ (email verificado y listado) | ❌ permission-denied |
| Escribir `admin/config` (editar whitelist) | ✅ | ❌ | ❌ |
| Leer/escribir cualquier otro doc bajo `/admin/**` | ✅ | ❌ | ❌ |

### Barrera real vs. gate cosmético

El chequeo del panel en el cliente (leer `admin/config` y comparar el email
propio contra `allowedEmails`) es **cosmético**: cualquiera puede saltarse la
UI con las DevTools. La barrera real son las reglas: aunque un usuario fuerce
la ruta del panel, Firestore le niega los datos. Por eso la whitelist solo la
escribe el superadmin y solo la leen los ya-habilitados.
