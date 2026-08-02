/** Etiquetas en español para códigos de permiso (fallback si no hay description del API). */
const PERMISSION_LABELS: Record<string, string> = {
  'users:read': 'Ver usuarios',
  'users:write': 'Gestionar usuarios',
  'roles:read': 'Ver roles y permisos',
  'roles:write': 'Editar permisos de roles',
  'finance:read': 'Ver módulo financiero',
  'finance:write': 'Gestionar operaciones financieras',
  'integrations:read': 'Ver módulo de integraciones',
  'integrations:write': 'Gestionar configuración de integraciones',
  'integrations:gmail_connect': 'Vincular y desvincular correo Gmail',
}

export function permissionLabel(code: string, description?: string | null): string {
  const fromApi = description?.trim()
  if (fromApi) return fromApi
  return PERMISSION_LABELS[code] ?? code
}
