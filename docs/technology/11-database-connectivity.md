[← Volver al Índice de Tecnología](README.md) | [← Volver al Índice Principal](../index.md)

# 11 — Database Connectivity (PostgreSQL)

Este documento detalla la estrategia de conectividad y gestión de conexiones entre la **única API backend** de **Astrolegia** y la base de datos **PostgreSQL**.

---

## Modelo de Conexión Directa y Segura

Se descartan configuraciones complejas de túneles proxy (como `cloud-sql-proxy`) y cuentas de servicio IAM multiproyecto previamente requeridas para BigQuery. La API backend se conecta de forma directa a PostgreSQL:

```mermaid
flowchart LR
  subgraph railway_private_network["Red Privada Railway"]
    API["Astrolegia API<br/>(Prisma Client / Connection Pool)"]
    PG[("PostgreSQL<br/>(Base de Datos)")]
  end

  API <-->|DATABASE_URL<br/>(Conexión interna TCP / SSL)| PG
```

### Opciones de Despliegue Soportadas
1. **PostgreSQL Administrado en Railway (Recomendado):**
   - Conexión a través de la red privada interna de Railway (`postgres.railway.internal:5432`).
   - Cero exposición pública de la base de datos a internet.
   - Rendimiento de latencia sub-milisegundo dentro de la misma región.
2. **GCP Cloud SQL PostgreSQL (Alternativa):**
   - Conexión vía SSL/TLS obligatorio (`sslmode=require`) con certificados cliente y red autorizada.

---

## Gestión de Conexiones (Connection Pooling)

Dado que la API backend unificada atiende tanto las peticiones de los consultantes como las operaciones administrativas, se implementa una gestión de pool mediante Prisma:

```env
# Ejemplo de configuración en DATABASE_URL
DATABASE_URL="postgresql://postgres:password@postgres.railway.internal:5432/astrolegia?connection_limit=20&pool_timeout=15"
```

| Parámetro | Valor Recomendado | Motivo |
|---|---|---|
| `connection_limit` | 15–25 conexiones | Previene el agotamiento de sockets de la base de datos en picos de tráfico. |
| `pool_timeout` | 15 segundos | Evita que hilos bloqueados mantengan conexiones abiertas indefinidamente. |
| `connect_timeout` | 10 segundos | Tiempo máximo de espera para establecer un socket TCP inicial. |

---

## Estrategia de Copias de Seguridad y Recuperación

1. **Backups Diarios Automatizados:** Copias de seguridad automáticas gestionadas a nivel de infraestructura cada 24 horas con retención móvil de 7 días.
2. **Point-in-Time Recovery (PITR):** En entornos de producción, se activa el registro continuo de WAL (Write-Ahead Logging) para permitir restauraciones a puntos específicos en el tiempo ante fallas humanas o corrupción de datos.
3. **Restauración en Staging:** Posibilidad de restaurar periódicamente un snapshot sanitizado de producción en el entorno de staging para validar migraciones complejas de Prisma.
