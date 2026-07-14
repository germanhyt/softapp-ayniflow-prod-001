import axios from 'axios'

import { API_BASE_URL } from '../constants/app'
import { clearAccessToken, getAccessToken } from '../sessions/authStorage'

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  },
})

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Avoid reused SPA HTML cached on shared /users|/roles|/permissions URLs.
  config.headers.Accept = 'application/json'
  config.headers['Cache-Control'] = 'no-cache'
  return config
})

httpClient.interceptors.response.use(
  (response) => {
    const contentType = String(response.headers['content-type'] ?? '')
    if (contentType.includes('text/html')) {
      return Promise.reject(
        new Error('La API devolvió HTML en lugar de JSON (posible caché SPA en la misma ruta).'),
      )
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      clearAccessToken()
    }
    return Promise.reject(error)
  },
)
