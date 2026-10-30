import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import Icon from '../../components/ui/Icon'
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  InfoNote,
  Pill,
} from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'
import { changeCart } from '../../store/actions'
import { formatNumber, productName, stockTone } from '../../utils/points'

const ProductDetail = () => {
  const { id } = useParams()
  const { state, run, toast } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const [qty, setQty] = useState(1)
  const product = state.products.find((item) => item.id === id && item.listed)

  if (!product) {
    return (
      <EmptyState icon="bag" title={t('This product is not available')}>
        <ButtonLink to="/app/shop">{t('Browse shop')}</ButtonLink>
      </EmptyState>
    )
  }

  const tone = stockTone(product.stock)
  const packs = state.products.filter(
    (item) => item.group === product.group && item.listed,
  )
  const name = productName(product, state.lang)

  const addToCart = () => {
    run((current) => changeCart(current, product.id, qty))
  }

  return (
    <div>
      <ScreenHeader
        title={t('Product')}
        backTo="/app/shop"
        right={
          <Link
            to="/app/cart"
            className="font-medium text-marigold underline underline-offset-4"
          >
            {t('Cart ({count})', {
              count: state.cart.reduce((sum, line) => sum + line.qty, 0),
            })}
          </Link>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 md:gap-8">
        <div className="flex aspect-[4/3] items-center justify-center rounded-3xl border border-line bg-raised text-muted md:aspect-square">
          {t('Pack photo')} · {product.pack}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-3xl leading-tight md:text-4xl">
              {name}
            </h2>
            {tone === 'in' && <Pill tone="green">{t('In stock')}</Pill>}
            {tone === 'low' && <Pill tone="warning">{t('Low stock')}</Pill>}
            {tone === 'out' && <Pill tone="warning">{t('Out of stock')}</Pill>}
          </div>
          <p className="text-lg">
            <span className="text-2xl font-bold">₹{product.price}</span>{' '}
            <span className="text-muted">
              {t('or')} {formatNumber(product.points)} {t('points')}
            </span>
          </p>
          <p className="text-muted">
            {t('Made from temple nirmalya at the Shipra processing unit.')}
          </p>

          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted">{t('Pack size')}</p>
              <div className="flex flex-wrap gap-2">
                {packs.map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    aria-pressed={pack.id === product.id}
                    onClick={() => {
                      setQty(1)
                      navigate(`/app/shop/${pack.id}`, { replace: true })
                    }}
                    className={`min-h-11 rounded-full border px-4 font-medium ${
                      pack.id === product.id
                        ? 'border-marigold bg-marigold text-marigold-ink'
                        : 'border-line text-muted hover:text-ink'
                    }`}
                  >
                    {pack.pack}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted">{t('Quantity')}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={t('Remove one')}
                  disabled={qty <= 1}
                  onClick={() => setQty(qty - 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-line disabled:opacity-45"
                >
                  <Icon name="minus" size={18} />
                </button>
                <span className="w-6 text-center text-lg font-semibold">
                  {qty}
                </span>
                <button
                  type="button"
                  aria-label={t('Add one')}
                  disabled={qty >= product.stock}
                  onClick={() => setQty(qty + 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-line disabled:opacity-45"
                >
                  <Icon name="plus" size={18} />
                </button>
              </div>
            </div>
          </Card>

          <InfoNote>
            {t('Pickup at temple or delivery, chosen at checkout.')}
          </InfoNote>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              full
              disabled={tone === 'out'}
              onClick={() => {
                addToCart()
                toast(t('Added to cart.'))
              }}
            >
              {t('Add to cart')}
            </Button>
            <Button
              full
              disabled={tone === 'out'}
              onClick={() => {
                addToCart()
                navigate('/app/cart')
              }}
            >
              {t('Buy now')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
