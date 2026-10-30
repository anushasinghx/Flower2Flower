import { useT } from '../../store/appStore'
import type { LedgerEntry } from '../../store/types'
import { formatNumber } from '../../utils/points'

const LedgerAmount = ({ entry }: { entry: LedgerEntry }) => {
  const t = useT()

  if (entry.kind === 'held') {
    return (
      <span className="font-semibold text-sindoor">
        {t('{count} held', { count: formatNumber(entry.points) })}
      </span>
    )
  }
  if (entry.kind === 'rejected') {
    return (
      <span className="rounded-full border border-line px-3 text-sm text-muted">
        0
      </span>
    )
  }
  if (entry.points < 0) {
    return (
      <span className="text-lg font-semibold text-muted">
        −{formatNumber(Math.abs(entry.points))}
      </span>
    )
  }
  return (
    <span className="text-lg font-semibold text-marigold">
      +{formatNumber(entry.points)}
    </span>
  )
}

const LedgerRow = ({ entry }: { entry: LedgerEntry }) => {
  const t = useT()
  const title = entry.title.replace('Order #', `${t('Order')} #`)

  return (
    <li className="flex items-start justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-lg leading-snug">
          {t(entry.when)} · {t(title)}
        </p>
        <p className="text-muted">{t(entry.detail)}</p>
      </div>
      <LedgerAmount entry={entry} />
    </li>
  )
}

export default LedgerRow
