import { httpClient } from '../../../../core/interceptors/httpClient'
import type {
  CreateUserPayload,
  LoginPayload,
  Role,
  TokenResponse,
  User,
} from '../../domain/models/auth.types'

export async function loginRequest(payload: LoginPayload): Promise<TokenResponse> {
  const { data } = await httpClient.post<TokenResponse>('/auth/login', payload)
  return data
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await httpClient.get<User>('/auth/me')
  return data
}

export async function fetchUsers(): Promise<User[]> {
  const { data } = await httpClient.get<User[]>('/users')
  return data
}

export async function createUserRequest(payload: CreateUserPayload): Promise<User> {
  const { data } = await httpClient.post<User>('/users', payload)
  return data
}

export async function fetchRoles(): Promise<Role[]> {
  const { data } = await httpClient.get<Role[]>('/roles')
  return data
}
