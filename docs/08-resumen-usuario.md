# AyniFlow — Resumen rápido para el usuario

**¿Qué es?** Una app web para llevar las **finanzas de tu negocio** y **controlar quién accede** a cada cosa.

**URL producción:** https://ayniflow.gcbprojects.site

---

## En 30 segundos

1. **Entras** con usuario/contraseña o **Google**.
2. El **Dashboard** te muestra el mes: balance, gráficos y accesos rápidos.
3. En **Finanzas** registras movimientos, presupuestos, ahorros y préstamos.
4. En **Mi perfil** cambias tu nombre, foto y contraseña.
5. Si eres **admin**, gestionas usuarios y roles en **Usuarios**.

---

## Mapa del menú

```
Principal
├── Dashboard      → Vista general del mes
└── Mi perfil      → Nombre, foto, contraseña, permisos

Finanzas  (si tienes acceso)
├── Resumen        → Gráficos y KPIs
├── Transacciones  → Ingresos / egresos (+ OCR de vouchers)
├── Presupuestos   → Plan vs gasto (OK · Riesgo · Excedido)
├── Ahorros        → Metas de ahorro
├── Préstamos      → Debo / Me deben
├── Cierre de caja → Cuadre por fechas
└── Integraciones  → Gmail, Sheets, webhooks, reportes

Administración  (solo admin/lectura usuarios)
└── Usuarios       → Crear, editar, roles
```

---

## Roles habituales

| Rol | En una frase |
|-----|----------------|
| **Admin** | Lo ve y lo cambia todo. |
| **Operador** | Mueve dinero en finanzas; no administra usuarios. |
| **Lector** | Solo mira reportes y dashboards. |

> Si no ves una sección, tu rol no tiene permiso. Cierra sesión y vuelve a entrar si te cambiaron el rol.

---

## Mi perfil — lo esencial

| Qué | Cómo |
|-----|------|
| **Foto** | Arrastra imagen al círculo o «Subir foto» (máx. 2 MB) |
| **Nombre** | Pestaña **Datos** → Guardar cambios |
| **Contraseña** | Pestaña **Seguridad** (no aplica si solo usas Google) |
| **Permisos** | Pestaña **Acceso** → Mostrar permisos |

Tu foto también aparece en la **barra superior** junto a tu nombre.

---

## Finanzas — flujo diario recomendado

```
Transacciones  →  registra el día (manual u OCR)
      ↓
Presupuestos   →  revisa si vas OK / en riesgo / excedido
      ↓
Dashboard      →  mira balance y gráficos del mes
      ↓
Cierre de caja →  cuadra al fin de semana o mes
```

**Colores:** verde = bien / ingresos · amarillo = riesgo · rojo = excedido / egresos.

---

## Integraciones (opcional)

Solo si te las habilitaron:

- **Gmail** — detecta pagos en correo.
- **Webhook** — recibe movimientos desde n8n u otro sistema.
- **Excel/PDF** — exporta reportes filtrados.

Ruta: **Finanzas → Integraciones**.

---

## Atajos de la barra superior

| Icono | Función |
|-------|---------|
| Tu nombre + foto | Ir a Mi perfil |
| Campana | Notificaciones |
| Sol/Luna | Tema claro u oscuro |
| Instalar app | PWA (escritorio/móvil) |
| Salir | Cerrar sesión |

---

## Problemas comunes

| Situación | Qué hacer |
|-----------|-----------|
| No veo Finanzas | Pide permiso `finance:read` al admin |
| Login Google falla | Admin debe revisar configuración OAuth |
| Cambié de rol y no se actualiza | Cierra sesión y entra de nuevo |
| OCR leyó mal el voucher | Corrige campos antes de guardar |

---

## Más detalle

Guía completa paso a paso: **[07-guia-usuario.md](./07-guia-usuario.md)**
