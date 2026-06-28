import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'

import {
  useMarkAllNotificationsRead,
  useNotifications,
} from '../../modules/finance/application/hooks/useFinance'
import { formatRegisteredAt } from '../utils/datetime'

const SOUND_STORAGE_KEY = 'ayniflow-notifications-sound-enabled'
const LEGACY_SOUND_STORAGE_KEY = 'germanhyt-notifications-sound-enabled'

async function playNotificationSound(audioContext: AudioContext) {
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  const startTime = audioContext.currentTime
  const masterGain = audioContext.createGain()
  masterGain.gain.setValueAtTime(0.0001, startTime)
  masterGain.gain.exponentialRampToValueAtTime(0.5, startTime + 0.02)
  masterGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.9)
  masterGain.connect(audioContext.destination)

  ;[1046.5, 1318.5].forEach((freq, index) => {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(freq, startTime)
    gainNode.gain.setValueAtTime(0.0001, startTime)
    gainNode.gain.exponentialRampToValueAtTime(0.5 - index * 0.15, startTime + 0.015)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.9)
    oscillator.connect(gainNode)
    gainNode.connect(masterGain)
    oscillator.start(startTime)
    oscillator.stop(startTime + 0.9)
  })
}

export function NotificationBell() {
  const { data } = useNotifications(20)
  const markAllRead = useMarkAllNotificationsRead()
  const [isOpen, setIsOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isVibrating, setIsVibrating] = useState(false)
  const knownIdsRef = useRef<Set<number>>(new Set())
  const initializedRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const items = data?.items ?? []
  const unreadCount = data?.unread_count ?? 0

  useEffect(() => {
    const saved = window.localStorage.getItem(SOUND_STORAGE_KEY)
    const legacy = window.localStorage.getItem(LEGACY_SOUND_STORAGE_KEY)
    const effective = saved ?? legacy
    if (effective === 'false') setSoundEnabled(false)
    if (!saved && legacy) {
      window.localStorage.setItem(SOUND_STORAGE_KEY, legacy)
      window.localStorage.removeItem(LEGACY_SOUND_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    const unlock = async () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new window.AudioContext()
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume().catch(() => undefined)
      }
    }
    const events: Array<keyof WindowEventMap> = ['click', 'keydown', 'touchstart']
    events.forEach((event) => window.addEventListener(event, unlock, { passive: true }))
    return () => {
      events.forEach((event) => window.removeEventListener(event, unlock))
      audioContextRef.current?.close().catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    if (!items.length) return

    if (!initializedRef.current) {
      items.forEach((item) => knownIdsRef.current.add(item.id))
      initializedRef.current = true
      return
    }

    const newUnread = items.filter((item) => !item.is_read && !knownIdsRef.current.has(item.id))
    if (newUnread.length && soundEnabled && audioContextRef.current) {
      void playNotificationSound(audioContextRef.current).catch(() => undefined)
      setIsVibrating(true)
      window.setTimeout(() => setIsVibrating(false), 900)
      if ('vibrate' in navigator) navigator.vibrate([120, 70, 120])
    }

    items.forEach((item) => knownIdsRef.current.add(item.id))
  }, [items, soundEnabled])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleToggle = async () => {
    const next = !isOpen
    setIsOpen(next)
    if (next && unreadCount > 0) {
      await markAllRead.mutateAsync()
    }
  }

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev
      window.localStorage.setItem(SOUND_STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <div ref={containerRef} className="notifications-bell" aria-live="polite">
      <button
        type="button"
        className={`btn-icon notifications-bell-button${isVibrating ? ' vibrating' : ''}`}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-label="Notificaciones"
        title="Notificaciones"
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="notifications-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <section className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notificaciones</h3>
            <button type="button" className="sound-toggle" onClick={toggleSound}>
              {soundEnabled ? 'Sonido ON' : 'Sonido OFF'}
            </button>
          </div>

          {items.length === 0 ? (
            <p className="notifications-empty">Sin notificaciones recientes.</p>
          ) : (
            <ul className="notifications-list">
              {items.map((item) => (
                <li key={item.id} className={`notification-item${item.is_read ? '' : ' unread'}`}>
                  <div className="notification-main">
                    <strong>{item.title}</strong>
                    <span className="notification-meta">
                      {item.created_at ? formatRegisteredAt(item.created_at) : ''}
                    </span>
                  </div>
                  <p className="notification-message">{item.message}</p>
                  {item.operation_number && (
                    <span className="notification-op">Op. {item.operation_number}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
