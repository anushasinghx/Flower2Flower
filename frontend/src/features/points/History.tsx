import { useState } from 'react'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import {
  Card,
  Chips,
  EmptyState,
  InfoNote,
  Progress,
} from '../../components/ui/kit'
import LedgerRow from './LedgerRow'
import { useStore, useT } from '../../store/appStore'
import type { LedgerKind } from '../../store/types'
import {
  availablePoints,
  formatNumber,
  heldPoints,
  levelInfo,
} from '../../utils/points'

type Filter = 'all' | 'earned' | 'redeemed' | 'held'

const filterKinds: Record<Exclude<Filter, 'all'>, LedgerKind[]> = {
  earned: ['earned', 'bonus', 'refund', 'released'],
  redeemed: ['redeemed'],
  held: ['held', 'removed'],
}

const History = () => {
  const { state } = useStore()
  const t = useT()
  const [filter, setFilter] = useState<Filter>('all')
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

        <div className="flex flex-col gap-2">
          <Chips<Filter>
            label={t('Filter history')}
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: t('All') },
              { value: 'earned', label: t('Earned') },
              { value: 'redeemed', label: t('Redeemed') },
              { value: 'held', label: t('Held') },
            ]}
          />
          {entries.length === 0 ? (
            <EmptyState title={t('Nothing here yet')} />
          ) : (
            <ul>
              {entries.map((entry) => (
                <LedgerRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default History
