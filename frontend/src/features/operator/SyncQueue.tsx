import ScreenHeader from '../../components/Layout/ScreenHeader'
import { Button, Card, EmptyState, InfoNote, Pill } from '../../components/ui/kit'
import { DepositStatusPill } from './common'
import { formatKg, timeOf } from './helpers'
import { useStore, useT } from '../../store/appStore'
import { isToday, setOffline } from '../../store/fieldActions'

const SyncQueue = () => {
  const { state, run, toast } = useStore()
  const t = useT()
  const { offline, lastSync } = state.operator
  const queued = state.deposits
    .filter((deposit) => !deposit.synced)
    .sort((a, b) => a.at.localeCompare(b.at))
  const needsReview = state.deposits.filter(
    (deposit) => deposit.conflict && isToday(deposit.at),
  )

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <ScreenHeader
        title={t('Sync queue')}
        backTo="/operator"
        right={
          <Pill tone={offline ? 'warning' : 'green'}>
            {offline ? t('Offline') : t('Online')}
          </Pill>
        }
      />

      <Card className="flex flex-col gap-3">
        <p className="text-xl font-bold">
          {t('{count} deposits waiting', { count: queued.length })}
        </p>
        {offline ? (
          <p className="text-marigold">
            {t('Data is saved on this device. Do not clear browser data or log out.')}
          </p>
        ) : (
          <p className="text-muted">
            {queued.length > 0
              ? t('Syncing · {count} left', { count: queued.length })
              : lastSync
                ? t('All synced. Last sync {time}.', { time: lastSync })
                : t('All synced.')}
          </p>
        )}

        {queued.length === 0 ? (
          <EmptyState icon="check" title={t('Nothing waiting to sync')} />
        ) : (
          <ul>
            {queued.map((deposit) => (
              <li
                key={deposit.id}
                className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0"
              >
                <span className="min-w-0">
                  <span className="block">
                    #{deposit.id} ·{' '}
                    {deposit.status === 'rejected'
                      ? t('Rejected')
                      : `${t(deposit.waste)} ${formatKg(deposit.kg)}`}
                  </span>
                  <span className="text-sm text-muted">
                    {timeOf(deposit.at)} ·{' '}
                    {deposit.status === 'rejected'
                      ? t('reason saved')
                      : t('photo attached')}
                  </span>
                </span>
                <DepositStatusPill status={deposit.status} synced={false} />
              </li>
            ))}
          </ul>
        )}

        <Button
          full
          onClick={() => {
            if (offline) {
              run((current) => setOffline(current, false))
              toast(t('Back online. Syncing now.'))
            } else {
              toast(t('Everything is synced.'))
            }
          }}
        >
          {offline ? t('Reconnect and sync (demo)') : t('Sync now')}
        </Button>
        {!offline && (
          <Button
            variant="secondary"
            full
            onClick={() => run((current) => setOffline(current, true))}
          >
            {t('Work offline (demo)')}
          </Button>
        )}
      </Card>

      {needsReview.length > 0 && (
        <Card>
          <h2 className="mb-2 text-lg font-bold">{t('Needs review')}</h2>
          <ul>
            {needsReview.map((deposit) => (
              <li
                key={deposit.id}
                className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0"
              >
                <span>
                  #{deposit.id} · {deposit.name} · {formatKg(deposit.kg)}
                </span>
                <Pill tone="warning">{t('Needs review')}</Pill>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">
            {t('The devotee was flagged while you were offline. Points stay pending until an admin resolves the alert.')}
          </p>
        </Card>
      )}

      <InfoNote>
        {t('Auto sync runs when the connection returns. Each queued item keeps its original time.')}
      </InfoNote>
    </div>
  )
}

export default SyncQueue
