import { useState } from 'react'
import { Button, Card, Chips, EmptyState, Select, Sheet } from '../../components/ui/kit'
import { DetailRow, SearchBox } from '../admin/parts'
import { DepositStatusPill } from '../operator/common'
import { formatKg, timeOf } from '../operator/helpers'
import { useT } from '../../store/appStore'
import type { Deposit, Temple } from '../../store/types'
import { formatNumber, maskMobile } from '../../utils/points'
import {
  dateTimeLabel,
  filterDeposits,
  groupByDay,
  historyTotals,
  type Period,
  type StatusFilter,
} from './historyHelpers'

const PAGE = 20

type DepositHistoryProps = {
  deposits: Deposit[]
  // Admin passes temples to filter by collection point and show it on each row.
  temples?: Temple[]
  templeNames?: Temple[]
  maskMobiles?: boolean
  emptyText: string
  initialPeriod?: Period
}

const DepositHistory = ({
  deposits,
  temples,
  templeNames = [],
  maskMobiles = false,
  emptyText,
  initialPeriod = '7',
}: DepositHistoryProps) => {
  const t = useT()
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')
  const [templeId, setTempleId] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [viewing, setViewing] = useState<Deposit | null>(null)

  const allTemples = temples ?? templeNames
  const templeName = (id: string) =>
    allTemples.find((temple) => temple.id === id)?.name ?? ''
  const showMobile = (mobile: string) => (maskMobiles ? maskMobile(mobile) : mobile)

  const filtered = filterDeposits(deposits, { period, status, query, templeId })
  const totals = historyTotals(filtered)
  const groups = groupByDay(filtered.slice(0, shown))

  const change = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setShown(PAGE)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBox
          value={query}
          onChange={change(setQuery)}
          placeholder={t('Search name, mobile or ID')}
        />
        {temples && (
          <Select
            aria-label={t('Collection point')}
            value={templeId}
            onChange={(event) => change(setTempleId)(event.target.value)}
            className="sm:max-w-72"
          >
            <option value="">{t('All collection points')}</option>
            {temples.map((temple) => (
              <option key={temple.id} value={temple.id}>
                {temple.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      <Chips<Period>
        label={t('Period')}
        value={period}
        onChange={change(setPeriod)}
        options={[
          { value: 'today', label: t('Today') },
          { value: '7', label: t('Last 7 days') },
          { value: '30', label: t('Last 30 days') },
          { value: 'all', label: t('All') },
        ]}
      />
      <Chips<StatusFilter>
        label={t('Status')}
        value={status}
        onChange={change(setStatus)}
        options={[
          { value: 'all', label: t('All') },
          { value: 'accepted', label: t('Accepted') },
          { value: 'held', label: t('Held') },
          { value: 'rejected', label: t('Rejected') },
          { value: 'queued', label: t('Queued') },
        ]}
      />

      <div className="grid grid-cols-3 gap-3">
        <Card className="!p-4">
          <p className="text-sm text-muted">{t('Deposits')}</p>
          <p className="font-display text-2xl leading-tight sm:text-3xl">
            {formatNumber(totals.count)}
          </p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-muted">{t('Accepted weight')}</p>
          <p className="font-display text-2xl leading-tight text-tulsi sm:text-3xl">
            {formatKg(Math.round(totals.kg * 100) / 100)}
          </p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-muted">{t('Points given')}</p>
          <p className="font-display text-2xl leading-tight text-marigold sm:text-3xl">
            {formatNumber(totals.points)}
          </p>
        </Card>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={deposits.length === 0 ? emptyText : t('No deposits match these filters')} />
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => {
            const dayTotals = historyTotals(group.items)
            return (
              <section key={group.label} aria-label={t(group.label)}>
                <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
                  <h2 className="font-semibold">{t(group.label)}</h2>
                  <span className="text-sm text-muted">
                    {dayTotals.count === 1
                      ? t('1 deposit')
                      : t('{count} deposits', { count: dayTotals.count })}{' '}
                    ·{' '}
                    {formatKg(Math.round(dayTotals.kg * 100) / 100)}
                  </span>
                </div>
                <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
                  {group.items.map((deposit) => (
                    <li key={deposit.id} className="border-b border-line last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setViewing(deposit)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-raised"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {deposit.name} · {t(deposit.waste)}
                          </span>
                          <span className="block truncate text-sm text-muted">
                            {timeOf(deposit.at)} · {formatKg(deposit.kg)} · {deposit.id}
                            {temples && ` · ${templeName(deposit.templeId)}`}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <DepositStatusPill status={deposit.status} synced={deposit.synced} />
                          <span
                            className={`text-sm font-semibold ${
                              deposit.points > 0 ? 'text-marigold' : 'text-muted'
                            }`}
                          >
                            {deposit.points > 0 ? `+${formatNumber(deposit.points)}` : '0'}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
          {filtered.length > shown && (
            <Button variant="secondary" onClick={() => setShown(shown + PAGE)}>
              {t('Show more ({count} left)', { count: filtered.length - shown })}
            </Button>
          )}
        </div>
      )}

      <Sheet
        open={viewing !== null}
        title={viewing ? t('Deposit {id}', { id: viewing.id }) : ''}
        onClose={() => setViewing(null)}
      >
        {viewing && (
          <div className="flex flex-col">
            <DetailRow label={t('Status')}>
              <DepositStatusPill status={viewing.status} synced={viewing.synced} />
            </DetailRow>
            <DetailRow label={t('Date and time')}>{dateTimeLabel(viewing.at)}</DetailRow>
            <DetailRow label={t('Devotee')}>{viewing.name}</DetailRow>
            <DetailRow label={t('Mobile number')}>{showMobile(viewing.mobile)}</DetailRow>
            <DetailRow label={t('Collection point')}>{templeName(viewing.templeId)}</DetailRow>
            <DetailRow label={t('Waste type')}>{t(viewing.waste)}</DetailRow>
            <DetailRow label={t('Weight')}>{formatKg(viewing.kg)}</DetailRow>
            <DetailRow label={t('Points')}>{formatNumber(viewing.points)}</DetailRow>
            {viewing.charge > 0 && (
              <DetailRow label={t('Charge')}>₹{viewing.charge}</DetailRow>
            )}
            {viewing.reason && (
              <DetailRow label={t('Reason')}>{t(viewing.reason)}</DetailRow>
            )}
            {viewing.note && <DetailRow label={t('Note')}>{viewing.note}</DetailRow>}
            <DetailRow label={t('Sync')}>
              {viewing.synced
                ? viewing.conflict
                  ? t('Synced, sent for review')
                  : t('Synced')
                : t('Waiting to sync')}
            </DetailRow>
          </div>
        )}
      </Sheet>
    </div>
  )
}

export default DepositHistory
