import axios from 'axios'

import { API_BASE_URL } from '../constants/app'
import { clearAccessToken, getAccessToken } from '../sessions/authStorage'

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAccessToken()
    }
    return Promise.reject(error)
  },
)
