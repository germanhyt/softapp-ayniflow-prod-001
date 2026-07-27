# Design System — AyniFlow

Referencia visual del frontend. Inspirado en patrones **Spendee** (glanceable, progress-first, cards mobile) con identidad **AyniFlow** (olive + tipografía premium).

## Principios

1. **Fondos neutros, marca en acento** — negro/gris en dark, blanco/gris en light. El olive vive en primary, badges y gráficos, no en el canvas.
2. **Salud a la vista** — presupuestos, ahorros y préstamos muestran barras y badges semánticos (ok / riesgo / excedido).
3. **Mobile-first en listas** — tablas en desktop (`lg+`), cards en mobile.
4. **Tokens primero** — cambios globales vía `--premium-*` en `frontend/src/index.css`.

## Paleta

### Marca (ambos temas)

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--premium-primary` | `#4b5320` | `#8a9a65` | Botones, links, marca |
| `--premium-secondary` | `#6e7552` | `#b0bb94` | Hover, gradientes |
| `--premium-accent` | `#8b995e` | `#a3b876` | Iconos, charts fallback |

### Fondos neutros

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--premium-bg` | `#f5f5f5` | `#000000` | Canvas app |
| `--premium-surface` | `#ffffff` | `#0d0d0d` | Paneles, cards |
| `--premium-surface-high` | `#ebebeb` | `#1a1a1a` | Inputs, filas hover |
| `--premium-text` | `#171717` | `#f5f5f5` | Texto principal |
| `--premium-text-muted` | `#737373` | `#a3a3a3` | Subtítulos, hints |
| `--premium-border` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` | Bordes |

### Semánticos

| Token | Rol |
|-------|-----|
| `--premium-success` | En plan, ingresos, completado |
| `--premium-warning` | Riesgo 80–99%, alertas |
| `--premium-danger` | Excedido, egresos, errores |
| `--premium-info` | Neutro informativo |

Cada semántico tiene variante `-soft` (fondo) y `-rgb` (alpha overlays).

## Tipografía

| Rol | Fuente |
|-----|--------|
| UI / body | **Manrope** |
| Wordmark | **Space Grotesk** (`.brand-wordmark`) |

Títulos de página: `text-xl font-semibold tracking-tight`.  
Labels de stat: `.stat-summary__label` (uppercase, tracking-wide).

## Componentes React (`frontend/src/core/components/`)

| Componente | Props clave | Uso |
|------------|-------------|-----|
| `StatSummary` | `label`, `value`, `tone?`, `hint?` | KPIs hero |
| `ProgressBar` | `value`, `variant?`, `showLabel?` | Presupuesto, ahorro, flujo |
| `HealthBadge` | `label`, `tone` | ok / riesgo / movimiento |
| `CategoryChip` | `name`, `color` | Identidad de categoría |
| `BrandLogo` / `BrandIcon` | — | Marca animada |
| `FormField` / `ModalFormActions` | labels + footer modal | Formularios en modales |
| `ModalSection` | secciones internas en modales complejos |
| `IntegrationPanel` | bloques Gmail/Sheets/Webhooks/OCR |
| `PageHeader` | `title`, `description?`, `icon?`, `badge?`, `actions?` | Encabezado de módulo |
| `FilterField` / `FilterPanel` | labels + grid | Filtros de listado |
| `SegmentTabs` | opciones pill | Tabs Debo/Me deben, presets de periodo |
| `Modal`, `ThemeToggle`, `PaginationControls` | — | Shell compartido |

### Utilidades de dominio

- `budgetHealth.ts` — umbrales ok &lt;80%, risk 80–99%, exceeded ≥100%
- `chartColors.ts` — `CATEGORY_COLORS`, `PAYMENT_TYPE_COLORS`

## Clases CSS (`@layer components` en `index.css`)

| Clase | Descripción |
|-------|-------------|
| `btn-primary`, `btn-secondary`, `btn-ghost` | Acciones |
| `input-field` | Formularios |
| `card`, `stat-card`, `chart-panel` | Contenedores |
| `stat-summary`, `stat-summary--success/warning/danger/info` | KPI tiles |
| `progress-track`, `progress-fill--ok/risk/exceeded` | Barras |
| `badge`, `badge-success/warning/danger/info` | Pills |
| `budget-card` | Card estilo Spendee (hover, rounded-2xl) |
| `category-chip`, `category-chip__swatch` | Chip categoría |
| `empty-state`, `empty-state__icon` | Sin datos |
| `skeleton` | Loading pulse |
| `table-shell`, `table-head`, `table-row` | Tablas desktop |
| `glass-panel`, `hero-bg`, `auth-card` | Login / sidebar |
| `sidebar-section-label`, `role-card`, `permission-card` | Navegación y modales auth |
| `topbar-user-chip` | Identidad en topbar |

## Patrones de layout

### Página tipo finanzas

```
[ Header: título + CTA ]
[ StatSummary × 3–4 ]
[ Filtros en .card ]
[ Cards mobile lg:hidden ]
[ Tabla desktop hidden lg:block ]
[ PaginationControls ]
```

### Breakpoint cards ↔ tabla

- Mobile/tablet: `space-y-3 lg:hidden` con `budget-card`
- Desktop: `table-shell hidden lg:block`

## Tema claro / oscuro

- `ThemeProvider` — `localStorage` key `ayniflow-theme`, default **dark**
- Toggle: `ThemeToggle` en topbar y login
- Clase `.dark` en `<html>` (ver `frontend/index.html`)
- **Dark:** fondo `#000000`, superficies `#0d0d0d` / `#1a1a1a`
- **Light:** fondo `#f5f5f5`, superficies blancas/gris neutro
- Olive solo en acentos de marca

## Google Sign-In

- Backend: `GET /auth/google/status`, `/auth/google/oauth/start`, callback en `/auth/google/oauth/callback`
- Variables: `GOOGLE_AUTH_CLIENT_*` (fallback a `GMAIL_CLIENT_*`)
- Frontend: botón en login → `GoogleOAuthModal` → popup OAuth → `GoogleOAuthCallbackPage`
- Auto-registro con rol `GOOGLE_AUTH_DEFAULT_ROLE` (default `reader`)

## Skeleton loaders

| Componente | Uso |
|------------|-----|
| `index.html` (`#root:empty`) | Pulso mínimo antes de montar React |
| `AppBootstrap` | Skeleton inicial según ruta (auth vs app) |
| `AppShellSkeleton` | Carga de sesión en rutas protegidas |
| `AuthSessionSkeleton` | Pantallas auth mínimas |
| `TableSkeleton` | Tablas en carga |
| Clase `.skeleton` | Pulso inline en cards |

## Archivos clave

```
frontend/src/index.css              ← tokens + clases
frontend/src/core/theme/ThemeProvider.tsx
frontend/src/core/components/     ← componentes DS
frontend/public/logo.svg            ← assets marca
docs/06-design-system.md            ← este documento
```

## Verificación rápida

```bash
cd frontend
npm run build
```

Recorrer: `/dashboard`, `/finance/budgets`, `/users`, `/finance/integrations` en dark y light.
