import axios from 'axios'

type ValidationDetail = {
  loc?: Array<string | number>
  msg?: string
}

function formatValidationDetails(details: ValidationDetail[]): string {
  const labels: Record<string, string> = {
    email: 'Email',
    username: 'Usuario',
    password: 'Contraseña',
    role_slug: 'Rol',
    full_name: 'Nombre completo',
  }

  return details
    .map((item) => {
      const loc = (item.loc ?? []).filter((part) => !['body', 'query', 'path'].includes(String(part)))
      const field = labels[String(loc.at(-1) ?? '')] ?? String(loc.at(-1) ?? 'Campo')
      const msg = item.msg ?? 'Valor inválido'
      if (/email address|valid email/i.test(msg)) {
        return `${field}: ingresa un correo válido (ej. usuario@empresa.com).`
      }
      if (/at least 8 characters/i.test(msg)) {
        return `${field}: debe tener al menos 8 caracteres.`
      }
      if (/at least 3 characters/i.test(msg)) {
        return `${field}: debe tener al menos 3 caracteres.`
      }
      return `${field}: ${msg}`
    })
    .join(' ')
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const data = error.response?.data as
    | { message?: string; details?: ValidationDetail[] }
    | undefined

  if (Array.isArray(data?.details) && data.details.length > 0) {
    return formatValidationDetails(data.details)
  }

  const message = data?.message
  if (typeof message === 'string' && message.trim()) {
    return message
  }

  return fallback
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateUserEmail(email: string): string | null {
  const value = email.trim()
  if (!value) return 'El email es obligatorio.'
  if (!EMAIL_PATTERN.test(value)) {
    return 'Ingresa un correo válido (ej. usuario@empresa.com).'
  }
  return null
}

export function validateUserPassword(password: string, confirmPassword: string): string | null {
  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.'
  }
  if (password !== confirmPassword) {
    return 'Las contraseñas no coinciden.'
  }
  return null
}
