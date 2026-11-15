import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import Icon from '../../components/ui/Icon'
import {
  ButtonLink,
  Card,
  EmptyState,
  Pill,
  Segmented,
  StatusList,
} from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'
import type { Order, OrderStatus } from '../../store/types'
import { formatNumber } from '../../utils/points'

const statusLabels: Record<OrderStatus, string> = {
  new: 'Placed',
  confirmed: 'Confirmed',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const OrderStatusPill = ({ status }: { status: OrderStatus }) => {
  const t = useT()
  const tone =
    status === 'completed'
      ? 'green'
      : status === 'cancelled'
        ? 'warning'
        : status === 'new'
          ? 'marigold'
          : 'neutral'

  return <Pill tone={tone}>{t(statusLabels[status])}</Pill>
}

const orderItems = (order: Order) =>
  order.lines.reduce((sum, line) => sum + line.qty, 0)

const orderTotal = (order: Order) =>
  order.lines.reduce((sum, line) => sum + line.qty * line.price, 0) +
  order.deliveryFee

export const OrdersList = () => {
  const { state } = useStore()
  const t = useT()
  const [tab, setTab] = useState<'active' | 'past'>('active')
  const mine = state.orders.filter((order) => order.mine)
  const isPast = (order: Order) =>
    order.status === 'completed' || order.status === 'cancelled'
  const visible = mine.filter((order) =>
    tab === 'past' ? isPast(order) : !isPast(order),
  )

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ScreenHeader title={t('My orders')} backTo="/app" />
      <div className="flex flex-col gap-4">
        <Segmented<'active' | 'past'>
          label={t('My orders')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'active', label: t('Active') },
            { value: 'past', label: t('Past') },
          ]}
        />
        {visible.length === 0 ? (
          <EmptyState
            icon="box"
            title={tab === 'active' ? t('No active orders') : t('No past orders')}
          >
            <ButtonLink to="/app/shop">{t('Browse shop')}</ButtonLink>
          </EmptyState>
        ) : (
          visible.map((order) => (
            <Link
              key={order.id}
              to={`/app/orders/${order.id}`}
              className="flex items-center justify-between gap-3 rounded-3xl border border-line bg-surface p-4 transition-colors hover:border-muted"
            >
              <span className="min-w-0">
                <span className="block font-bold">
                  {t('Order')} #{order.id}
                </span>
                <span className="text-sm text-muted">
                  {order.date} · ₹{formatNumber(orderTotal(order))}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <OrderStatusPill status={order.status} />
                <Icon name="next" size={18} className="text-muted" />
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

export const OrderDetail = () => {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { state } = useStore()
  const t = useT()
  const order = state.orders.find(
    (item) => item.mine && String(item.id) === id,
  )

  if (!order) {
    return (
      <EmptyState icon="box" title={t('Order not found')}>
        <ButtonLink to="/app/orders">{t('All orders')}</ButtonLink>
      </EmptyState>
    )
  }

  const pickup = order.fulfilment === 'pickup'
  const stepIndex = { new: 1, confirmed: 2, ready: 3, completed: 4, cancelled: 1 }[
    order.status
  ]

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ScreenHeader
        title={`${t('Order')} #${order.id}`}
        backTo="/app/orders"
        right={<OrderStatusPill status={order.status} />}
      />

      <div className="flex flex-col gap-4">
        {params.get('placed') && (
          <Card className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-tulsi text-marigold-ink">
              <Icon name="check" size={28} />
            </span>
            <h2 className="font-display text-3xl">{t('Order placed')}</h2>
            <p className="text-muted">
              {t('We will notify you when it is ready.')}
            </p>
          </Card>
        )}

        <Card>
          <h2 className="mb-2 text-lg font-bold">{t('Status')}</h2>
          {order.status === 'cancelled' ? (
            <p className="text-sindoor">
              {t('This order was cancelled. Any points used were refunded.')}
            </p>
          ) : (
            <StatusList
              current={order.status === 'completed' ? 4 : stepIndex}
              steps={[
                t('Placed'),
                t('Confirmed'),
                pickup ? t('Ready for pickup') : t('Out for delivery'),
                t('Completed'),
              ]}
            />
          )}
        </Card>

        <Card className="flex flex-col gap-1">
          <p className="font-semibold">
            {pickup ? t('Pickup at temple') : t('Home delivery')}
          </p>
          <p className="text-muted">
            {pickup ? order.templeName : order.address}
          </p>
          {pickup && order.status !== 'cancelled' && (
            <p className="mt-2">
              {t('Pickup code')}:{' '}
              <span className="text-xl font-bold tracking-widest text-marigold">
                {order.code}
              </span>
            </p>
          )}
          {order.trackingNote && (
            <p className="mt-2 text-muted">{order.trackingNote}</p>
          )}
        </Card>

        <Card className="flex flex-col gap-2">
          {order.lines.map((line) => (
            <div
              key={line.productId}
              className="flex items-center justify-between gap-3"
            >
              <span className="min-w-0">
                {t(line.name)} · {line.pack} × {line.qty}
              </span>
              <span>₹{formatNumber(line.price * line.qty)}</span>
            </div>
          ))}
          {order.deliveryFee > 0 && (
            <div className="flex items-center justify-between gap-3 text-muted">
              <span>{t('Delivery')}</span>
              <span>₹{order.deliveryFee}</span>
            </div>
          )}
          {order.pointsUsed > 0 && (
            <div className="flex items-center justify-between gap-3 text-muted">
              <span>{t('Points used')}</span>
              <span>{formatNumber(order.pointsUsed)}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-line pt-2 text-lg font-bold">
            <span>{t('Paid in INR (mock)')}</span>
            <span>₹{formatNumber(order.inrPaid)}</span>
          </div>
          <p className="text-sm text-muted">
            {orderItems(order) === 1
              ? t('1 item')
              : t('{count} items', { count: orderItems(order) })}
          </p>
        </Card>

        <ButtonLink to="/app/orders" variant="secondary" full>
          {t('All orders')}
        </ButtonLink>
      </div>
    </div>
  )
}
