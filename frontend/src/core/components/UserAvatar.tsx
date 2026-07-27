import { resolveMediaUrl, profileInitials } from '../utils/mediaUrl'

interface UserAvatarProps {
  fullName?: string | null
  username?: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE_CLASS = {
  sm: 'user-avatar--sm',
  md: 'user-avatar--md',
  lg: 'user-avatar--lg',
  xl: 'user-avatar--xl',
} as const

export function UserAvatar({
  fullName,
  username,
  avatarUrl,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const src = resolveMediaUrl(avatarUrl)
  const initials = profileInitials(fullName, username)

  return (
    <span
      className={`user-avatar ${SIZE_CLASS[size]} ${className}`.trim()}
      aria-hidden={Boolean(src)}
    >
      {src ? (
        <img src={src} alt="" className="user-avatar__image" loading="lazy" />
      ) : (
        <span className="user-avatar__initials">{initials}</span>
      )}
    </span>
  )
}
