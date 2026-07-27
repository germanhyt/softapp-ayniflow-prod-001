import { httpClient } from '../../../../core/interceptors/httpClient'

export const GOOGLE_AUTH_MESSAGE_TYPE = 'google-auth-result'

export type GoogleAuthResultMessage = {
  type: typeof GOOGLE_AUTH_MESSAGE_TYPE
  status: 'success' | 'error'
  access_token?: string | null
  reason?: string | null
}

export function isGoogleAuthResultMessage(data: unknown): data is GoogleAuthResultMessage {
  if (!data || typeof data !== 'object') return false
  const message = data as Partial<GoogleAuthResultMessage>
  return (
    message.type === GOOGLE_AUTH_MESSAGE_TYPE &&
    (message.status === 'success' || message.status === 'error')
  )
}

export async function fetchGoogleAuthStatus(): Promise<{ configured: boolean; redirect_uri: string }> {
  const { data } = await httpClient.get<{ configured: boolean; redirect_uri: string }>(
    '/auth/google/status',
  )
  return data
}

export async function startGoogleAuthOAuth(): Promise<string> {
  const { data } = await httpClient.get<{ authorization_url: string }>('/auth/google/oauth/start')
  return data.authorization_url
}
