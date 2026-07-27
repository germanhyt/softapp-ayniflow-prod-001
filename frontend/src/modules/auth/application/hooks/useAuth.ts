import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { clearAccessToken, setAccessToken } from '../../../../core/sessions/authStorage'
import type {
  ChangeOwnPasswordPayload,
  CreateUserPayload,
  LoginPayload,
  Permission,
  Role,
  UpdateProfilePayload,
  UpdateRolePermissionsPayload,
  UpdateUserPasswordPayload,
  UpdateUserPayload,
  User,
  UserStats,
} from '../../domain/models/auth.types'
import {
  changeOwnPasswordRequest,
  createUserRequest,
  deleteUserRequest,
  fetchCurrentUser,
  fetchPermissions,
  fetchRoles,
  fetchUserStats,
  fetchUsers,
  loginRequest,
  removeAvatarRequest,
  updateProfileRequest,
  updateRolePermissionsRequest,
  updateUserPasswordRequest,
  updateUserRequest,
  uploadAvatarRequest,
} from '../../infrastructure/repository/authRepository'

export function useCurrentUser(enabled = true) {
  return useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    enabled,
    retry: false,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LoginPayload) => loginRequest(payload),
    onSuccess: (data) => {
      setAccessToken(data.access_token)
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return () => {
    clearAccessToken()
    queryClient.clear()
  }
}

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })
}

export function useUserStats(enabled = true) {
  return useQuery<UserStats>({
    queryKey: ['users', 'stats'],
    queryFn: fetchUserStats,
    enabled,
    staleTime: 60_000,
  })
}

export function useRoles(enabled = true) {
  return useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    enabled,
  })
}

export function usePermissions(enabled = true) {
  return useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: fetchPermissions,
    enabled,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUserRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: UpdateUserPayload }) =>
      updateUserRequest(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfileRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })
}

export function useChangeOwnPassword() {
  return useMutation({
    mutationFn: (payload: ChangeOwnPasswordPayload) => changeOwnPasswordRequest(payload),
  })
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadAvatarRequest(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => removeAvatarRequest(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })
}

export function useUpdateUserPassword() {
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: UpdateUserPasswordPayload }) =>
      updateUserPasswordRequest(userId, payload),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => deleteUserRequest(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      roleId,
      payload,
    }: {
      roleId: number
      payload: UpdateRolePermissionsPayload
    }) => updateRolePermissionsRequest(roleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function hasPermission(user: { permissions: string[] } | undefined, code: string): boolean {
  return Boolean(user?.permissions.includes(code))
}

export function hasAnyPermission(
  user: { permissions: string[] } | undefined,
  codes: string[],
): boolean {
  return codes.some((code) => hasPermission(user, code))
}

export function isAdmin(user: { roles: { slug: string }[] } | undefined): boolean {
  return Boolean(user?.roles.some((role) => role.slug === 'admin'))
}
