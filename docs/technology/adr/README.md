[← Volver al Índice de Tecnología](../README.md) | [← Volver al Índice Principal](../../index.md)

# Architecture Decision Records (Astrolegia)

Este directorio contiene los Architecture Decision Records (ADRs) específicos de **Astrolegia** en formato MADR.

## Registro de Decisiones de Base

Las decisiones iniciales consolidadas para la arquitectura reducida de Astrolegia se encuentran en [18-decisions-log.md](../18-decisions-log.md).

Para nuevas decisiones puntuales que requieran debate, plantearlas en esta carpeta siguiendo el flujo descrito a continuación.

## Crear un Nuevo ADR

1. Copiar `template.md` a un archivo nuevo nombrado `NNNN-titulo-con-guiones.md` en `docs/technology/adr/` (ej. `0001-calculo-efemerides-wasm.md`).
2. Completar las secciones: Contexto, Factores de Decisión, Opciones Consideradas, Decisión, Justificación y Consecuencias.
3. Enviar un Pull Request para revisión del equipo.
4. Una vez aceptado, registrarlo en este índice.

## Estados de un ADR

- **Proposed**: En discusión activa.
- **Accepted**: Aprobado y listo para implementación.
- **Deprecated**: Decisión que dejó de aplicar al proyecto.
- **Superseded**: Reemplazado por un ADR posterior.
- **Rejected**: Considerado pero descartado explícitamente.
