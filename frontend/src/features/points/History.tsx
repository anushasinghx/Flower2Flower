import { useState } from 'react'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import {
  ButtonLink,
  Card,
  Chips,
  EmptyState,
  InfoNote,
  Progress,
  Sheet,
} from '../../components/ui/kit'
import { DetailRow } from '../admin/parts'
import { formatKg } from '../operator/helpers'
import LedgerRow, { LedgerAmount } from './LedgerRow'
import { useStore, useT } from '../../store/appStore'
import type { LedgerEntry, LedgerKind } from '../../store/types'
import {
  availablePoints,
  formatNumber,
  heldPoints,
  levelInfo,
} from '../../utils/points'

type Filter = 'all' | 'earned' | 'redeemed' | 'held' | 'rejected'

const filterKinds: Record<Exclude<Filter, 'all'>, LedgerKind[]> = {
  earned: ['earned', 'bonus', 'refund', 'released'],
  redeemed: ['redeemed'],
  held: ['held', 'removed'],
  rejected: ['rejected'],
}

const kindLabels: Record<LedgerKind, string> = {
  earned: 'Earned',
  bonus: 'Bonus',
  redeemed: 'Redeemed',
  refund: 'Refund',
  held: 'Held',
  released: 'Released',
  removed: 'Removed',
  rejected: 'Rejected',
}

const History = () => {
  const { state } = useStore()
  const t = useT()
  const [filter, setFilter] = useState<Filter>('all')
  const [viewing, setViewing] = useState<LedgerEntry | null>(null)
  const deposit = viewing?.depositId
    ? state.deposits.find((item) => item.id === viewing.depositId)
    : undefined
  const orderId = viewing?.title.match(/^Order #(\d+)/)?.[1]
  const order = orderId
    ? state.orders.find((item) => item.mine && item.id === Number(orderId))
    : undefined
  const level = levelInfo(state)
  const entries =
    filter === 'all'
      ? state.ledger
      : state.ledger.filter((entry) => filterKinds[filter].includes(entry.kind))

  return (
    <div>
      <ScreenHeader title={t('My points')} />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr] lg:items-start">
        <div className="flex flex-col gap-4">
          <Card className="md:p-7">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted">{t('Available')}</p>
                <p className="font-display text-5xl leading-tight text-marigold">
                  {formatNumber(availablePoints(state))}
                </p>
              </div>
              <div>
                <p className="text-muted">{t('Held')}</p>
                <p className="font-display text-5xl leading-tight">
                  {formatNumber(heldPoints(state))}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 text-sm">
              <p className="font-medium">
                {t('Level {number}', { number: level.number })} ·{' '}
                {t(level.current.name)} · x{level.current.multiplier}
              </p>
              {level.next && (
                <p className="text-muted">
                  {t('Level {number} at {points}', {
                    number: level.nextNumber,
                    points: formatNumber(level.next.minPoints),
                  })}
                </p>
              )}
            </div>
            <div className="mt-2">
              <Progress value={level.progress} label={t('Level progress')} />
            </div>
          </Card>

          <Card>
            <p className="font-semibold">{t('Held points')}</p>
            <p className="mt-1 text-muted">
              {t(
                'Points can be held when a deposit is flagged. They are released or removed after admin review. You will see the reason here.',
              )}
            </p>
          </Card>
          <InfoNote>
            {t(
              'The ledger cannot be edited. Corrections appear as new entries, and balance and history are read only.',
            )}
          </InfoNote>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <Chips<Filter>
            label={t('Filter history')}
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: t('All') },
              { value: 'earned', label: t('Earned') },
              { value: 'redeemed', label: t('Redeemed') },
              { value: 'held', label: t('Held') },
              { value: 'rejected', label: t('Rejected') },
            ]}
          />
          {entries.length === 0 ? (
            <EmptyState title={t('Nothing here yet')} />
          ) : (
            <ul>
              {entries.map((entry) => (
                <LedgerRow key={entry.id} entry={entry} onSelect={setViewing} />
              ))}
            </ul>
          )}
        </div>
      </div>

      <Sheet
        open={viewing !== null}
        title={t('Points entry')}
        onClose={() => setViewing(null)}
        footer={
          order ? (
            <ButtonLink to={`/app/orders/${order.id}`} full>
              {t('View order')}
            </ButtonLink>
          ) : undefined
        }
      >
        {viewing && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-line p-4">
              <span className="text-lg">{t(kindLabels[viewing.kind])}</span>
              <LedgerAmount entry={viewing} />
            </div>
            <div className="flex flex-col">
              <DetailRow label={t('Date')}>{t(viewing.when)}</DetailRow>
              <DetailRow label={t('Details')}>
                {t(viewing.title.replace('Order #', `${t('Order')} #`))} · {t(viewing.detail)}
              </DetailRow>
              {deposit && (
                <>
                  <DetailRow label={t('Deposit')}>{deposit.id}</DetailRow>
                  <DetailRow label={t('Collection point')}>
                    {state.temples.find((temple) => temple.id === deposit.templeId)?.name}
                  </DetailRow>
                  <DetailRow label={t('Waste type')}>{t(deposit.waste)}</DetailRow>
                  <DetailRow label={t('Weight')}>{formatKg(deposit.kg)}</DetailRow>
                  {deposit.reason && (
                    <DetailRow label={t('Reason')}>{t(deposit.reason)}</DetailRow>
                  )}
                </>
              )}
            </div>
            {(viewing.kind === 'held' || viewing.kind === 'rejected') && (
              <InfoNote>
                {viewing.kind === 'held'
                  ? t('Held points are released or removed after admin review.')
                  : t('Rejected deposits earn no points. The counter will tell you why.')}
              </InfoNote>
            )}
          </div>
        )}
      </Sheet>
    </div>
  )
}

export default History
