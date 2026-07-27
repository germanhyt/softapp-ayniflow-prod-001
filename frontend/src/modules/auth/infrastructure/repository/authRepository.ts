import { httpClient } from '../../../../core/interceptors/httpClient'
import { ensureArray } from '../../../../core/utils/collections'
import type {
  ChangeOwnPasswordPayload,
  CreateUserPayload,
  LoginPayload,
  MessageResponse,
  Permission,
  Role,
  TokenResponse,
  UpdateProfilePayload,
  UpdateRolePermissionsPayload,
  UpdateUserPasswordPayload,
  UpdateUserPasswordResponse,
  UpdateUserPayload,
  User,
  UserStats,
} from '../../domain/models/auth.types'

export async function loginRequest(payload: LoginPayload): Promise<TokenResponse> {
  const { data } = await httpClient.post<TokenResponse>('/auth/login', payload)
  return data
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await httpClient.get<User>('/auth/me')
  return data
}

export async function updateProfileRequest(payload: UpdateProfilePayload): Promise<User> {
  const { data } = await httpClient.patch<User>('/auth/me', payload)
  return data
}

export async function changeOwnPasswordRequest(payload: ChangeOwnPasswordPayload): Promise<MessageResponse> {
  const { data } = await httpClient.patch<MessageResponse>('/auth/me/password', payload)
  return data
}

export async function uploadAvatarRequest(file: File): Promise<User> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await httpClient.post<User>('/auth/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function removeAvatarRequest(): Promise<User> {
  const { data } = await httpClient.delete<User>('/auth/me/avatar')
  return data
}

export async function fetchUsers(): Promise<User[]> {
  const { data } = await httpClient.get<User[]>('/users')
  return ensureArray<User>(data)
}

export async function fetchUserStats(): Promise<UserStats> {
  const { data } = await httpClient.get<UserStats>('/users/stats')
  return data
}

export async function createUserRequest(payload: CreateUserPayload): Promise<User> {
  const { data } = await httpClient.post<User>('/users', payload)
  return data
}

export async function updateUserRequest(userId: number, payload: UpdateUserPayload): Promise<User> {
  const { data } = await httpClient.put<User>(`/users/${userId}`, payload)
  return data
}

export async function updateUserPasswordRequest(
  userId: number,
  payload: UpdateUserPasswordPayload,
): Promise<UpdateUserPasswordResponse> {
  const { data } = await httpClient.patch<UpdateUserPasswordResponse>(
    `/users/${userId}/password`,
    payload,
  )
  return data
}

export async function deleteUserRequest(userId: number): Promise<void> {
  await httpClient.delete(`/users/${userId}`)
}

export async function fetchRoles(): Promise<Role[]> {
  const { data } = await httpClient.get<Role[]>('/roles')
  return ensureArray<Role>(data)
}

export async function fetchPermissions(): Promise<Permission[]> {
  const { data } = await httpClient.get<Permission[]>('/permissions')
  return ensureArray<Permission>(data)
}

export async function updateRolePermissionsRequest(
  roleId: number,
  payload: UpdateRolePermissionsPayload,
): Promise<Role> {
  const { data } = await httpClient.put<Role>(`/roles/${roleId}/permissions`, payload)
  return data
}
