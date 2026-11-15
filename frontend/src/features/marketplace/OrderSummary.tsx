import { Card } from '../../components/ui/kit'
import { useT } from '../../store/appStore'
import type { cartTotals } from '../../utils/points'
import { formatNumber } from '../../utils/points'

const Row = ({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) => (
  <div
    className={`flex items-center justify-between gap-3 ${
      strong ? 'border-t border-line pt-3 text-lg font-bold' : ''
    }`}
  >
    <span className={strong ? '' : 'text-muted'}>{label}</span>
    <span>{value}</span>
  </div>
)

const OrderSummary = ({
  totals,
}: {
  totals: ReturnType<typeof cartTotals>
}) => {
  const t = useT()

  return (
    <Card className="flex flex-col gap-2.5">
      <Row label={t('Subtotal')} value={`₹${formatNumber(totals.subtotal)}`} />
      {totals.pointsUsed > 0 && (
        <Row
          label={t('Points applied ({count})', {
            count: formatNumber(totals.pointsUsed),
          })}
          value={`−₹${formatNumber(totals.subtotal + totals.deliveryFee - totals.toPay)}`}
        />
      )}
      {totals.deliveryFee > 0 && (
        <Row label={t('Delivery')} value={`₹${totals.deliveryFee}`} />
      )}
      <Row
        label={t('To pay')}
        value={`₹${formatNumber(totals.toPay)}`}
        strong
      />
    </Card>
  )
}

export default OrderSummary
