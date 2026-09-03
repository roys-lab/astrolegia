[← Volver al Índice de Tecnología](README.md) | [← Volver al Índice Principal](../index.md)

# 12 — Infrastructure as Code (IaC)

Este documento describe la estrategia simplificada de **Infraestructura como Código (IaC)** para **Astrolegia**. 

Al haber reducido la arquitectura a una sola API, dos frontends y una base de datos PostgreSQL —eliminando BigQuery, workers y cuentas complejas de servicio—, los manifiestos de infraestructura son mínimos, limpios y reproducibles mediante **Terraform**.

---

## Alcance de IaC para Astrolegia

| Recurso | Proveedor | Gestionado por IaC |
|---|---|---|
| **Proyectos Railway (`staging`, `production`)** | Railway (`terraform-providers/railway`) | **Sí** |
| **Servicio Web `api`** | Railway (`terraform-providers/railway`) | **Sí** |
| **Servicio Web `admin-web`** | Railway (`terraform-providers/railway`) | **Sí** |
| **Base de Datos PostgreSQL** | Railway / GCP Cloud SQL | **Sí** |
| **Variables de Entorno y Secretos** | Railway (`terraform-providers/railway`) | **Sí** (enlazadas programáticamente) |
| **Registros DNS y Dominios Personalizados** | Cloudflare / Proveedor DNS | **Sí** |

> **Recursos Eliminados del Código de Infraestructura:** Se eliminan los datasets de BigQuery, permisos IAM multiproyecto, esquemas de tablas analíticas, workers cron de sincronización y contenedores de escaneo ClamAV.

---

## Estructura del Directorio de Infraestructura (`infra/`)

```
infra/
├── modules/
│   ├── api-service/          # Definición de contenedor para la API
│   ├── admin-service/        # Definición de contenedor para Admin Web
│   └── database/             # PostgreSQL administrado
│
├── environments/
│   ├── staging/              # tfvars y estado para staging
│   │   ├── main.tf
│   │   └── terraform.tfvars
│   └── production/           # tfvars y estado para producción
│       ├── main.tf
│       └── terraform.tfvars
│
└── versions.tf               # Proveedores requeridos (Railway, HashiCorp)
```

---

## Ejemplo de Configuración Declarativa

```hcl
# infra/environments/production/main.tf

terraform {
  required_providers {
    railway = {
      source  = "terraform-community-providers/railway"
      version = "~> 0.4.0"
    }
  }
}

resource "railway_project" "astrolegia" {
  name = "astrolegia-production"
}

resource "railway_environment" "production" {
  project_id = railway_project.astrolegia.id
  name       = "production"
}

# Base de datos PostgreSQL
resource "railway_service" "postgres" {
  project_id = railway_project.astrolegia.id
  name       = "postgres"
}

# API Backend Unificada
resource "railway_service" "api" {
  project_id = railway_project.astrolegia.id
  name       = "api"
  
  source_repo = "Royslab/astrolegia"
  root_directory = "apps/api"
}

# Inyección de variable privada DATABASE_URL
resource "railway_variable" "database_url" {
  project_id     = railway_project.astrolegia.id
  environment_id = railway_environment.production.id
  service_id     = railway_service.api.id
  name           = "DATABASE_URL"
  value          = "postgresql://..."
}
```

---

## Beneficios de la Reducción en IaC

1. **Tiempo de Despliegue Inmediato:** Crear un entorno completo de prueba o staging toma menos de 3 minutos.
2. **Cero Deriva de Configuración (*Configuration Drift*):** Los dos entornos (staging y producción) comparten exactamente los mismos módulos de Terraform con diferentes variables de entrada.
3. **Mantenimiento Simple:** Cualquier miembro del equipo de desarrollo puede comprender y modificar los archivos de infraestructura sin requerir certificaciones complejas en nubes corporativas.
