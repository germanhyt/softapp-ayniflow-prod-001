# Producto y Alcance

AyniFlow busca centralizar herramientas personales y de negocio en una plataforma modular. El MVP debe resolver primero la gestión financiera del negocio y la administración segura de usuarios.

## Objetivo

Construir una base funcional que permita registrar, consultar, analizar y proteger información operativa del negocio, reutilizando aprendizajes del proyecto `finanzas-negocio` y dejando preparada la arquitectura para nuevos módulos.

## Usuarios Iniciales

| Usuario | Necesidad |
|---------|-----------|
| Administrador | Gestionar usuarios, roles, permisos y configuración general. |
| Operador financiero | Registrar y revisar ingresos, egresos, presupuestos y cierres. |
| Usuario lector | Consultar reportes sin modificar información crítica. |

## Funcionalidades del MVP

- Autenticación de usuarios.
- Gestión de usuarios con RBAC.
- Dashboard financiero con ingresos, egresos, balance y filtros.
- Registro manual de transacciones.
- Importación o integración progresiva con fuentes usadas en `finanzas-negocio`.
- Gestión de presupuestos.
- Exportación de reportes en Excel y PDF.
- Recepción de eventos externos mediante webhooks.

## Requisitos No Funcionales

- UI responsive con soporte `dark/light`.
- Seguridad por token, roles y permisos.
- Validación de datos en frontend y backend.
- Logs útiles para trazabilidad técnica y funcional.
- Rate limiting en endpoints sensibles.
- Estructura preparada para caching donde exista lectura repetitiva.
- Docker Compose para levantar servicios locales.
- Uso de `.gitkeep` cuando se requieran carpetas base vacías.

## Fuera de Alcance Inicial

- Módulo de aprendizaje de inglés.
- Automatización OCR con IA si retrasa el MVP base.
- Integraciones complejas con BigQuery, MSAL o Google APIs sin caso de uso validado.
- WebSockets en tiempo real salvo que el flujo financiero lo necesite claramente.

## Criterio de MVP Listo

- Un usuario autenticado puede entrar según su rol.
- Puede ver un dashboard financiero con datos reales o semilla.
- Puede crear, listar, filtrar y exportar transacciones.
- El administrador puede gestionar usuarios y permisos mínimos.
- El sistema puede levantarse localmente con instrucciones reproducibles.
