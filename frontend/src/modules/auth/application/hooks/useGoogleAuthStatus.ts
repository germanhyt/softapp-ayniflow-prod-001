import { useQuery } from '@tanstack/react-query'

import { fetchGoogleAuthStatus } from '../../infrastructure/repository/googleAuthRepository'

export function useGoogleAuthStatus() {
  return useQuery({
    queryKey: ['auth', 'google', 'status'],
    queryFn: fetchGoogleAuthStatus,
    staleTime: 60_000,
  })
}
