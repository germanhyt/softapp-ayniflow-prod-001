import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { getFinanceWsUrl } from '../../../../core/constants/app'
import { getAccessToken, isAuthenticated } from '../../../../core/sessions/authStorage'
import { hasPermission, useCurrentUser } from '../../../auth/application/hooks/useAuth'
import type { FinanceFilters } from '../../domain/models/finance.types'
import type { FinanceWsMessage } from './financeSocket.types'
import { normalizeTransactionFilters, transactionQueryKey } from './transactionFilters'

interface FinanceSocketContextValue {
  connected: boolean
  connecting: boolean
  subscribeTransactions: (filters: FinanceFilters) => void
}

const FinanceSocketContext = createContext<FinanceSocketContextValue>({
  connected: false,
  connecting: false,
  subscribeTransactions: () => undefined,
})

const RECONNECT_BASE_MS = 1500
const RECONNECT_MAX_MS = 30000
const PING_INTERVAL_MS = 25000

export function FinanceSocketProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser(isAuthenticated())
  const canUseFinance = hasPermission(user, 'finance:read')

  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const pingTimerRef = useRef<number | null>(null)
  const reconnectAttemptRef = useRef(0)
  const intentionalCloseRef = useRef(false)
  const pendingSubscribeRef = useRef<FinanceFilters | null>(null)
  const latestSubscribeRef = useRef<FinanceFilters | null>(null)

  const invalidateFinance = useCallback(
    (scope?: string) => {
      if (!scope || scope === 'all' || scope === 'transactions') {
        queryClient.invalidateQueries({ queryKey: ['finance', 'transactions'] })
      }
      if (!scope || scope === 'all' || scope === 'summary') {
        queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
        queryClient.invalidateQueries({ queryKey: ['finance', 'cash-closing'] })
      }
      if (!scope || scope === 'all') {
        queryClient.invalidateQueries({ queryKey: ['finance', 'savings'] })
        queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
        queryClient.invalidateQueries({ queryKey: ['finance', 'budgets'] })
      }
    },
    [queryClient],
  )

  const handleMessage = useCallback(
    (message: FinanceWsMessage) => {
      switch (message.type) {
        case 'connected':
          setConnected(true)
          setConnecting(false)
          if (pendingSubscribeRef.current) {
            socketRef.current?.send(
              JSON.stringify({
                type: 'transactions.subscribe',
                filters: pendingSubscribeRef.current,
              }),
            )
          }
          break
        case 'transactions.preload':
          queryClient.setQueryData(
            transactionQueryKey(message.filters),
            message.data,
          )
          break
        case 'transactions.changed':
          invalidateFinance('all')
          break
        case 'notifications.changed':
          queryClient.invalidateQueries({ queryKey: ['finance', 'notifications'] })
          break
        case 'webhook_events.changed':
          queryClient.invalidateQueries({ queryKey: ['finance', 'webhook-events'] })
          break
        case 'finance.invalidate':
          invalidateFinance(message.scope)
          break
        default:
          break
      }
    },
    [invalidateFinance, queryClient],
  )

  const subscribeTransactions = useCallback((filters: FinanceFilters) => {
    const normalized = normalizeTransactionFilters(filters)
    latestSubscribeRef.current = normalized
    pendingSubscribeRef.current = normalized

    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'transactions.subscribe', filters: normalized }))
    }
  }, [])

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (pingTimerRef.current !== null) {
      window.clearInterval(pingTimerRef.current)
      pingTimerRef.current = null
    }
  }, [])

  const disconnect = useCallback(() => {
    clearTimers()
    const socket = socketRef.current
    socketRef.current = null
    if (socket && socket.readyState <= WebSocket.OPEN) {
      intentionalCloseRef.current = true
      socket.close()
    }
    setConnected(false)
    setConnecting(false)
  }, [clearTimers])

  const connect = useCallback(() => {
    const token = getAccessToken()
    if (!token || !canUseFinance) {
      disconnect()
      return
    }

    setConnecting(true)
    setConnected(false)

    clearTimers()
    const existing = socketRef.current
    if (existing && existing.readyState <= WebSocket.OPEN) {
      intentionalCloseRef.current = true
      existing.close()
    }
    socketRef.current = null
    intentionalCloseRef.current = false

    const socket = new WebSocket(getFinanceWsUrl(token))
    socketRef.current = socket

    socket.onopen = () => {
      reconnectAttemptRef.current = 0
      pingTimerRef.current = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }))
        }
      }, PING_INTERVAL_MS)
    }

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as FinanceWsMessage
        handleMessage(payload)
      } catch {
        // Ignorar mensajes inválidos
      }
    }

    socket.onclose = () => {
      setConnected(false)
      clearTimers()
      socketRef.current = null

      if (intentionalCloseRef.current) {
        intentionalCloseRef.current = false
        setConnecting(false)
        return
      }

      if (!isAuthenticated() || !canUseFinance) {
        setConnecting(false)
        return
      }

      setConnecting(true)

      const delay = Math.min(
        RECONNECT_MAX_MS,
        RECONNECT_BASE_MS * 2 ** reconnectAttemptRef.current,
      )
      reconnectAttemptRef.current += 1
      reconnectTimerRef.current = window.setTimeout(connect, delay)
    }

    socket.onerror = () => {
      socket.close()
    }
  }, [canUseFinance, clearTimers, disconnect, handleMessage])

  useEffect(() => {
    if (canUseFinance) {
      connect()
    } else {
      disconnect()
    }
    return disconnect
  }, [canUseFinance, connect, disconnect])

  useEffect(() => {
    if (connected && latestSubscribeRef.current) {
      subscribeTransactions(latestSubscribeRef.current)
    }
  }, [connected, subscribeTransactions])

  const value = useMemo(
    () => ({ connected, connecting, subscribeTransactions }),
    [connected, connecting, subscribeTransactions],
  )

  return (
    <FinanceSocketContext.Provider value={value}>{children}</FinanceSocketContext.Provider>
  )
}

export function useFinanceSocket() {
  return useContext(FinanceSocketContext)
}
