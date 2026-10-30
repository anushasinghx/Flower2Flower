import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/ui/Icon'
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Pill,
  Progress,
  Sheet,
  TextLink,
} from '../../components/ui/kit'
import LedgerRow from './LedgerRow'
import { useStore, useT } from '../../store/appStore'
import {
  availablePoints,
  formatNumber,
  heldPoints,
  levelInfo,
  maskMobile,
} from '../../utils/points'

// Placeholder pattern only. The real code comes from the API later.
const QrPlaceholder = ({ seed }: { seed: string }) => {
  const cells = useMemo(() => {
    const size = 21
    const inFinder = (x: number, y: number) =>
      (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)

    return Array.from({ length: size * size }, (_, index) => {
      const x = index % size
      const y = Math.floor(index / size)
      if (inFinder(x, y)) return false
      const digit = Number(seed[(x * 3 + y * 7) % seed.length])
      return (digit * (x + 1) + y * 5) % 3 === 0
    })
  }, [seed])

  const finders = [
    [0, 0],
    [14, 0],
    [0, 14],
  ]

  return (
    <svg viewBox="0 0 21 21" className="w-full" aria-hidden="true">
      <rect width="21" height="21" fill="#ECEFE9" />
      {cells.map((filled, index) =>
        filled ? (
          <rect
            key={index}
            x={index % 21}
            y={Math.floor(index / 21)}
            width="1"
            height="1"
            fill="#0F1512"
          />
        ) : null,
      )}
      {finders.map(([x, y]) => (
        <g key={`${x}${y}`}>
          <rect x={x} y={y} width="7" height="7" fill="#0F1512" />
          <rect x={x + 1} y={y + 1} width="5" height="5" fill="#ECEFE9" />
          <rect x={x + 2} y={y + 2} width="3" height="3" fill="#0F1512" />
        </g>
      ))}
    </svg>
  )
}

const Home = () => {
  const { state } = useStore()
  const t = useT()
  const [qrOpen, setQrOpen] = useState(false)
  const { devotee, ledger } = state
  const level = levelInfo(state)
  const verified = devotee.kyc === 'verified'
  const society = state.societies.find((item) => item.id === devotee.societyId)
  const activeOrders = state.orders.filter(
    (order) =>
      order.mine && order.status !== 'completed' && order.status !== 'cancelled',
  ).length

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted">नमस्ते</p>
          <h1 className="truncate font-display text-4xl leading-tight md:text-5xl">
            {devotee.name || t('Devotee')}
          </h1>
        </div>
        {verified ? (
          <Pill tone="green">{t('KYC verified')}</Pill>
        ) : (
          <Pill tone="warning">
            {devotee.kyc === 'inReview'
              ? t('KYC in review')
              : devotee.kyc === 'rejected'
                ? t('KYC rejected')
                : t('KYC pending')}
          </Pill>
        )}
      </div>

      {!verified && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sindoor/50 px-4 py-3">
          <p className="text-sindoor">
            {devotee.kyc === 'inReview'
              ? t('Your KYC is in review. Redemption unlocks when verified.')
              : t('KYC pending: verify to redeem points')}
          </p>
          {devotee.kyc !== 'inReview' && (
            <TextLink to="/app/kyc">{t('Complete KYC')}</TextLink>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <div className="flex flex-col gap-4">
          <Card className="md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-muted">{t('Points to use')}</p>
                <p className="font-display text-6xl leading-tight text-marigold">
                  {formatNumber(availablePoints(state))}
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted">{t('Held')}</p>
                <p className="mt-1 text-xl">{formatNumber(heldPoints(state))}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="font-medium">
                {t('Level {number}', { number: level.number })} ·{' '}
                {t(level.current.name)}
              </p>
              {level.next && (
                <p className="text-muted">
                  {formatNumber(level.lifetime)} /{' '}
                  {formatNumber(level.next.minPoints)}
                </p>
              )}
            </div>
            <div className="mt-2">
              <Progress value={level.progress} label={t('Level progress')} />
            </div>
            <p className="mt-2 text-muted">
              {level.next
                ? t('{count} lifetime points to Level {number}', {
                    count: formatNumber(level.toNext),
                    number: level.nextNumber,
                  })
                : t('You are at the highest level.')}
            </p>
          </Card>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <Card className="!p-4 md:!p-5">
              <p className="text-muted">{t('You have offered')}</p>
              <p className="mt-1 text-3xl font-bold">{devotee.kgOffered} kg</p>
            </Card>
            <Card className="!p-4 md:!p-5">
              <p className="text-muted">{t('CO₂e avoided')}</p>
              <p className="mt-1 text-3xl font-bold text-tulsi">
                {devotee.co2Avoided} kg
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <Button icon="qr" onClick={() => setQrOpen(true)} className="!min-h-14">
              {t('Show my QR')}
            </Button>
            <ButtonLink
              to="/app/redeem"
              variant="secondary"
              icon="bag"
              className="!min-h-14"
            >
              {t('Use points')}
            </ButtonLink>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">{t('Recent offerings')}</h2>
              <TextLink to="/app/history">{t('See all')}</TextLink>
            </div>
            {ledger.length === 0 ? (
              <div className="mt-3">
                <EmptyState title={t('No offerings yet')}>
                  <p className="text-sm text-muted">
                    {t('Show your QR at a temple counter to make your first offering.')}
                  </p>
                </EmptyState>
              </div>
            ) : (
              <ul className="mt-1">
                {ledger.slice(0, 3).map((entry) => (
                  <LedgerRow key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </section>

          <Link
            to="/app/orders"
            className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-4 transition-colors hover:border-muted"
          >
            <Icon name="box" className="text-marigold" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t('My orders')}</span>
              <span className="text-sm text-muted">
                {t('{count} active', { count: activeOrders })}
              </span>
            </span>
            <Icon name="next" size={18} className="text-muted" />
          </Link>

          <Link
            to="/app/society"
            className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-4 transition-colors hover:border-muted"
          >
            <Icon name="users" className="text-marigold" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t('Society pool')}</span>
              <span className="text-sm text-muted">
                {society
                  ? `${society.name} · ${formatNumber(society.poolPoints)} ${t('pts')}`
                  : t('Join your housing society')}
              </span>
            </span>
            <Icon name="next" size={18} className="text-muted" />
          </Link>
        </div>
      </div>

      <Sheet
        open={qrOpen}
        title={t('My QR')}
        onClose={() => setQrOpen(false)}
      >
        <div className="mx-auto flex max-w-xs flex-col items-center gap-4 text-center">
          <div className="w-full rounded-3xl bg-ink p-4">
            <QrPlaceholder seed={devotee.mobile} />
          </div>
          <p className="text-lg font-semibold">
            +91 {maskMobile(devotee.mobile)}
          </p>
          <p className="text-muted">
            {t('Show this at the temple counter, or say your mobile number.')}
          </p>
        </div>
      </Sheet>
    </div>
  )
}

export default Home
