export interface Permission {
  id: number
  code: string
  description: string | null
}

export interface Role {
  id: number
  slug: string
  name: string
  description: string | null
  permissions: Permission[]
}

export interface User {
  id: number
  email: string
  username: string
  full_name: string | null
  is_active: boolean
  roles: Role[]
  permissions: string[]
  created_at?: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface CreateUserPayload {
  email: string
  username: string
  password: string
  full_name?: string
  role_slugs: string[]
}
