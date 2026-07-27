import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: ReactNode
  children: React.ReactNode
  size?: 'md' | 'lg' | 'xl'
}

let openModalCount = 0
const escapeStack: Array<() => void> = []

export function Modal({ isOpen, onClose, title, subtitle, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return

    openModalCount += 1
    escapeStack.push(onClose)
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const top = escapeStack[escapeStack.length - 1]
      if (top !== onClose) return
      event.preventDefault()
      onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const index = escapeStack.lastIndexOf(onClose)
      if (index >= 0) escapeStack.splice(index, 1)
      openModalCount = Math.max(0, openModalCount - 1)
      if (openModalCount === 0) {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClass = {
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size]

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`modal-content ${sizeClass}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <div className="min-w-0 flex-1">
            <h2 id="modal-title" className="modal-header__title">
              {title}
            </h2>
            {subtitle ? <p className="modal-header__subtitle">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="btn-icon shrink-0" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
