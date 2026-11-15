import { useNavigate } from 'react-router-dom'
import Icon from '../../components/ui/Icon'
import { Button, ButtonLink, Card, EmptyState, InfoNote, Pill } from '../../components/ui/kit'
import { formatKg } from './helpers'
import { useStore, useT } from '../../store/appStore'
import { startDraft } from '../../store/fieldActions'
import { availablePoints, formatNumber } from '../../utils/points'

const DepositSaved = () => {
  const { state, run } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const deposit = state.deposits.find(
    (item) => item.id === state.operator.lastDepositId,
  )

  if (!deposit) {
    return (
      <EmptyState title={t('No deposit saved yet')}>
        <ButtonLink to="/operator/find">{t('Find devotee')}</ButtonLink>
      </EmptyState>
    )
  }

  const isCurrent = deposit.mobile === state.devotee.mobile
  const titles = {
    accepted: t('Accepted'),
    held: t('Accepted, points held'),
    rejected: t('Rejected'),
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl">{t('Deposit saved')}</h1>
        <Pill>#{deposit.id}</Pill>
      </div>

      <Card className="flex flex-col items-center gap-2 py-8 text-center">
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-full ${
            deposit.status === 'rejected'
              ? 'border border-sindoor text-sindoor'
              : 'bg-tulsi text-marigold-ink'
          }`}
        >
          <Icon name={deposit.status === 'rejected' ? 'close' : 'check'} size={30} />
        </span>
        <h2 className="text-2xl font-bold">{titles[deposit.status]}</h2>
        <p className="text-muted">
          {t(deposit.waste)} · {formatKg(deposit.kg)} · {deposit.name}
        </p>

        {deposit.status === 'rejected' ? (
          <p className="text-sindoor">{t(deposit.reason)}</p>
        ) : deposit.synced ? (
          <p className="font-display text-4xl text-marigold">
            {deposit.status === 'held'
              ? t('{points} pts held', { points: formatNumber(deposit.points) })
              : t('+{points} pts credited', { points: formatNumber(deposit.points) })}
          </p>
        ) : (
          <p className="font-display text-3xl text-marigold">
            {t('{points} pts pending', { points: formatNumber(deposit.points) })}
          </p>
        )}

        {deposit.charge > 0 && (
          <p className="text-muted">
            {t('Charge collected: ₹{charge}', { charge: deposit.charge })}
          </p>
        )}
        {!deposit.synced && (
          <p className="text-marigold">
            {t('Saved on this device. It will sync when online.')}
          </p>
        )}
        {deposit.synced && isCurrent && deposit.status === 'accepted' && (
          <p className="text-sm text-muted">
            {t('New balance {points} pts', {
              points: formatNumber(availablePoints(state)),
            })}
          </p>
        )}
      </Card>

      <Button
        full
        className="!min-h-14"
        onClick={() => {
          run((current) => startDraft(current, deposit.mobile))
          navigate('/operator/waste')
        }}
      >
        {t('Next deposit (same devotee)')}
      </Button>
      <ButtonLink to="/operator/find" variant="secondary" full>
        {t('New devotee')}
      </ButtonLink>
      <ButtonLink to="/operator/summary" variant="secondary" full>
        {t("View today's summary")}
      </ButtonLink>

      <InfoNote>
        {t('The devotee gets an in app notice and a ledger entry. The deposit joins the next processing batch when the day is closed.')}
      </InfoNote>
    </div>
  )
}

export default DepositSaved
