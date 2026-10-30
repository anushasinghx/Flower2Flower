import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import {
  Button,
  Card,
  Field,
  RadioRow,
  Segmented,
  Select,
  TextInput,
} from '../../components/ui/kit'
import OrderSummary from './OrderSummary'
import { useStore, useT } from '../../store/appStore'
import {
  applyPoints,
  nextOrderId,
  placeOrder,
  setFulfilment,
  setPayWith,
  setPickupTemple,
} from '../../store/actions'
import type { Fulfilment } from '../../store/types'
import { cartTotals, formatNumber } from '../../utils/points'

const Checkout = () => {
  const { state, run } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const totals = cartTotals(state)
  const [name, setName] = useState(state.devotee.name)
  const [address, setAddress] = useState('')
  const [pin, setPin] = useState('')
  const [phone, setPhone] = useState(state.devotee.mobile)
  const [tried, setTried] = useState(false)
  const [placed, setPlaced] = useState(false)
  const verified = state.devotee.kyc === 'verified'
  const canUsePoints = verified && totals.available > 0
  const canPayAllPoints = verified && totals.pointsShort === 0
  const temples = state.temples.filter((temple) => temple.status === 'verified')
  const delivery = state.fulfilment === 'delivery'

  if (placed) return null
  if (totals.count === 0) return <Navigate to="/app/cart" replace />

  const addressValid =
    !delivery ||
    (name.trim() !== '' &&
      address.trim() !== '' &&
      /^\d{6}$/.test(pin) &&
      /^[6-9]\d{9}$/.test(phone))

  const submit = () => {
    setTried(true)
    if (!addressValid) return

    const orderId = nextOrderId(state)
    const fullAddress = `${address.trim()}, ${pin}`
    setPlaced(true)
    run((current) => placeOrder(current, orderId, fullAddress))
    navigate(`/app/orders/${orderId}?placed=1`, { replace: true })
  }

  return (
    <div>
      <ScreenHeader title={t('Checkout')} backTo="/app/cart" />

      <p className="mb-5 rounded-2xl border border-sindoor/50 px-4 py-3 text-center font-medium text-sindoor">
        {t('Mock payment. No real money is charged.')}
      </p>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4">
            <h2 className="text-lg font-bold">{t('Collect your order')}</h2>
            <Segmented<Fulfilment>
              label={t('Collect your order')}
              value={state.fulfilment}
              onChange={(value) =>
                run((current) => setFulfilment(current, value))
              }
              options={[
                { value: 'pickup', label: t('Pickup at temple') },
                { value: 'delivery', label: t('Home delivery') },
              ]}
            />

            {delivery ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t('Name')}
                  error={tried && !name.trim() ? t('Enter your name.') : ''}
                >
                  {(id) => (
                    <TextInput
                      id={id}
                      value={name}
                      autoComplete="name"
                      onChange={(event) => setName(event.target.value)}
                    />
                  )}
                </Field>
                <Field
                  label={t('Phone')}
                  error={
                    tried && !/^[6-9]\d{9}$/.test(phone)
                      ? t('Enter a valid mobile number.')
                      : ''
                  }
                >
                  {(id) => (
                    <TextInput
                      id={id}
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={(event) =>
                        setPhone(event.target.value.replace(/\D/g, ''))
                      }
                    />
                  )}
                </Field>
                <div className="sm:col-span-2">
                  <Field
                    label={t('Address')}
                    error={
                      tried && !address.trim() ? t('Enter your address.') : ''
                    }
                  >
                    {(id) => (
                      <TextInput
                        id={id}
                        value={address}
                        autoComplete="street-address"
                        onChange={(event) => setAddress(event.target.value)}
                      />
                    )}
                  </Field>
                </div>
                <Field
                  label={t('PIN')}
                  error={
                    tried && !/^\d{6}$/.test(pin) ? t('Enter a 6 digit PIN.') : ''
                  }
                >
                  {(id) => (
                    <TextInput
                      id={id}
                      inputMode="numeric"
                      maxLength={6}
                      value={pin}
                      onChange={(event) =>
                        setPin(event.target.value.replace(/\D/g, ''))
                      }
                    />
                  )}
                </Field>
                <p className="self-end text-sm text-muted sm:pb-3">
                  {t('Delivery is available within 1 km for ₹10.')}
                </p>
              </div>
            ) : (
              <Field label={t('Pickup temple')}>
                {(id) => (
                  <Select
                    id={id}
                    value={state.pickupTempleId}
                    onChange={(event) => {
                      const value = event.target.value
                      run((current) => setPickupTemple(current, value))
                    }}
                  >
                    {temples.map((temple) => (
                      <option key={temple.id} value={temple.id}>
                        {temple.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-bold">{t('Pay with')}</h2>
            <div className="mt-2 flex flex-col gap-1">
              <fieldset disabled={!canUsePoints} className="disabled:opacity-50">
                <RadioRow
                  name="pay"
                  checked={state.payWith === 'mixed'}
                  onChange={() =>
                    run((current) =>
                      applyPoints(
                        current,
                        current.pointsApplied ||
                          Math.min(500, totals.maxApplicable),
                      ),
                    )
                  }
                >
                  <span className="block font-medium">
                    {t('Points + INR (mock)')}
                  </span>
                  <span className="text-sm text-muted">
                    {t('Points applied ({count})', {
                      count: formatNumber(
                        state.payWith === 'mixed' ? totals.pointsUsed : 0,
                      ),
                    })}
                  </span>
                </RadioRow>
              </fieldset>
              <fieldset
                disabled={!canPayAllPoints}
                className="disabled:opacity-50"
              >
                <RadioRow
                  name="pay"
                  checked={state.payWith === 'points'}
                  onChange={() =>
                    run((current) => setPayWith(current, 'points'))
                  }
                >
                  <span className="block font-medium">{t('Points only')}</span>
                  <span className="text-sm text-muted">
                    {verified
                      ? totals.pointsShort > 0
                        ? t('Need {count} more points', {
                            count: formatNumber(totals.pointsShort),
                          })
                        : t('{count} points', {
                            count: formatNumber(totals.subtotalPoints),
                          })
                      : t('Using points needs verified KYC.')}
                  </span>
                </RadioRow>
              </fieldset>
              <RadioRow
                name="pay"
                checked={state.payWith === 'inr'}
                onChange={() => run((current) => setPayWith(current, 'inr'))}
              >
                <span className="block font-medium">{t('INR only (mock)')}</span>
                <span className="text-sm text-muted">
                  {t('UPI or card placeholder')}
                </span>
              </RadioRow>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-24">
          <OrderSummary totals={totals} />
          <Button full onClick={submit}>
            {t('Place order')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Checkout
