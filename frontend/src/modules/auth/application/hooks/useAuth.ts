import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { clearAccessToken, setAccessToken } from '../../../../core/sessions/authStorage'
import type { CreateUserPayload, LoginPayload, Role, User } from '../../domain/models/auth.types'
import {
  createUserRequest,
  fetchCurrentUser,
  fetchRoles,
  fetchUsers,
  loginRequest,
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

export function useRoles(enabled = true) {
  return useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: fetchRoles,
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

export function hasPermission(user: { permissions: string[] } | undefined, code: string): boolean {
  return Boolean(user?.permissions.includes(code))
}
