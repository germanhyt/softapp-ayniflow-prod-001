# AyniFlow

![AyniFlow logo propuesto](frontend/public/ayniflow-logo-propuesta.svg)

AyniFlow es una plataforma personal modular para administrar finanzas de negocio, usuarios y futuros módulos de productividad diaria. La base del proyecto debe crecer con arquitectura clara, contratos simples y una experiencia visual coherente con el estilo `dark/light` usado en `my_portfolio_2024`.

Desarrollado por `germ4n.hyt`.

## Ruta Rápida

1. Leer `BORRADOR.md` para entender la intención general.
2. Revisar `docs/01-producto-y-alcance.md` antes de implementar funcionalidades.
3. Usar `docs/02-arquitectura.md` como referencia para crear carpetas y capas.
4. Seguir `docs/05-roadmap-cursor.md` para trabajar por fases en Cursor.

## Levantar el Proyecto

### Requisitos

- Node.js 20+
- Python 3.11+
- Docker y Docker Compose (MySQL local)

### Primera vez

```bash
# Desde la raíz del repositorio
cd my_system_germanhyt

# 1. Variables de entorno
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. MySQL local
docker compose up -d

# Esperar a que MySQL esté healthy (primera vez puede tardar ~30 s)
docker compose ps

# 3. Backend — terminal 1
cd backend
python -m venv .venv

# Activar el venv según tu terminal:
source .venv/Scripts/activate    # Windows Git Bash
# source .venv/bin/activate      # Linux / macOS
# .venv\Scripts\Activate.ps1     # Windows PowerShell

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Alternativa en Git Bash (crea venv e instala deps si no existen):
# bash run.sh

# 4. Frontend — terminal 2 (desde la raíz del repo)
cd frontend
npm install
npm run dev
```

Al arrancar el backend se crean las tablas y el seed inicial (admin, roles, catálogos y transacciones de ejemplo). No hace falta ejecutar migraciones manuales.

### Arranque diario

```bash
# Terminal 1 — raíz del repo
docker compose up -d

# Terminal 2 — backend
cd backend
source .venv/Scripts/activate    # ajusta según tu shell (ver arriba)
uvicorn app.main:app --reload --port 8000
# o: bash run.sh

# Terminal 3 — frontend
cd frontend
npm run dev
```

### Detener servicios

```bash
# Backend y frontend: Ctrl+C en cada terminal

# MySQL (conserva los datos en el volumen Docker)
docker compose down
```

### Verificación

| Servicio | URL | Resultado esperado |
|----------|-----|--------------------|
| Frontend | http://localhost:5173 | Pantalla de login |
| Backend health | http://localhost:8000/health | `{"status":"ok","service":"ayniflow-api",...}` |
| API docs | http://localhost:8000/docs | Swagger UI de FastAPI |
| MySQL | localhost:3306 | Contenedor `germanhyt-mysql` en estado `healthy` |

Credenciales de desarrollo: `admin` / `Admin123!`

## MVP Prioritario

El primer entregable debe cubrir finanzas de negocio y usuarios/RBAC. El módulo de inglés queda registrado como evolución futura, sin implementación en esta etapa.

## Stack Base

| Capa | Decisión inicial |
|------|------------------|
| Frontend | React 19, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI |
| Base de datos | MySQL |
| DevOps | Docker, Docker Compose, GitHub Actions |

## Documentación

| Documento | Propósito |
|-----------|-----------|
| `docs/01-producto-y-alcance.md` | Define qué se construye, para quién y qué queda fuera. |
| `docs/02-arquitectura.md` | Define estructura frontend/backend e integración entre capas. |
| `docs/03-modulos.md` | Ordena los módulos del sistema y su prioridad. |
| `docs/04-decisiones-tecnicas.md` | Registra stack, dependencias y criterios técnicos. |
| `docs/05-roadmap-cursor.md` | Propone fases de trabajo verificables en Cursor. |

## Regla de Evolución

Antes de agregar una funcionalidad grande, actualizar primero el documento correspondiente. La documentación funciona como contrato para evitar decisiones improvisadas durante la implementación.

## Fase Actual: 4 — Endurecimiento ✅

MVP base completado con observabilidad, límites de tasa, healthchecks, errores estandarizados, tests y CI.

### Healthchecks

| Ruta | Uso |
|------|-----|
| `GET /health` | Estado general + DB |
| `GET /health/live` | Liveness |
| `GET /health/ready` | Readiness (DB requerida) |

### Rate limiting

- `POST /auth/login` → 10 req/min por IP
- `POST /finance/webhook` → 30 req/min por IP

Configurable con `RATE_LIMIT_ENABLED=true|false`.

### Tests backend

```bash
cd backend
DATABASE_URL=sqlite:// pytest -q
```

### CI

GitHub Actions en `.github/workflows/ci.yml` ejecuta tests backend y build frontend en cada push/PR.

### Verificación local pre-producción

```bash
bash scripts/verify-production.sh
```

---

## Producción y PWA

### Despliegue con Docker

```bash
cp .env.production.example .env.production
# Editar secretos, contraseñas y PUBLIC_APP_URL

docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml ps
```

| Servicio | URL / puerto | Notas |
|----------|--------------|-------|
| Web (nginx + SPA) | http://localhost:8080 | Ajustable con `APP_PORT` |
| API (interna) | `backend:8000` | Proxy desde nginx |
| MySQL | interno | Volumen `mysql_data` |

Checklist antes de exponer:

- `DEBUG=false`
- `JWT_SECRET_KEY`, `WEBHOOK_SECRET` y `MYSQL_PASSWORD` únicos
- `ADMIN_PASSWORD` distinta al valor inicial
- `CORS_ORIGINS` y `PUBLIC_APP_URL` apuntando al dominio real
- HTTPS delante de nginx (reverse proxy o certificado en el host)

El backend registra advertencias al arrancar si detecta secretos por defecto con `DEBUG=false`.

### PWA (instalable)

AyniFlow incluye manifest y service worker para instalarse en escritorio y móvil:

- `frontend/public/manifest.webmanifest`
- `frontend/public/sw.js`
- Iconos `pwa-192.svg` y `pwa-512.svg`

En producción (HTTPS), el navegador mostrará la opción de instalar. También aparece el botón **Instalar app** en la barra superior cuando el dispositivo lo permite.

Requisitos típicos:

- Servir la app por HTTPS
- Manifest válido con iconos 192/512
- Service worker registrado (automático en build de producción)

---

## Fase 3 — Reportes e Integraciones ✅

Incluye exportación Excel/PDF, webhook externo, import legacy JSON y sync opcional con Google Sheets.

### Reportes

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/finance/reports/excel` | Descarga Excel filtrado |
| GET | `/finance/reports/pdf` | Descarga PDF filtrado |

### Webhook (compatible finanzas-negocio / n8n)

```http
POST /finance/webhook
X-Webhook-Secret: {WEBHOOK_SECRET}
Content-Type: application/json

{
  "fecha": "2026-06-21",
  "hora": "14:30",
  "banco": "BCP",
  "tipo": "Yape",
  "monto": 150.00,
  "destinatario": "Cliente",
  "num_operacion": "OP-9001"
}
```

### Integraciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/finance/integrations/import/legacy` | Importar arreglo JSON legacy |
| POST | `/finance/integrations/sheets/sync` | Sincronizar Google Sheets (si está configurado) |
| GET | `/finance/webhook-events` | Últimos eventos webhook |

Frontend: `/finance/integrations` para importación manual y sync.

---

## Fase 2 — Finanzas Base ✅

Incluye CRUD de transacciones, dashboard con métricas, filtros, presupuestos y cierre de caja.

### Rutas frontend

| Ruta | Descripción |
|------|-------------|
| `/finance` | Dashboard financiero + transacciones |
| `/finance/budgets` | Presupuestos por categoría/mes |
| `/finance/cash-closing` | Cierre de caja por rango |

### Endpoints finanzas

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/finance/transactions` | `finance:read` |
| POST | `/finance/transactions` | `finance:write` |
| PUT | `/finance/transactions/{id}` | `finance:write` |
| DELETE | `/finance/transactions/{id}` | `finance:write` |
| GET | `/finance/summary` | `finance:read` |
| GET | `/finance/cash-closing` | `finance:read` |
| GET/POST/PUT/DELETE | `/finance/budgets` | `finance:read` / `finance:write` |

Al primer arranque con BD vacía se cargan transacciones y presupuestos de ejemplo.

---

## Fase 1 — Autenticación y RBAC ✅

La Fase 1 incluye login JWT, RBAC, seed de admin, rutas protegidas y gestión básica de usuarios.

### Credenciales iniciales (desarrollo)

| Campo | Valor por defecto |
|-------|-------------------|
| Usuario | `admin` |
| Contraseña | `Admin123!` |

Configurables en `.env` con `ADMIN_USERNAME` y `ADMIN_PASSWORD`.

### Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | Obtener token JWT |
| GET | `/auth/me` | Usuario autenticado |
| GET | `/users` | Listar usuarios (`users:read`) |
| POST | `/users` | Crear usuario (`users:write`) |
| GET | `/roles` | Listar roles (`roles:read`) |

### Roles iniciales

- `admin` — todos los permisos
- `operator` — finanzas + lectura de usuarios
- `reader` — solo lectura

---

## Fase 0: Base del Repositorio

Instrucciones de arranque: ver [Levantar el Proyecto](#levantar-el-proyecto).

### Estructura del Repositorio

```text
my_system_germanhyt/
├── frontend/          # React 19 + Vite + Tailwind
├── backend/           # FastAPI
├── docs/              # Documentación del proyecto
├── docker-compose.yml # MySQL local
└── .env.example       # Variables de entorno de referencia
```


