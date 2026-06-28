# Borrador Orquestado: AyniFlow

AyniFlow será una plataforma personal modular para gestionar áreas del día a día con foco inicial en finanzas de negocio, usuarios/RBAC y una base técnica preparada para crecer sin sobrecomplicar el producto.

## Decisión Base 

El primer alcance implementable será el MVP de finanzas y autenticación/RBAC. El módulo de aprendizaje de inglés queda documentado como visión futura, pero no debe entrar en implementación inicial.

## Mapa de Documentación

1. `README.md`: entrada principal del proyecto y guía rápida para empezar.
2. `docs/01-producto-y-alcance.md`: objetivo, alcance funcional, no funcional y límites del MVP.
3. `docs/02-arquitectura.md`: arquitectura propuesta para frontend, backend, seguridad, datos e integraciones.
4. `docs/03-modulos.md`: definición de módulos, responsabilidades y prioridad.
5. `docs/04-decisiones-tecnicas.md`: stack, dependencias candidatas y criterios de adopción.
6. `docs/05-roadmap-cursor.md`: forma de trabajar el proyecto en Cursor por fases verificables.

## Alcance Inicial

- Módulo de finanzas de negocio basado en el proyecto `finanzas-negocio`.
- Módulo de usuarios con RBAC para proteger rutas, permisos y acciones.
- Base visual inspirada en `my_portfolio_2024`, respetando soporte `dark/light`.
- Backend con FastAPI, estructura entendible y contratos alineados al frontend.
- Preparación para webhooks, WebSockets, logs, observabilidad, rate limiting, caching y recuperación.

## Fuera de Alcance por Ahora

- Módulo de aprendizaje de inglés con active recall.
- Automatizaciones avanzadas que no sean necesarias para el MVP de finanzas.
- Abstracciones complejas sin necesidad real en el producto.

## Principios de Trabajo

- Respetar arquitectura por capas y módulos.
- Mantener alta cohesión y bajo acoplamiento.
- Aplicar SOLID y patrones solo cuando ayuden a entender y mantener el sistema.
- Usar comentarios solo cuando expliquen decisiones o lógica no obvia.
- Si una carpeta debe existir sin archivos todavía, usar `.gitkeep`.
- Trabajar en Cursor con documentación viva antes de implementar cambios grandes.



---------------------------------------------------------------
---------------------------------------------------------------
- Mejora UI del checbox en configuraciones (toggle switcht)
- Resumen de gráficos en el Dashboard principal
- icons de pdf/excel en los módulos como en el cierre de caja, y donde sea necesario
- en lugar de la imagen del logo, gneeramos un componente donde coloquemos un icon referente al logo con animación

---------------------------------------------------------------
---------------------------------------------------------------
28/06/226
- animaciòn de apertura del sidebar
- actualización del favicon.ico con el logo principal, y como label "germ4n.hyt"
- comparto la config del nodo de "gmail trigger" de n8n en la imagen, esto para leer los correos entrantes en tiempo real (maneja la miam lógica de python que el histórico solo que varóa el modo de obtener los correos), verificamos si realmente se están escuchando en el pool configurado
- consulta cómo se involucra el presupuesto con en otros módulos y en los gráficos?
- Hay módulo de ahorros y préstamos?
- refactorización la lógica en el dashboard resumen


## Matriz Presupuesto vs Módulos/Gráficos (estado actual)

| Área | Cómo participa presupuesto hoy | Brecha actual | Acción aplicada |
|---|---|---|---|
| `Finance/Budgets` | Cálculo por categoría de `presupuestado`, `actual`, `%`, `diferencia` | Sin visibilidad ejecutiva fuera del módulo | Base principal mantenida |
| `Finance/Overview` | Antes: solo métricas + charts de transacciones | No mostraba salud presupuestaria del mes | Se agregó bloque de salud presupuestaria (total, ejecutado, riesgo, excedidos) |
| `Dashboard` | Antes: resumen financiero e integraciones | No incluía señal de presupuesto | Se agregó resumen de presupuestos del mes y acceso a presupuestos |
| `Notificaciones` | Alertas de presupuesto 80/100% con webhook opcional | Faltaba trazabilidad visible en panel principal | Estado de integraciones + alertas activas visibles |
| `Integraciones` | Control de webhook para alertas | Sin inputs/toggles operativos centralizados | Ya configurable con toggle + valor efectivo |

## Ahorros y Préstamos

- Estado actual: **implementado** como submódulos de `Finance`.
- Endpoints:
  - `GET/POST/DELETE /finance/savings`
  - `GET /finance/savings/summary`
  - `GET/POST/DELETE /finance/loans`
  - `GET /finance/loans/summary`
- UI:
  - `/finance/savings` para metas de ahorro + KPI global.
  - `/finance/loans` para deuda activa + amortización.

## Interacción / Intercepción entre módulos (coherencia)

| Módulo origen | Intercepta / consume | Punto técnico |
|---|---|---|
| `Auth (RBAC)` | `Finance`, `Savings`, `Loans` | `require_permission("finance:read|write")` en rutas backend + `ProtectedRoute` en frontend |
| `Transactions` | `Budgets` | `sum_expenses_by_category()` consolida egresos por categoría para ejecutar presupuesto |
| `Budgets` | `Notifications` | `NotificationService.check_budget_alerts()` genera alertas 80/100% y dispara webhook si está habilitado |
| `Dashboard` | `Finance/Budgets/Integrations` | Hooks `useFinanceSummary`, `useBudgets`, `useIntegrationsStatus`, `useGmailPollStatus` |
| `Finance Overview` | `Reports` | Botones Excel/PDF consumen `/finance/reports/excel|pdf` con filtros |
| `Integrations` | `Gmail/Sheets/Webhooks/OCR` | toggles + `effective_value` determinan comportamiento runtime del backend |

## Comparativo n8n Gmail Trigger vs Backend Python

| n8n Trigger | Backend Python (actual) | Estado |
|---|---|---|
| Poll Times: Every Minute | `gmail_poll_interval_seconds=60` (configurable en Integraciones) | Alineado |
| Event: Message Received | `run_gmail_poll_loop` + `poll_new()` por intervalo | Alineado |
| Filter Search: `label:PAGOS/BCP/YAPE` | `gmail_query` efectivo | Alineado |
| Read Status: Unread emails only | query `... is:unread` en `poll_new()` | Alineado |
| Fetch Test Event (manual) | endpoint `POST /finance/integrations/gmail/poll` + `poll-status` | Equivalente técnico |

- Evidencia runtime: endpoint `GET /finance/integrations/gmail/poll-status` ya muestra `last_checked_at` y `last_result` para confirmar escucha activa.


- Ahora un módulo para poder registrar a las personas que me deben, o olo puede bastar con registrarlo como ingreso? qué recomiendas como experto en fintech, además cómo intercepta en el flujo? (usa ngram)


- Actualizamos nuestro branding, el proyecto es "AyniFlow" (genera el logo propuesto), y es desarrollado por germ4n.hyt, refactorizamos

- procedemos a testear y preparar proyecto para producción
- procedemos con implementar PWA para permitir instalarlo en dispositivos

---------------------------------------------------------------
---------------------------------------------------------------

