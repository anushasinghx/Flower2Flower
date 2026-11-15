import ScreenHeader from '../../components/Layout/ScreenHeader'
import Icon from '../../components/ui/Icon'
import {
  ButtonLink,
  Card,
  EmptyState,
  Field,
  TextInput,
  TextLink,
  Toggle,
} from '../../components/ui/kit'
import { QtyStepper } from './Shop'
import OrderSummary from './OrderSummary'
import { useStore, useT } from '../../store/appStore'
import { applyPoints, changeCart, setPayWith } from '../../store/actions'
import { cartTotals, formatNumber, productName } from '../../utils/points'

const Cart = () => {
  const { state, run } = useStore()
  const t = useT()
  const totals = cartTotals(state)
  const verified = state.devotee.kyc === 'verified'
  const pointsOn = state.payWith !== 'inr'
  const pointsInvalid =
    state.payWith === 'points' && totals.pointsShort > 0
  const blocked = pointsOn && (!verified || pointsInvalid)

  if (totals.count === 0) {
    return (
      <div className="mx-auto w-full max-w-lg">
        <ScreenHeader title={t('My cart')} backTo="/app/shop" />
        <EmptyState icon="cart" title={t('Your cart is empty')}>
          <ButtonLink to="/app/shop">{t('Browse shop')}</ButtonLink>
        </EmptyState>
      </div>
    )
  }

  const togglePoints = (on: boolean) => {
    if (on) {
      run((current) => applyPoints(current, totals.maxApplicable))
    } else {
      run((current) => setPayWith(current, 'inr'))
    }
  }

  return (
    <div>
      <ScreenHeader
        title={`${t('My cart')} (${totals.count})`}
        backTo="/app/shop"
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="flex flex-col gap-3">
          {totals.lines.map((line) => {
            const name = productName(line.product, state.lang)

            return (
              <div
                key={line.productId}
                className="flex flex-wrap items-center gap-3 rounded-3xl border border-line bg-surface p-3.5"
              >
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-raised text-sm text-muted">
                  {line.product.pack}
                </span>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="font-bold leading-snug">
                    {name} · {line.product.pack}
                  </p>
                  <p className="text-muted">
                    ₹{line.product.price} · {formatNumber(line.product.points)}{' '}
                    {t('points')}
                  </p>
                </div>
                <QtyStepper
                  qty={line.qty}
                  max={line.product.stock}
                  label={name}
                  onChange={(delta) =>
                    run((current) =>
                      changeCart(current, line.productId, delta),
                    )
                  }
                />
              </div>
            )
          })}

          <Card className="flex flex-col gap-3">
            {verified ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{t('Use points?')}</span>
                  <Toggle
                    checked={pointsOn}
                    onChange={togglePoints}
                    label={t('Use points?')}
                  />
                </div>
                <p className="text-sm text-muted">
                  {t('You have {count} points.', {
                    count: formatNumber(totals.available),
                  })}
                </p>
                {state.payWith === 'mixed' && (
                  <Field
                    label={t('Points to use')}
                    hint={t('Up to {count} points on this order.', {
                      count: formatNumber(totals.maxApplicable),
                    })}
                  >
                    {(id) => (
                      <TextInput
                        id={id}
                        inputMode="numeric"
                        value={state.pointsApplied}
                        onChange={(event) => {
                          const value = Number(
                            event.target.value.replace(/\D/g, ''),
                          )
                          run((current) => ({
                            ...current,
                            pointsApplied: value,
                          }))
                        }}
                      />
                    )}
                  </Field>
                )}
                {pointsInvalid && (
                  <p role="alert" className="text-sm text-sindoor">
                    {t('Need {count} more points', {
                      count: formatNumber(totals.pointsShort),
                    })}
                  </p>
                )}
              </>
            ) : (
              <div className="flex items-start gap-3">
                <Icon name="lock" className="text-marigold" />
                <p>
                  {t('Using points needs verified KYC.')}{' '}
                  <TextLink to="/app/kyc">{t('Complete KYC')}</TextLink>
                </p>
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-24">
          <OrderSummary totals={totals} />
          {blocked ? (
            <button
              type="button"
              disabled
              className="min-h-11 w-full rounded-full bg-marigold px-5 font-semibold text-marigold-ink opacity-45"
            >
              {t('Proceed to checkout')}
            </button>
          ) : (
            <ButtonLink to="/app/checkout" full>
              {t('Proceed to checkout')}
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  )
}

export default Cart
