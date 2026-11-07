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

const LedgerRow = ({
  entry,
  onSelect,
}: {
  entry: LedgerEntry
  onSelect?: (entry: LedgerEntry) => void
}) => {
  const t = useT()
  const title = entry.title.replace('Order #', `${t('Order')} #`)
  const body = (
    <>
      <div className="min-w-0">
        <p className="text-lg leading-snug">
          {t(entry.when)} · {t(title)}
        </p>
        <p className="text-muted">{t(entry.detail)}</p>
      </div>
      <LedgerAmount entry={entry} />
    </>
  )

  if (onSelect) {
    return (
      <li className="border-b border-line last:border-b-0">
        <button
          type="button"
          onClick={() => onSelect(entry)}
          className="-mx-2 flex w-[calc(100%+1rem)] items-start justify-between gap-4 rounded-2xl px-2 py-3 text-left hover:bg-surface"
        >
          {body}
        </button>
      </li>
    )
  }

  return (
    <li className="flex items-start justify-between gap-4 border-b border-line py-3 last:border-b-0">
      {body}
    </li>
  )
}

export { LedgerAmount }
export default LedgerRow
