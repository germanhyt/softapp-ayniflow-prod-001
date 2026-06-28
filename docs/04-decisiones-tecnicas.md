# Decisiones Técnicas

Este documento registra decisiones iniciales del stack y evita instalar dependencias por costumbre. Cada librería debe entrar cuando exista un caso de uso concreto.

## Stack Principal

| Área | Decisión |
|------|----------|
| Frontend | React 19 + TypeScript |
| Estilos | Tailwind CSS con soporte `dark/light` |
| Rutas | React Router DOM |
| Estado remoto | TanStack React Query |
| Estado cliente | Zustand solo si el estado compartido lo justifica |
| HTTP | Axios |
| Formularios | Formik o alternativa integrada con Zod/Yup |
| Backend | FastAPI |
| ORM | SQLAlchemy |
| Base de datos | MySQL |
| Contenedores | Docker y Docker Compose |
| CI | GitHub Actions |

## Dependencias Frontend Candidatas

| Dependencia | Uso esperado | Criterio de adopción |
|-------------|--------------|----------------------|
| `@tanstack/react-query` | Server state | Adoptar desde el inicio si hay API real. |
| `axios` | Cliente HTTP | Adoptar con interceptores y manejo común de errores. |
| `zod` o `yup` | Validación | Elegir una sola para evitar duplicidad. |
| `@tanstack/react-table` | Tablas financieras | Adoptar cuando exista tabla con filtros/orden/paginación. |
| `dayjs` | Fechas | Adoptar si se requiere formateo consistente. |
| `lucide-react` | Iconografía | Preferir una sola librería de iconos. |
| `jspdf` | PDF | Adoptar al implementar reportes. |
| `xlsx` | Excel | Adoptar al implementar exportación. |
| `@xyflow/react` | Flujos visuales | No adoptar en MVP salvo caso claro. |
| `crypto-js` | Criptografía cliente | Evitar salvo necesidad específica; seguridad principal en backend. |

## Dependencias Backend Candidatas

| Dependencia | Uso esperado | Criterio de adopción |
|-------------|--------------|----------------------|
| `fastapi` | API principal | Base del backend. |
| `uvicorn[standard]` | Servidor ASGI | Base para desarrollo y despliegue. |
| `sqlalchemy` | ORM | Base para persistencia. |
| `pydantic` | Schemas | Base para contratos API. |
| `python-jose[cryptography]` | JWT | Adoptar con autenticación. |
| `passlib[bcrypt]` | Hash de passwords | Adoptar con usuarios. |
| `python-dotenv` | Variables locales | Solo para desarrollo local. |
| `python-multipart` | Uploads | Adoptar cuando exista carga de archivos. |
| `pandas`, `openpyxl`, `xlrd` | Reportes/importaciones | Adoptar al implementar importación/exportación. |
| `APScheduler` | Jobs programados | Adoptar cuando existan tareas recurrentes reales. |
| `requests` | Clientes externos | Adoptar si no se usa cliente async. |
| Google APIs | Sheets/OAuth | Adoptar al migrar o integrar `finanzas-negocio`. |
| `msal` | Microsoft auth | No adoptar hasta validar necesidad. |

## Criterios de Calidad

- No instalar dependencias que no estén conectadas a una historia o módulo activo.
- Mantener una sola solución por categoría siempre que sea posible.
- Preferir contratos tipados y validación explícita.
- Proteger secretos con `.env` y ejemplos sin credenciales reales.
- Documentar decisiones que cambien arquitectura, seguridad o persistencia.

## Pendientes de Decisión

- ~~Definir gestor de paquetes frontend: `npm`, `pnpm` o `yarn`.~~ **Decidido: `npm`** (Fase 0).
- Definir herramienta de migraciones para MySQL.
- Definir si los reportes se generan en frontend, backend o ambos según volumen de datos.
- Definir estrategia de despliegue inicial.
