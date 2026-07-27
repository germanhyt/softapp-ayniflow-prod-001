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
  google_linked?: boolean
  avatar_url?: string | null
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
  role_slug: string
}

export interface UpdateUserPayload {
  full_name?: string | null
  role_slug?: string
  is_active?: boolean
}

export interface UpdateUserPasswordPayload {
  password?: string
  auto_generate?: boolean
}

export interface UpdateUserPasswordResponse {
  message: string
  password: string
}

export interface UpdateProfilePayload {
  full_name?: string | null
}

export interface ChangeOwnPasswordPayload {
  current_password: string
  new_password: string
}

export interface MessageResponse {
  message: string
}

export interface UpdateRolePermissionsPayload {
  permission_codes: string[]
}

export interface UserStatsSummary {
  total: number
  active: number
  inactive: number
  google_linked: number
  manual: number
  registered_this_month: number
  registered_last_7_days: number
}

export interface RegistrationByDay {
  date: string
  count: number
}

export interface RoleCount {
  slug: string
  name: string
  count: number
}

export interface RecentUserStat {
  id: number
  username: string
  email: string
  role_name: string | null
  created_at: string | null
  google_linked: boolean
  is_active: boolean
}

export interface UserStats {
  summary: UserStatsSummary
  registrations_by_day: RegistrationByDay[]
  by_role: RoleCount[]
  recent_users: RecentUserStat[]
  generated_at: string
}
