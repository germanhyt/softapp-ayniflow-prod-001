import { useEffect, useRef, useState } from 'react'

import { Modal } from './Modal'
import { ModalFormActions } from './FormField'
import { openOAuthPopup } from '../utils/openOAuthPopup'
import {
  isGoogleAuthResultMessage,
  startGoogleAuthOAuth,
} from '../../modules/auth/infrastructure/repository/googleAuthRepository'

interface GoogleOAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (accessToken: string) => void
  onError?: (message: string) => void
}

export function GoogleOAuthModal({ isOpen, onClose, onSuccess, onError }: GoogleOAuthModalProps) {
  const [phase, setPhase] = useState<'idle' | 'opening' | 'waiting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!isOpen) {
      startedRef.current = false
      setPhase('idle')
      setErrorMessage(null)
      return
    }

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (!isGoogleAuthResultMessage(event.data)) return

      if (event.data.status === 'success' && event.data.access_token) {
        onSuccess(event.data.access_token)
        onClose()
        return
      }

      const reason = event.data.reason || 'No se pudo completar el inicio de sesión con Google.'
      setPhase('error')
      setErrorMessage(reason)
      onError?.(reason)
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [isOpen, onClose, onError, onSuccess])

  useEffect(() => {
    if (!isOpen || startedRef.current) return
    startedRef.current = true

    const run = async () => {
      setPhase('opening')
      setErrorMessage(null)

      const popup = openOAuthPopup('google-auth')
      if (!popup) {
        const msg = 'El navegador bloqueó la ventana emergente. Permite popups e inténtalo de nuevo.'
        setPhase('error')
        setErrorMessage(msg)
        onError?.(msg)
        return
      }

      try {
        const url = await startGoogleAuthOAuth()
        popup.location.href = url
        setPhase('waiting')
      } catch {
        popup.close()
        const msg = 'Google Sign-In no está disponible. Verifica la configuración del servidor.'
        setPhase('error')
        setErrorMessage(msg)
        onError?.(msg)
      }
    }

    void run()
  }, [isOpen, onError])

  const handleRetry = () => {
    startedRef.current = false
    setPhase('idle')
    setErrorMessage(null)
    startedRef.current = true

    void (async () => {
      setPhase('opening')
      const popup = openOAuthPopup('google-auth')
      if (!popup) {
        setPhase('error')
        setErrorMessage('El navegador bloqueó la ventana emergente.')
        return
      }
      try {
        const url = await startGoogleAuthOAuth()
        popup.location.href = url
        setPhase('waiting')
      } catch {
        popup.close()
        setPhase('error')
        setErrorMessage('No se pudo iniciar la vinculación con Google.')
      }
    })()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Continuar con Google" size="md">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Se abrirá una ventana de Google para iniciar sesión o crear tu cuenta. No cierres este
          diálogo hasta completar el proceso.
        </p>

        {(phase === 'opening' || phase === 'waiting') && (
          <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: 'var(--premium-border)' }}>
            <div className="skeleton h-10 w-10 rounded-full" />
            <div className="skeleton h-4 w-full max-w-xs" />
            <div className="skeleton h-4 w-full max-w-sm" />
            <p className="text-sm text-muted">
              {phase === 'opening' ? 'Preparando vinculación…' : 'Esperando confirmación en Google…'}
            </p>
          </div>
        )}

        {phase === 'error' && errorMessage && (
          <p className="alert-error rounded-lg px-3 py-2 text-sm">{errorMessage}</p>
        )}

        <ModalFormActions>
          {phase === 'error' ? (
            <>
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancelar
              </button>
              <button type="button" onClick={handleRetry} className="btn-primary">
                Reintentar
              </button>
            </>
          ) : (
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
          )}
        </ModalFormActions>
      </div>
    </Modal>
  )
}
