type BrandIconSize = 'sm' | 'md'

interface BrandIconProps {
  size?: BrandIconSize
  className?: string
}

const SIZE_PX: Record<BrandIconSize, number> = {
  sm: 32,
  md: 36,
}

export function BrandIcon({ size = 'md', className = '' }: BrandIconProps) {
  const px = SIZE_PX[size]

  return (
    <span
      className={`brand-icon brand-icon--${size} ${className}`.trim()}
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      <span className="brand-icon__glow" />
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="brand-icon__svg"
      >
        <circle
          cx="20"
          cy="20"
          r="17"
          className="brand-icon__orbit"
          strokeWidth="1.5"
        />
        <circle cx="20" cy="20" r="14" className="brand-icon__disc" />
        <path
          d="M7.5 22.4C9.9 17.4 13.2 15.4 16.1 17.6C18.9 19.7 18.9 24.1 16.1 26.4C13.2 28.5 9.9 26.5 7.5 21.6"
          className="brand-icon__letter"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M32.5 17.6C30.1 12.6 26.8 10.6 23.9 12.8C21.1 14.9 21.1 19.3 23.9 21.6C26.8 23.7 30.1 21.7 32.5 16.8"
          className="brand-icon__letter"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M15.9 20.2H24.1" className="brand-icon__letter" strokeWidth="2.25" strokeLinecap="round" />
        <circle cx="8.3" cy="21.9" r="2" className="brand-icon__node" />
        <circle cx="31.7" cy="17.1" r="2" className="brand-icon__node" />
      </svg>
    </span>
  )
}
