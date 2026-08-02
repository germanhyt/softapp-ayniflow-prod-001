# Guía de usuario — AyniFlow

Documento orientado a **personas que usan la aplicación** (administradores, operadores y lectores). No requiere conocimientos técnicos.

**Producción:** https://ayniflow.gcbprojects.site

---

## 1. ¿Qué es AyniFlow?

AyniFlow es una plataforma web para **gestionar finanzas de negocio** y **controlar quién puede ver o modificar la información**. Desde un mismo lugar puedes:

- Registrar ingresos y egresos.
- Analizar el flujo del mes con gráficos y KPIs.
- Controlar presupuestos, ahorros y préstamos.
- Cerrar caja por periodo y exportar reportes.
- Conectar fuentes externas (Gmail, Google Sheets, webhooks, OCR).
- Administrar usuarios, roles y permisos.

La interfaz funciona en **escritorio y móvil**, con tema **claro u oscuro**, y puede **instalarse como app** (PWA) en dispositivos compatibles.

---

## 2. Primer acceso

### 2.1 Iniciar sesión

1. Abre la URL de AyniFlow en el navegador.
2. En la pantalla de login tienes dos opciones (según configuración del servidor):

| Método | Cuándo usarlo |
|--------|----------------|
| **Continuar con Google** | Si tu organización habilitó Google Sign-In. Abre una ventana de autorización de Google. |
| **Usuario y contraseña** | Acceso clásico con credenciales entregadas por el administrador. |

3. Tras un login correcto llegarás al **Dashboard**.

**Si no puedes entrar:** verifica usuario/contraseña, que tu cuenta esté activa o contacta al administrador. Con Google, el email debe estar registrado o permitido el auto-registro configurado en el servidor.

### 2.2 Cerrar sesión

En la barra superior (derecha), pulsa el icono de **Salir** (puerta con flecha). Tu sesión se cierra de inmediato.

### 2.3 Instalar la app (PWA)

En producción con HTTPS verás el botón **Instalar app** en la barra superior cuando el navegador lo permita. La app queda en el escritorio o pantalla de inicio como acceso directo.

---

## 3. Navegación general

### 3.1 Barra lateral (sidebar)

| Sección | Opciones | Quién las ve |
|---------|----------|--------------|
| **Principal** | Dashboard, Mi perfil | Todos los usuarios autenticados |
| **Finanzas** | Resumen, Transacciones, Presupuestos, Ahorros, Préstamos, Cierre de caja, Integraciones | Usuarios con permiso `finance:read` |
| **Administración** | Usuarios | Usuarios con permiso `users:read` |

En móvil, abre el menú con el icono ☰ de la barra superior.

### 3.2 Barra superior (topbar)

- **Chip con tu nombre y foto** → enlace a **Mi perfil**.
- **Estado en vivo** y **campana de notificaciones** (si tienes acceso a finanzas).
- **Instalar app**, **cambio de tema** (claro/oscuro) y **cerrar sesión**.

### 3.3 Qué ves según tu rol

No todos los usuarios ven lo mismo. El sistema usa **roles** y **permisos**:

| Rol típico | Puede hacer |
|------------|-------------|
| **Administrador** | Todo: usuarios, roles, finanzas completas e integraciones. |
| **Operador** | Registrar y editar movimientos financieros; consultar usuarios. |
| **Lector** | Solo consultar dashboards, listados y reportes. |

Si intentas abrir una sección sin permiso, la app te redirige o no muestra la opción en el menú.

---

## 4. Dashboard

Ruta: `/dashboard`

Es la **vista ejecutiva** al entrar. Muestra:

- Saludo con tu nombre de usuario.
- Resumen de tu cuenta: roles, cantidad de permisos y módulos activos.
- Si tienes acceso a finanzas:
  - **Balance del mes** (ingresos − egresos).
  - KPIs de ingresos, egresos y transacciones.
  - Gráficos de medios de pago, categorías y actividad diaria.
  - **Salud presupuestaria** (OK / Riesgo / Excedido).
  - Resumen de ahorros y préstamos.
  - Estado de integraciones y accesos rápidos a cada módulo.
- Listado expandible de **permisos activos** de tu sesión.

**Consejo:** usa los enlaces «Ver análisis», «Ver presupuestos» o las tarjetas de acceso rápido para ir directo al módulo que necesitas.

---

## 5. Mi perfil

Ruta: `/profile`  
Acceso: sidebar → **Mi perfil**, o clic en tu nombre en la topbar.

### 5.1 Columna de identidad (izquierda)

- **Avatar:** iniciales por defecto o foto que subas.
- **Subir foto:** arrastra una imagen al círculo o usa **Subir foto**.
  - Formatos: JPG, PNG, WebP, GIF.
  - Tamaño máximo: 2 MB.
- **Cambiar foto** / **Quitar foto** (icono papelera).
- Badges de roles y de **Google** si tu cuenta está vinculada.

### 5.2 Pestañas de contenido (derecha)

#### Datos

- Editar **nombre completo** (visible en la app).
- **Usuario**, **email** y **fecha de registro** son solo lectura (los cambia un administrador).

#### Seguridad

- **Cuenta local:** formulario para cambiar contraseña (actual + nueva + confirmación).
- **Cuenta Google:** mensaje informativo; la contraseña se gestiona en Google.

#### Acceso

- Tarjetas con tus **roles** y descripción.
- Botón **Mostrar permisos** para ver el listado completo de capacidades de tu sesión.

**Nota:** tras cambios de rol hechos por un admin, **cierra sesión y vuelve a entrar** para refrescar permisos en el token.

---

## 6. Finanzas

Disponible en el submenú **Finanzas** del sidebar. Todas las pantallas comparten patrones similares: encabezado con título, filtros en panel, KPIs con colores semánticos y listas en tabla (escritorio) o tarjetas (móvil).

### 6.1 Resumen y gráficos

Ruta: `/finance`

Vista analítica del periodo seleccionado:

- Balance, ingresos, egresos y cantidad de movimientos.
- Gráficos por categoría, medio de pago y evolución diaria.
- Filtros por rango de fechas.

Úsala para entender **cómo va el negocio** antes de entrar al detalle de transacciones.

### 6.2 Transacciones

Ruta: `/finance/transactions`

Registro operativo de movimientos.

**Acciones principales:**

| Acción | Descripción |
|--------|-------------|
| **Nueva transacción** | Formulario manual: tipo (ingreso/egreso), monto, categoría, banco, medio de pago, concepto, etc. |
| **Escanear voucher** | Sube foto de comprobante BCP/Yape; el sistema intenta rellenar campos (OCR local o Gemini si está activo). |
| **Editar / Eliminar** | Según permiso `finance:write`. |
| **Filtros** | Por fechas, tipo, categoría, banco, texto libre. |
| **Operaciones masivas** | Selección múltiple para acciones en lote (si está habilitado en la vista). |

**Buenas prácticas:**

- Revisa siempre los datos extraídos por OCR antes de guardar.
- Usa conceptos claros para facilitar búsquedas y cierres de caja.
- Vincula movimientos a préstamos o metas de ahorro cuando corresponda (opciones en el modal).

### 6.3 Presupuestos

Ruta: `/finance/budgets`

Planifica cuánto puedes gastar por **categoría y mes**.

- Cada presupuesto muestra **ejecutado vs planificado** con barra de progreso.
- Estados visuales:
  - **OK** — por debajo del 80 % del presupuesto.
  - **Riesgo** — entre 80 % y 99 %.
  - **Excedido** — 100 % o más.
- Crea, edita o elimina presupuestos según tu permiso de escritura.
- Modal de **detalle de salud** para ver categorías en riesgo o excedidas.

### 6.4 Ahorros

Ruta: `/finance/savings`

Gestiona **metas de ahorro**:

- Nombre, monto objetivo y monto ahorrado.
- Barra de avance y porcentaje de cumplimiento.
- Registra aportes desde el modal de edición o vinculando transacciones de egreso tipo ahorro.

### 6.5 Préstamos y cobranzas

Ruta: `/finance/loans`

Control de deudas **que debes** y **que te deben**:

- Pestañas **Debo** / **Me deben**.
- Estado del préstamo, montos pendientes y pagos/amortizaciones.
- Vincula transacciones para registrar abonos o cobros.

### 6.6 Cierre de caja

Ruta: `/finance/cash-closing`

Cuadre por **rango de fechas**:

- Totales de ingresos y egresos del periodo.
- Detalle agrupado útil para conciliar con extractos bancarios o caja física.
- Exportación asociada a reportes (Excel/PDF desde integraciones o endpoints de reporte).

Puedes llegar aquí desde el Dashboard con el periodo del mes ya precargado.

### 6.7 Integraciones

Ruta: `/finance/integrations`  
Requiere permisos de integraciones (`integrations:read`, `integrations:write` o `integrations:gmail_connect`).

Panel central para conectar AyniFlow con servicios externos:

| Integración | Para qué sirve |
|-------------|----------------|
| **Gmail** | Detectar pagos Yape/BCP en correos y convertirlos en transacciones. |
| **Google Sheets** | Sincronizar hoja de transacciones configurada. |
| **Webhook** | Recibir movimientos desde n8n u otros sistemas. |
| **OCR Gemini** | Mejorar lectura de vouchers en el modal de transacciones. |
| **Import legacy** | Cargar JSON de sistemas anteriores. |
| **Reportes Excel/PDF** | Descargar extractos filtrados. |

Cada bloque indica si está **Configurado** o **Pendiente**. Algunos toggles activan/desactivan funciones sin tocar código.

**Gmail — flujo típico:**

1. Conectar cuenta OAuth (botón en el panel Gmail).
2. Autorizar en Google.
3. Opcional: sincronización histórica o polling en tiempo real según configuración del servidor.

---

## 7. Administración de usuarios

Ruta: `/users`  
Requiere permiso `users:read`.

### 7.1 Listado

- Tabla/tarjetas con usuarios, email, roles y estado (activo/inactivo).
- KPIs: total, activos, inactivos y cantidad de roles.

### 7.2 Crear usuario

Botón **Nuevo usuario** (requiere `users:write`):

- Email, username, contraseña, nombre completo y rol inicial.
- Opción de autogenerar contraseña segura.

### 7.3 Editar usuario

- Cambiar nombre, rol y estado activo.
- Restablecer contraseña (manual o autogenerada).
- **No puedes desactivar tu propio usuario** mientras estás logueado.

### 7.4 Eliminar usuario

Acción irreversible; confirma en el diálogo. No puedes eliminarte a ti mismo.

### 7.5 Roles y permisos

Desde **Ver roles** (si tienes `roles:read`):

- Consulta qué permisos trae cada rol del sistema.
- Con `roles:write`, ajusta la matriz de permisos por rol.

Roles iniciales del sistema:

- `admin` — acceso total.
- `operator` — operación financiera y lectura de usuarios.
- `reader` — solo lectura.

---

## 8. Colores y significados

AyniFlow usa colores con significado fijo en finanzas:

| Color / badge | Significado |
|---------------|-------------|
| Verde (success) | Ingresos, en plan, saldo positivo, integración OK |
| Amarillo (warning) | Riesgo presupuestario, alertas |
| Rojo (danger) | Egresos, excedido, errores, cuenta inactiva |
| Olive / primary | Marca, acciones principales, roles |

Las barras de progreso en presupuestos y ahorros siguen la misma lógica para que puedas escanear el estado de un vistazo.

---

## 9. Notificaciones y tiempo real

Si tienes acceso a finanzas:

- La **campana** en la topbar muestra avisos recientes (webhooks, Gmail, eventos del sistema).
- El badge **En vivo** indica conexión WebSocket activa para actualizaciones sin recargar la página.

---

## 10. Preguntas frecuentes

### No veo el menú Finanzas

Tu usuario no tiene el permiso `finance:read`. Pide al administrador que revise tu rol.

### Subí mi foto pero no aparece

- Espera unos segundos y recarga la página.
- Verifica que la imagen sea JPG/PNG/WebP/GIF y pese menos de 2 MB.
- Si persiste, contacta soporte técnico (puede ser caché del navegador: prueba Ctrl+F5).

### Google Sign-In muestra error de redirect

Es configuración del servidor/Google Cloud. El administrador debe registrar la URL de callback correcta en la consola de Google.

### Cambié de rol y sigo sin ver módulos nuevos

Cierra sesión completamente y vuelve a iniciar. Los permisos se embeben en el token al login.

### ¿Los datos de ejemplo en producción son reales?

No. En producción (`DEBUG=false`) **no** se cargan transacciones de demostración. Solo catálogos base, roles y configuración estructural.

### ¿Puedo usar AyniFlow sin conexión?

Parcialmente. Como PWA instalada, la shell puede abrirse, pero las operaciones requieren conexión al servidor.

---

## 11. Glosario breve

| Término | Definición |
|---------|------------|
| **Transacción** | Movimiento financiero (ingreso o egreso) con monto, fecha y clasificación. |
| **Presupuesto** | Límite de gasto planificado por categoría en un mes. |
| **Cierre de caja** | Resumen cuantitativo de un periodo para conciliación. |
| **RBAC** | Control de acceso por roles (quién puede qué). |
| **Webhook** | Entrada automática de datos desde otro sistema vía HTTP. |
| **PWA** | Aplicación web instalable en el dispositivo. |
| **OCR** | Reconocimiento de texto en imágenes (vouchers). |

---

## 12. Soporte

- **Problemas de acceso o permisos** → administrador de AyniFlow en tu organización.
- **Errores técnicos o caídas del servicio** → responsable de infraestructura / despliegue.
- **Documentación técnica del proyecto** → carpeta `docs/` del repositorio y `README.md`.

---

*Última actualización: módulo de perfil con avatar, Google Sign-In, finanzas completas e integraciones.*
