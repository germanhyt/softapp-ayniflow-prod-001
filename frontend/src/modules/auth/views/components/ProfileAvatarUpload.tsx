import { Camera, ImagePlus, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'

import { UserAvatar } from '../../../../core/components/UserAvatar'
import { alertSuccess, confirmAction } from '../../../../core/utils/alerts'
import { getApiErrorMessage } from '../../../../core/utils/apiError'
import { resolveMediaUrl } from '../../../../core/utils/mediaUrl'
import { useRemoveAvatar, useUploadAvatar } from '../../application/hooks/useAuth'
import type { User } from '../../domain/models/auth.types'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
const MAX_MB = 2

interface ProfileAvatarUploadProps {
  user: User
}

export function ProfileAvatarUpload({ user }: ProfileAvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAvatar = useUploadAvatar()
  const removeAvatar = useRemoveAvatar()
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [cacheBust, setCacheBust] = useState<number>(Date.now())
  const [error, setError] = useState<string | null>(null)

  const avatarSrc = previewUrl ?? resolveMediaUrl(user.avatar_url)
  const displaySrc = avatarSrc ? `${avatarSrc}${avatarSrc.includes('?') ? '&' : '?'}v=${cacheBust}` : null
  const isBusy = uploadAvatar.isPending || removeAvatar.isPending

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Selecciona un archivo de imagen.'
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      return `La imagen no debe superar ${MAX_MB} MB.`
    }
    return null
  }

  const processFile = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    try {
      await uploadAvatar.mutateAsync(file)
      setCacheBust(Date.now())
      await alertSuccess('Foto actualizada', 'Tu imagen de perfil se guardó correctamente.')
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError, 'No se pudo subir la imagen.'))
    } finally {
      URL.revokeObjectURL(objectUrl)
      setPreviewUrl(null)
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    await processFile(file)
  }

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragActive(false)
    const file = event.dataTransfer.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const handleRemove = async () => {
    const confirmed = await confirmAction(
      'Quitar foto de perfil',
      'Volverás a ver tus iniciales en lugar de la imagen.',
    )
    if (!confirmed) return

    setError(null)
    try {
      await removeAvatar.mutateAsync()
      setCacheBust(Date.now())
      await alertSuccess('Foto eliminada', 'Se restauraron las iniciales de tu perfil.')
    } catch (removeError) {
      setError(getApiErrorMessage(removeError, 'No se pudo eliminar la imagen.'))
    }
  }

  return (
    <div className="profile-avatar-panel">
      <div
        className={`profile-avatar-dropzone${dragActive ? ' profile-avatar-dropzone--active' : ''}${
          isBusy ? ' profile-avatar-dropzone--busy' : ''
        }`}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setDragActive(false)
        }}
        onDrop={handleDrop}
      >
        {displaySrc ? (
          <img src={displaySrc} alt="Foto de perfil" className="profile-avatar-dropzone__preview" />
        ) : (
          <UserAvatar
            fullName={user.full_name}
            username={user.username}
            avatarUrl={user.avatar_url}
            size="xl"
          />
        )}

        <div className="profile-avatar-dropzone__overlay">
          <ImagePlus size={22} />
          <span>{isBusy ? 'Procesando…' : 'Arrastra o elige una foto'}</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="profile-avatar-panel__actions">
        <button
          type="button"
          className="btn-primary inline-flex flex-1 items-center justify-center gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
        >
          <Upload size={16} />
          {user.avatar_url ? 'Cambiar foto' : 'Subir foto'}
        </button>
        {user.avatar_url ? (
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2"
            onClick={handleRemove}
            disabled={isBusy}
            title="Quitar foto"
          >
            <Trash2 size={16} />
          </button>
        ) : null}
      </div>

      <p className="profile-avatar-panel__hint">
        <Camera size={14} className="inline-block align-[-2px]" /> JPG, PNG, WebP o GIF · máx. {MAX_MB} MB
      </p>

      {error ? <p className="alert-error">{error}</p> : null}
    </div>
  )
}
