# Roadmap de Trabajo en Cursor

Este roadmap organiza el proyecto en fases pequeñas y verificables. La meta es avanzar con contexto suficiente, evitando mezclar arquitectura, UI, backend e integraciones en un solo cambio grande.

## Fase 0: Base del Repositorio

### Objetivo

Crear la estructura inicial del proyecto sin implementar todavía lógica de negocio compleja.

### Entregables

- Estructura `frontend/` y `backend/`.
- `.gitkeep` en carpetas base vacías.
- `README.md` actualizado si cambia la forma de ejecutar el proyecto.
- `.env.example` sin secretos reales.
- Docker Compose inicial si se define MySQL local.

### Verificación

- El repositorio tiene una estructura entendible.
- No hay credenciales en archivos versionables.
- La documentación sigue alineada con las carpetas creadas.

## Fase 1: Autenticación y RBAC

### Objetivo

Construir la base de seguridad antes de exponer módulos funcionales.

### Entregables

- Modelo de usuarios, roles y permisos.
- Login funcional.
- Protección de endpoints.
- Protección de rutas frontend.
- Semilla inicial de administrador.

### Verificación

- Un usuario sin permiso no accede a rutas privadas.
- Un administrador puede gestionar usuarios base.
- El backend valida permisos aunque el frontend oculte opciones.

## Fase 2: Finanzas Base

### Objetivo

Implementar el flujo central del módulo financiero.

### Entregables

- CRUD de transacciones.
- Dashboard con métricas principales.
- Filtros por fecha y tipo.
- Presupuestos básicos.
- Cierre de caja simple.

### Verificación

- Se puede registrar y consultar una transacción.
- El dashboard refleja los cambios.
- Los filtros no rompen cálculos de balance.

## Fase 3: Reportes e Integraciones

### Objetivo

Agregar valor operativo sobre el flujo financiero estable.

### Entregables

- Exportación Excel.
- Exportación PDF.
- Webhook para transacciones externas.
- Adaptador para importar o sincronizar datos desde referencias de `finanzas-negocio`.

### Verificación

- Los reportes coinciden con los filtros aplicados.
- El webhook valida secreto o mecanismo equivalente.
- Las integraciones quedan aisladas en infraestructura/adaptadores.

## Fase 4: Endurecimiento

### Objetivo

Mejorar seguridad, disponibilidad, observabilidad y mantenibilidad.

### Entregables

- Rate limiting.
- Logs estructurados.
- Healthcheck.
- Manejo estándar de errores.
- Pruebas de casos críticos.
- Pipeline básico de GitHub Actions.

### Verificación

- Los errores son trazables.
- Las acciones críticas tienen validación y permisos.
- El proyecto puede ejecutarse y probarse de forma reproducible.

## Fase 5: Design System / UI

### Objetivo

Unificar la experiencia visual del panel: fondos **neutros** (negro en dark, gris/blanco en light) con acentos **Tactical Olive** de AyniFlow. Patrones tipo Spendee (progress, cards, health badges).

### Entregables

- Tokens CSS `--premium-*` y utilidades Tailwind v4 (`@theme`).
- `ThemeProvider` con toggle claro/oscuro persistente.
- Componentes React: `StatSummary`, `ProgressBar`, `HealthBadge`, `CategoryChip`.
- Clases reutilizables (`btn-primary`, `budget-card`, `empty-state`, etc.).
- Documentación: `docs/06-design-system.md`.
- Refactor visual de auth, finanzas e integraciones.

### Verificación

- El frontend compila sin errores (`npm run build`).
- El tema persiste entre recargas (`localStorage`).
- Dark usa base `#000`; light usa base neutra sin tinte verde.
- Olive solo en acentos de marca y semántica financiera.

## Prompt Base para Cursor

Usar este formato al pedir implementación:

```text
Contexto:
- Proyecto: AyniFlow
- Documento base: docs/<documento-relevante>.md
- Fase: <fase>
- Módulo: <módulo>

Objetivo:
<qué se debe construir>

Restricciones:
- Respetar arquitectura existente.
- No introducir dependencias sin justificar.
- Mantener alta cohesión y bajo acoplamiento.
- Actualizar documentación si cambia una decisión.

Verificación esperada:
<cómo confirmar que quedó bien>
```

## Checklist Antes de Implementar

- [x] El alcance está en `docs/01-producto-y-alcance.md`.
- [x] La estructura respeta `docs/02-arquitectura.md`.
- [x] El módulo existe o fue definido en `docs/03-modulos.md`.
- [x] Las dependencias están justificadas en `docs/04-decisiones-tecnicas.md`.
- [x] La fase corresponde al roadmap actual.

## Estado de Fases

| Fase | Estado |
|------|--------|
| 0 — Base del repositorio | ✅ Completada |
| 1 — Autenticación y RBAC | ✅ Completada |
| 2 — Finanzas base | ✅ Completada |
| 3 — Reportes e integraciones | ✅ Completada |
| 4 — Endurecimiento | ✅ Completada |
| 5 — Design system / UI | ✅ Completada |
