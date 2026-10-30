type MarkVariant = 'color' | 'mono' | 'onSaffron'

type LogoMarkProps = {
  size?: number
  variant?: MarkVariant
  className?: string
}

const markColors = {
  color: { top: '#FF9933', side: '#D9731A', arc: '#FFFFFF' },
  mono: { top: '#FFFFFF', side: '#BDBDBD', arc: '#FFFFFF' },
  onSaffron: { top: '#1A1206', side: '#6F4515', arc: '#FFFFFF' },
}

export const LogoMark = ({
  size = 40,
  variant = 'color',
  className,
}: LogoMarkProps) => {
  const colors = markColors[variant]

  return (
    <svg
      width={size}
      height={size}
      viewBox="120 100 272 340"
      role="img"
      aria-label="Flower2Flower"
      className={className}
    >
      <path
        fill={colors.side}
        d="M157 176C181 180 206 192 226 212L256 294C200 292 152 240 157 176Z"
      />
      <path
        fill={colors.side}
        d="M355 176C331 180 306 192 286 212L256 294C312 292 360 240 355 176Z"
      />
      <path
        fill={colors.top}
        d="M256 115C236 140 218 175 218 211C218 245 236 275 256 294C276 275 294 245 294 211C294 175 276 140 256 115Z"
      />
      <path
        fill="none"
        stroke={colors.arc}
        strokeWidth="20"
        strokeLinecap="round"
        d="M147 313A109 109 0 0 0 365 308"
      />
      <path fill={colors.arc} d="M365 266L393 316H337Z" />
    </svg>
  )
}

type LogoLockupProps = {
  size?: 'sm' | 'md' | 'lg'
  subtitle?: string
  stacked?: boolean
}

const lockupSizes = {
  sm: { mark: 34, name: 'text-lg', sub: 'text-[0.7rem]' },
  md: { mark: 42, name: 'text-xl', sub: 'text-xs' },
  lg: { mark: 88, name: 'text-4xl', sub: 'text-sm' },
}

export const LogoLockup = ({
  size = 'md',
  subtitle = 'पुष्प वाटिका · Pushp Vatika',
  stacked = false,
}: LogoLockupProps) => {
  const sizes = lockupSizes[size]

  return (
    <span
      className={`inline-flex items-center ${
        stacked ? 'flex-col gap-3 text-center' : 'gap-2.5'
      }`}
    >
      <LogoMark size={sizes.mark} className="shrink-0" />
      <span className="flex flex-col leading-tight">
        <span
          className={`font-body ${sizes.name} font-extrabold tracking-tight text-white`}
        >
          Flower<span className="text-saffron">2</span>Flower
        </span>
        {subtitle && (
          <span className={`font-body ${sizes.sub} text-muted`}>{subtitle}</span>
        )}
      </span>
    </span>
  )
}
