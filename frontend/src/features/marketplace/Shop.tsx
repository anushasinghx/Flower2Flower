import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import Icon from '../../components/ui/Icon'
import {
  ButtonLink,
  Chips,
  EmptyState,
  Pill,
  RadioRow,
  Segmented,
  TextInput,
} from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'
import { changeCart, setFulfilment, setPayWith } from '../../store/actions'
import type { Product } from '../../store/types'
import {
  availablePoints,
  cartTotals,
  DELIVERY_FEE,
  formatNumber,
  productName,
  stockTone,
} from '../../utils/points'

export const QtyStepper = ({
  qty,
  onChange,
  max,
  label,
}: {
  qty: number
  onChange: (delta: number) => void
  max: number
  label: string
}) => {
  const t = useT()

  return (
    <div className="flex shrink-0 items-center gap-2" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={t('Remove one')}
        onClick={() => onChange(-1)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink hover:bg-raised"
      >
        <Icon name="minus" size={18} />
      </button>
      <span className="w-6 text-center text-lg font-semibold">{qty}</span>
      <button
        type="button"
        aria-label={t('Add one')}
        disabled={qty >= max}
        onClick={() => onChange(1)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-marigold text-marigold-ink disabled:opacity-45"
      >
        <Icon name="plus" size={18} />
      </button>
    </div>
  )
}

const ProductRow = ({ product }: { product: Product }) => {
  const { state, run } = useStore()
  const t = useT()
  const line = state.cart.find((item) => item.productId === product.id)
  const qty = line?.qty ?? 0
  const usePoints = state.payWith !== 'inr'
  const available = availablePoints(state)
  const short = usePoints ? product.points - available : 0
  const tone = stockTone(product.stock)
  const blocked = tone === 'out' || short > 0
  const name = productName(product, state.lang)

  const change = (delta: number) =>
    run((current) => changeCart(current, product.id, delta))

  const prices = usePoints
    ? `${formatNumber(product.points)} ${t('points')} · ₹${product.price}`
    : `₹${product.price} · ${formatNumber(product.points)} ${t('points')}`

  return (
    <div
      className={`flex items-center gap-3 rounded-3xl bg-surface p-3.5 md:gap-4 ${
        qty > 0 ? 'border-2 border-marigold' : 'border border-line'
      }`}
    >
      <Link
        to={`/app/shop/${product.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 md:gap-4"
      >
        <span className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-raised text-center text-sm text-muted">
          {product.pack}
        </span>
        <span className="min-w-0">
          <span className="block font-bold leading-snug">
            {name} · {product.pack}
          </span>
          <span className="block text-muted">{prices}</span>
          {tone === 'out' && (
            <span className="block text-sm text-sindoor">
              {t('Out of stock')}
            </span>
          )}
          {tone === 'low' && (
            <span className="block text-sm text-sindoor">{t('Low stock')}</span>
          )}
          {tone !== 'out' && short > 0 && (
            <span className="block text-sm text-sindoor">
              {t('Need {count} more points', { count: formatNumber(short) })}
            </span>
          )}
        </span>
      </Link>

      {qty > 0 ? (
        <QtyStepper
          qty={qty}
          onChange={change}
          max={product.stock}
          label={name}
        />
      ) : (
        <button
          type="button"
          aria-label={t('Add {name} {pack}', { name, pack: product.pack })}
          disabled={blocked}
          onClick={() => change(1)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-marigold/70 text-marigold transition-colors hover:bg-marigold/10 disabled:border-line disabled:text-muted disabled:hover:bg-transparent"
        >
          <Icon name="plus" size={20} />
        </button>
      )}
    </div>
  )
}

const categories = ['All', 'Manure', 'Vermicompost', 'Saplings', 'Kits']

const Shop = () => {
  const { state, run } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const totals = cartTotals(state)
  const usePoints = state.payWith !== 'inr'
  const temple = state.temples.find((item) => item.id === state.pickupTempleId)
  const available = availablePoints(state)
  const products = state.products.filter(
    (product) =>
      product.listed &&
      (category === 'All' || product.category === category) &&
      `${product.name} ${product.nameHi}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  )

  const changeMode = (value: 'inr' | 'points') => {
    if (value === 'points' && state.devotee.kyc !== 'verified') {
      navigate('/app/redeem')
      return
    }
    run((current) => setPayWith(current, value))
  }

  return (
    <div className={totals.count > 0 ? 'pb-20' : ''}>
      <ScreenHeader
        title={t('Shop')}
        backTo="/app"
        right={
          <Pill tone="marigold">
            {formatNumber(available)} {t('pts')}
          </Pill>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
          <Segmented<'inr' | 'points'>
            label={t('How to pay')}
            value={usePoints ? 'points' : 'inr'}
            onChange={changeMode}
            options={[
              { value: 'inr', label: t('Pay in ₹') },
              { value: 'points', label: t('Use points') },
            ]}
          />
          <label className="relative block">
            <span className="sr-only">{t('Search manure, saplings')}</span>
            <Icon
              name="search"
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            />
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('Search manure, saplings')}
              className="h-full !rounded-full pl-11"
            />
          </label>
        </div>

        <Chips
          label={t('Categories')}
          value={category}
          onChange={setCategory}
          options={categories.map((item) => ({
            value: item,
            label: t(item),
          }))}
        />

        {products.length === 0 ? (
          <EmptyState icon="search" title={t('No products found')} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
            {products.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
          </div>
        )}

        <fieldset className="rounded-3xl border border-line px-5 pb-3 pt-1 lg:max-w-xl">
          <legend className="px-2 text-muted">{t('How do you want it?')}</legend>
          <RadioRow
            name="fulfilment"
            checked={state.fulfilment === 'pickup'}
            onChange={() => run((current) => setFulfilment(current, 'pickup'))}
          >
            {t('Pick up at {temple}', { temple: temple?.name ?? t('your temple') })}
          </RadioRow>
          <RadioRow
            name="fulfilment"
            checked={state.fulfilment === 'delivery'}
            onChange={() =>
              run((current) => setFulfilment(current, 'delivery'))
            }
          >
            {t('Home delivery within 1 km · ₹{fee}', { fee: DELIVERY_FEE })}
          </RadioRow>
        </fieldset>
      </div>

      {totals.count > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
            <div>
              <p className="text-sm text-muted">
                {totals.count === 1
                  ? t('1 item')
                  : t('{count} items', { count: totals.count })}
              </p>
              <p className="text-xl font-bold">
                {usePoints
                  ? `${formatNumber(totals.subtotalPoints)} ${t('points')}`
                  : `₹${formatNumber(totals.subtotal)}`}
              </p>
            </div>
            <ButtonLink to="/app/cart" className="!min-h-14 !px-8">
              {t('Checkout')}
            </ButtonLink>
          </div>
        </div>
      )}
    </div>
  )
}

export default Shop
