import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../ui/Icon'
import { useT } from '../../store/appStore'

type ScreenHeaderProps = {
  title: string
  backTo?: string
  right?: ReactNode
}

const ScreenHeader = ({ title, backTo, right }: ScreenHeaderProps) => {
  const navigate = useNavigate()
  const t = useT()

  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {backTo && (
          <button
            type="button"
            onClick={() => navigate(backTo)}
            aria-label={t('Back')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-ink hover:bg-surface"
          >
            <Icon name="back" size={20} />
          </button>
        )}
        <h1 className="min-w-0 font-display text-3xl leading-tight md:text-4xl">
          {title}
        </h1>
      </div>
      {right}
    </div>
  )
}

export default ScreenHeader
