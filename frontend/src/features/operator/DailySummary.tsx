import { Link } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import { Button, Card, EmptyState, InfoNote } from '../../components/ui/kit'
import { DepositStatusPill } from './common'
import { formatKg, timeOf } from './helpers'
import { useStore, useT } from '../../store/appStore'
import { closeDay, isToday } from '../../store/fieldActions'
import { todayLabel } from '../../utils/points'

const DailySummary = () => {
  const { state, run, toast } = useStore()
  const t = useT()
  const { templeId } = state.operator
  const temple = state.temples.find((item) => item.id === templeId)
  const today = state.deposits
    .filter((deposit) => deposit.templeId === templeId && isToday(deposit.at))
    .sort((a, b) => b.at.localeCompare(a.at))
  const counted = today.filter((deposit) => deposit.status !== 'rejected')
  const totalKg = counted.reduce((sum, deposit) => sum + deposit.kg, 0)
  const rejected = today.length - counted.length
  const pending = state.deposits.filter((deposit) => !deposit.synced).length
  const closedToday = state.closedCollections.find(
    (item) => item.source === temple?.name && item.date === todayLabel(),
  )

  const byType = Object.entries(
    counted.reduce<Record<string, number>>((totals, deposit) => {
      totals[deposit.waste] = (totals[deposit.waste] ?? 0) + deposit.kg
      return totals
    }, {}),
  ).sort((a, b) => b[1] - a[1])
  const largest = Math.max(1, ...byType.map(([, kg]) => kg))

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <ScreenHeader
        title={t('Daily summary')}
        backTo="/operator"
        right={<span className="text-muted">{todayLabel()}</span>}
      />

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-sm text-muted">{t('Deposits')}</p>
          <p className="font-display text-4xl leading-tight">{today.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">{t('Total weight')}</p>
          <p className="font-display text-4xl leading-tight">{formatKg(totalKg)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">{t('Accepted')}</p>
          <p className="font-display text-4xl leading-tight text-tulsi">
            {counted.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted">{t('Rejected')}</p>
          <p className="font-display text-4xl leading-tight text-sindoor">{rejected}</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-bold">{t('By waste type')}</h2>
        {byType.length === 0 ? (
          <p className="text-muted">{t('No accepted deposits yet today.')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {byType.map(([waste, kg]) => (
              <li key={waste} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3">
                <span className="truncate">{t(waste)}</span>
                <span className="h-3 overflow-hidden rounded-full bg-raised">
                  <span
                    className="block h-full rounded-full bg-marigold"
                    style={{ width: `${(kg / largest) * 100}%` }}
                  />
                </span>
                <span className="text-right text-sm">{formatKg(kg)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">{t('Latest deposits')}</h2>
          <Link to="/operator/history" className="text-sm font-semibold text-marigold hover:underline">
            {t('See all history')}
          </Link>
        </div>
        {today.length === 0 ? (
          <EmptyState title={t('No deposits yet today')} />
        ) : (
          <ul>
            {today.slice(0, 8).map((deposit) => (
              <li
                key={deposit.id}
                className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0"
              >
                <span className="min-w-0">
                  <span className="block truncate">
                    {deposit.name} · {t(deposit.waste)}
                  </span>
                  <span className="text-sm text-muted">
                    {timeOf(deposit.at)} · {formatKg(deposit.kg)}
                  </span>
                </span>
                <DepositStatusPill status={deposit.status} synced={deposit.synced} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Link
        to="/operator/sync"
        className="flex items-center justify-between rounded-3xl border border-line bg-surface p-5 hover:border-muted"
      >
        <span className="text-muted">{t('Pending sync')}</span>
        <span className="font-display text-3xl">{pending}</span>
      </Link>

      <Card className="flex flex-col gap-3">
        <p className="font-semibold">{t('Close the day')}</p>
        <p className="text-sm text-muted">
          {closedToday
            ? t('Closed today with {kg}. The nursery can add it to a batch.', {
                kg: formatKg(closedToday.kg),
              })
            : t('Closing sends today’s accepted weight to the nursery for a processing batch.')}
        </p>
        <Button
          full
          variant={closedToday ? 'secondary' : 'primary'}
          disabled={pending > 0 || counted.length === 0}
          onClick={() => {
            run(closeDay)
            toast(t('Day closed. The nursery can now add it to a batch.'))
          }}
        >
          {closedToday ? t('Update the closed day') : t('Close day and send to nursery')}
        </Button>
        {pending > 0 && (
          <p className="text-sm text-marigold">
            {t('Sync queued deposits before closing the day.')}
          </p>
        )}
      </Card>

      <InfoNote>
        {t('Daily collection summary for the operator: deposits, weight, accepted and rejected.')}
      </InfoNote>
    </div>
  )
}

export default DailySummary
