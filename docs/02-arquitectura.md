# Arquitectura

La arquitectura base separa dominio, aplicación, infraestructura y presentación. El objetivo es mantener módulos entendibles, con bajo acoplamiento y contratos claros entre frontend y backend.

## Principios

- Modularidad por dominio.
- Alta cohesión dentro de cada módulo.
- Bajo acoplamiento entre módulos.
- Contratos explícitos mediante DTOs, schemas y servicios.
- Validación en ambos extremos: UI y API.
- Complejidad gradual: agregar patrones solo cuando reduzcan riesgo o duplicación real.

## Frontend

```text
src/
├── assets/
├── core/
│   ├── components/
│   ├── constants/
│   ├── helpers/
│   ├── hooks/
│   ├── interceptors/
│   └── sessions/
├── layouts/
├── modules/
│   └── {ModuleName}/
│       ├── domain/
│       │   ├── models/
│       │   └── dtos/
│       ├── application/
│       │   ├── context/
│       │   ├── hooks/
│       │   └── utils/
│       ├── infrastructure/
│       │   ├── mappers/
│       │   └── repository/
│       └── views/
│           ├── components/
│           └── index.tsx
├── routes/
├── App.tsx
└── main.tsx
```

## Backend

```text
app/
├── core/
│   ├── config.py
│   ├── database.py
│   ├── logging.py
│   ├── security.py
│   └── rate_limit.py
├── modules/
│   └── {module_name}/
│       ├── domain/
│       │   ├── models.py
│       │   └── entities.py
│       ├── application/
│       │   ├── services.py
│       │   └── use_cases.py
│       ├── infrastructure/
│       │   ├── repositories.py
│       │   └── external_clients.py
│       └── presentation/
│           ├── routes.py
│           └── schemas.py
├── shared/
│   ├── exceptions.py
│   └── responses.py
└── main.py
```

## Comunicación Frontend-Backend

| Tema | Decisión |
|------|----------|
| HTTP client | Axios con interceptor para token y manejo común de errores. |
| Server state | TanStack React Query para consultas, mutaciones y cache de datos remotos. |
| Validación UI | Zod o Yup según compatibilidad con formularios elegidos. |
| Validación API | Pydantic para request/response schemas. |
| Autorización | RBAC validado en backend y reflejado en rutas/componentes del frontend. |

## Seguridad

- Tokens firmados y expirables.
- Hash de contraseñas con `passlib[bcrypt]`.
- Permisos verificados en backend antes de ejecutar acciones.
- Rate limiting en login, webhooks y endpoints de escritura.
- Variables sensibles fuera del repositorio.
- CORS configurado por entorno.

## Datos e Integraciones

MySQL será la base principal del sistema. Las integraciones heredadas o inspiradas en `finanzas-negocio` deben entrar mediante adaptadores para no contaminar el dominio con detalles externos.

## Observabilidad

- Logs estructurados por request.
- Registro de errores con contexto suficiente.
- Healthcheck básico del backend.
- Métricas o tracing solo cuando exista una necesidad operativa concreta.
