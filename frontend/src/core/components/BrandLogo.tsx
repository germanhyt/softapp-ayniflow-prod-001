import { Link } from 'react-router-dom'

import { BrandIcon } from './BrandIcon'

interface BrandLogoProps {
  compact?: boolean
  showText?: boolean
  centered?: boolean
}

export function BrandLogo({ compact = false, showText = true, centered = false }: BrandLogoProps) {
  const iconSize = compact ? 'sm' : 'md'

  return (
    <Link
      to="/dashboard"
      className={`brand-logo group ${centered ? 'justify-center' : ''} ${compact ? 'brand-logo--compact' : ''}`}
      aria-label="AyniFlow — ir al dashboard"
    >
      <BrandIcon size={iconSize} />
      <span className={`brand-wordmark transition-all duration-300 ${showText ? '' : 'brand-wordmark--hidden'}`}>
        Ayni<span className="text-premium-primary">Flow</span>
      </span>
    </Link>
  )
}
