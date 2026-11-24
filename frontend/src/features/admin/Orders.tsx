import { useState } from 'react'
import {
  AdminPage,
  DataTable,
  DetailRow,
  MasterDetail,
  NoteBar,
  SearchBox,
  type Column,
} from './parts'
import { Button, Chips, Field, Pill, TextInput } from '../../components/ui/kit'
import { useAction, useStore, useT } from '../../store/appStore'
import { adminApi } from '../../store/remote'
import { downloadBlob } from '../../services/api'
import type { Order, OrderStatus } from '../../store/types'
import { formatNumber, maskMobile } from '../../utils/points'

const labels: Record<OrderStatus, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const StatusPill = ({ status }: { status: OrderStatus }) => {
  const t = useT()
  const tone =
    status === 'new'
      ? 'marigold'
      : status === 'completed'
        ? 'green'
        : status === 'cancelled'
          ? 'warning'
          : 'neutral'

  return <Pill tone={tone}>{t(labels[status])}</Pill>
}

const orderTotal = (order: Order) =>
  order.lines.reduce((sum, line) => sum + line.qty * line.price, 0) +
  order.deliveryFee

const OrderPanel = ({ order }: { order: Order }) => {
  const { act, busy } = useAction()
  const t = useT()
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [note, setNote] = useState(order.trackingNote)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const pickup = order.fulfilment === 'pickup'

  const move = (status: OrderStatus, pickupCode?: string) =>
    act(
      () => adminApi.setOrderStatus(order.id, status, note.trim(), pickupCode),
      t('Order #{id} is now {status}.', {
        id: order.id,
        status: t(labels[status]),
      }),
    )

  const complete = async () => {
    if (pickup && !/^\d{4}$/.test(code)) {
      setCodeError(t('That code does not match this order.'))
      return
    }
    const done = await move('completed', pickup ? code : undefined)
    if (!done && pickup) setCodeError(t('That code does not match this order.'))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted">{order.date}</span>
        <StatusPill status={order.status} />
      </div>
      <p>
        {pickup
          ? t('Pickup at {temple}', { temple: order.templeName })
          : t('Delivery to {address}', { address: order.address })}
      </p>
      <div>
        <DetailRow label={t('Customer')}>
          {order.customer} · {maskMobile(order.mobile)}
        </DetailRow>
        {order.lines.map((line) => (
          <DetailRow
            key={line.productId}
            label={`${t(line.name)} · ${line.pack} × ${line.qty}`}
          >
            ₹{formatNumber(line.price * line.qty)}
          </DetailRow>
        ))}
        {order.deliveryFee > 0 && (
          <DetailRow label={t('Delivery')}>₹{order.deliveryFee}</DetailRow>
        )}
        <DetailRow label={t('Points used')}>
          {formatNumber(order.pointsUsed)}
        </DetailRow>
        <DetailRow label={t('Payment (mock)')}>
          ₹{formatNumber(order.inrPaid)} · {t('Paid')}
        </DetailRow>
      </div>

      {order.status === 'ready' && pickup && (
        <Field label={t('4 digit pickup code')} error={codeError}>
          {(id) => (
            <TextInput
              id={id}
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={(event) => {
                setCodeError('')
                setCode(event.target.value.replace(/\D/g, ''))
              }}
            />
          )}
        </Field>
      )}
      {!pickup && ['confirmed', 'ready'].includes(order.status) && (
        <Field label={t('Tracking note')}>
          {(id) => (
            <TextInput
              id={id}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          )}
        </Field>
      )}

      <div className="flex flex-col gap-2">
        {order.status === 'new' && (
          <Button full disabled={busy} onClick={() => move('confirmed')}>
            {t('Confirm order')}
          </Button>
        )}
        {order.status === 'confirmed' && (
          <Button full disabled={busy} onClick={() => move('ready')}>
            {pickup ? t('Mark ready for pickup') : t('Mark out for delivery')}
          </Button>
        )}
        {order.status === 'ready' && (
          <Button full disabled={busy} onClick={complete}>
            {t('Mark completed')}
          </Button>
        )}
        {!['completed', 'cancelled'].includes(order.status) &&
          (confirmingCancel ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-sindoor/50 p-3">
              <p className="text-sindoor">
                {t('Cancel this order? Points are refunded through a new ledger entry.')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="danger"
                  full
                  onClick={() => {
                    move('cancelled')
                    setConfirmingCancel(false)
                  }}
                >
                  {t('Yes, cancel')}
                </Button>
                <Button
                  variant="secondary"
                  full
                  onClick={() => setConfirmingCancel(false)}
                >
                  {t('Keep order')}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="danger"
              full
              onClick={() => setConfirmingCancel(true)}
            >
              {t('Cancel order')}
            </Button>
          ))}
      </div>
      <NoteBar>
        {t(
          'Pickup orders: verify the 4 digit code at handover. Delivery orders: add the address and a tracking note.',
        )}
      </NoteBar>
    </div>
  )
}

const Orders = () => {
  const { state } = useStore()
  const { act } = useAction()
  const t = useT()
  const [tab, setTab] = useState<OrderStatus>('new')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const newCount = state.orders.filter((order) => order.status === 'new').length
  const search = query.trim().toLowerCase()
  const rows = state.orders.filter(
    (order) =>
      (search
        ? `${order.id} ${order.customer}`.toLowerCase().includes(search)
        : order.status === tab),
  )
  const selected = state.orders.find((order) => order.id === selectedId) ?? null

  const columns: Column<Order>[] = [
    { key: 'id', header: t('Order'), render: (row) => `#${row.id}` },
    { key: 'customer', header: t('Customer'), render: (row) => row.customer },
    {
      key: 'mode',
      header: t('Mode'),
      render: (row) =>
        row.fulfilment === 'pickup' ? t('Pickup') : t('Delivery'),
    },
    {
      key: 'total',
      header: t('Total'),
      render: (row) => `₹${formatNumber(orderTotal(row))}`,
    },
    {
      key: 'status',
      header: t('Status'),
      render: (row) => <StatusPill status={row.status} />,
    },
  ]

  return (
    <AdminPage
      title={t('Orders')}
      actions={
        <>
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder={t('Search order or name')}
          />
          <Button
            variant="secondary"
            icon="download"
            onClick={() =>
              void act(async () => {
                const file = await adminApi.exportCsv('Orders', 'Orders screen export', true)
                downloadBlob(file.filename, file.blob)
              }, t('Export is ready. It was written to the audit log.'))
            }
          >
            {t('Export')}
          </Button>
        </>
      }
    >
      <Chips<OrderStatus>
        label={t('Filter by status')}
        value={tab}
        onChange={(value) => {
          setTab(value)
          setQuery('')
        }}
        options={[
          { value: 'new', label: `${t('New')} (${newCount})` },
          { value: 'confirmed', label: t('Confirmed') },
          { value: 'ready', label: t('Ready') },
          { value: 'completed', label: t('Completed') },
          { value: 'cancelled', label: t('Cancelled') },
        ]}
      />

      <MasterDetail
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected ? `${t('Order')} #${selected.id}` : ''}
        placeholder={t('Select an order to manage')}
        list={
          <DataTable
            label={t('Orders')}
            rows={rows}
            columns={columns}
            rowKey={(row) => String(row.id)}
            selectedKey={selectedId === null ? null : String(selectedId)}
            onRowClick={(row) => setSelectedId(row.id)}
            emptyTitle={t('No orders in this list')}
          />
        }
        detail={
          selected && <OrderPanel key={selected.id} order={selected} />
        }
      />
    </AdminPage>
  )
}

export default Orders
