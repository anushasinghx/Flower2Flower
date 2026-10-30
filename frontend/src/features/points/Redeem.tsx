import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import Icon from '../../components/ui/Icon'
import {
  Button,
  ButtonLink,
  Card,
  Field,
  InfoNote,
  Pill,
  TextInput,
} from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'
import { applyPoints } from '../../store/actions'
import { availablePoints, formatNumber } from '../../utils/points'

const shares = [25, 50, 75, 100]

const Redeem = () => {
  const { state, run } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const available = availablePoints(state)
  const [points, setPoints] = useState(Math.min(500, available))
  const rate = state.rules.pointsPerRupee
  const locked = state.rules.requiresKyc && state.devotee.kyc !== 'verified'
  const tooMany = points > available

  const apply = () => {
    run((current) => applyPoints(current, points))
    navigate(state.cart.length ? '/app/cart' : '/app/shop')
  }

  if (locked) {
    return (
      <div className="mx-auto w-full max-w-lg">
        <ScreenHeader title={t('Redeem points')} backTo="/app" />
        <Card className="flex flex-col items-center gap-3 text-center md:p-8">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-raised text-marigold">
            <Icon name="lock" />
          </span>
          <h2 className="text-xl font-bold">{t('Redemption is locked')}</h2>
          <p className="text-muted">
            {t('Complete KYC to use your points.')}{' '}
            {t('Status')}:{' '}
            {state.devotee.kyc === 'inReview'
              ? t('In review')
              : state.devotee.kyc === 'rejected'
                ? t('Rejected')
                : t('Not started')}
          </p>
          <ButtonLink to="/app/kyc" full>
            {t('View KYC status')}
          </ButtonLink>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <ScreenHeader
        title={t('Redeem points')}
        backTo="/app"
        right={<Pill tone="green">{t('KYC verified')}</Pill>}
      />
      <div className="flex flex-col gap-4">
        <Card className="md:p-7">
          <p className="text-muted">{t('Available')}</p>
          <p className="font-display text-6xl leading-tight text-marigold">
            {formatNumber(available)}
          </p>
          <p className="mt-1 text-muted">
            {t('100 pts = ₹{value}', { value: 100 / rate })}
          </p>
        </Card>

        <Card className="flex flex-col gap-3 md:p-7">
          <Field
            label={t('Points to use')}
            error={tooMany ? t('You only have {count} points.', {
              count: formatNumber(available),
            }) : ''}
          >
            {(id) => (
              <TextInput
                id={id}
                inputMode="numeric"
                value={points}
                onChange={(event) =>
                  setPoints(Number(event.target.value.replace(/\D/g, '')))
                }
              />
            )}
          </Field>
          <div className="grid grid-cols-4 gap-2">
            {shares.map((share) => (
              <button
                key={share}
                type="button"
                onClick={() => setPoints(Math.floor((available * share) / 100))}
                className="min-h-11 rounded-full border border-line text-sm font-medium text-muted transition-colors hover:text-ink"
              >
                {share === 100 ? t('Max') : `${share}%`}
              </button>
            ))}
          </div>
          <p className="text-lg font-semibold">= ₹{formatNumber(points / rate)}</p>
          <Button full disabled={points <= 0 || tooMany} onClick={apply}>
            {t('Apply to my cart')}
          </Button>
        </Card>

        <InfoNote>
          {t('Held points cannot be redeemed.')}
        </InfoNote>
      </div>
    </div>
  )
}

export default Redeem
