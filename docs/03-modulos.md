# Módulos

Los módulos deben crecer por prioridad de producto. Cada módulo tendrá dominio, casos de uso, adaptadores de infraestructura y vistas propias cuando aplique.

## Prioridad

| Prioridad | Módulo | Estado |
|-----------|--------|--------|
| 1 | Usuarios y RBAC | ✅ Implementado (Fase 1) |
| 2 | Finanzas de negocio | ✅ Implementado (Fase 2 — base) |
| 3 | Integraciones financieras | ✅ Implementado (Fase 3 — reports/webhook/import) |
| 4 | Aprendizaje de inglés | Documentado para futuro, sin implementación inicial. |

## Usuarios y RBAC

Responsable de autenticación, autorización y administración de accesos.

### Capacidades

- Login y cierre de sesión.
- Gestión de usuarios.
- Gestión de roles.
- Gestión de permisos.
- Protección de rutas frontend.
- Protección de endpoints backend.

### Entidades Iniciales

- `User`
- `Role`
- `Permission`
- `UserRole`
- `RolePermission`

## Finanzas de Negocio

Responsable de registrar, analizar y reportar movimientos financieros. Debe tomar como referencia funcional el proyecto `finanzas-negocio`, pero adaptado a una arquitectura más escalable.

### Capacidades

- Dashboard financiero.
- Registro de ingresos y egresos.
- Filtros por fecha, tipo, banco, concepto y texto.
- Presupuestos por categoría y periodo.
- Cierre de caja.
- Exportación Excel/PDF.
- Recepción de transacciones externas por webhook.

### Entidades Iniciales

- `Transaction`
- `Budget`
- `Category`
- `PaymentMethod`
- `CashClosing`
- `WebhookEvent`

## Integraciones Financieras

Debe encapsular conexiones externas para que el módulo financiero no dependa directamente de APIs o formatos externos.

### Integraciones Candidatas

- Google Sheets como fuente importable o migrable.
- Webhooks desde n8n u otros sistemas.
- OCR/IA para comprobantes, solo después del CRUD financiero estable.
- BigQuery solo si existe una necesidad analítica real.

## Aprendizaje de Inglés

Módulo futuro basado en active recall, similar a Anki. No debe implementarse durante el MVP.

### Idea Inicial

- Tarjetas de memoria.
- Repetición espaciada.
- Seguimiento de progreso.
- Fuentes confiables para vocabulario y gramática.

## Contrato para Nuevos Módulos

Antes de crear un módulo nuevo, definir:

- Objetivo del módulo.
- Entidades principales.
- Casos de uso.
- Endpoints requeridos.
- Rutas frontend.
- Permisos RBAC.
- Datos que produce o consume.
