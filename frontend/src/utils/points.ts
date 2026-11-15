import type { AppState, LedgerEntry, Lang, Product } from '../store/types'

export const formatNumber = (value: number) => value.toLocaleString('en-IN')

export const maskMobile = (mobile: string) => `******${mobile.slice(-4)}`

export const maskDocument = (value: string) =>
  `XXXX XXXX ${value.replace(/\s/g, '').slice(-4)}`

export const nowLabel = () => {
  const now = new Date()
  const date = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })
  const time = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date} ${time}`
}

export const todayLabel = () =>
  new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

const spendable: LedgerEntry['kind'][] = [
  'earned',
  'bonus',
  'redeemed',
  'refund',
  'released',
]

export const availablePoints = (state: AppState) =>
  state.ledger
    .filter((entry) => spendable.includes(entry.kind))
    .reduce((sum, entry) => sum + entry.points, state.devotee.openingAvailable)

export const heldPoints = (state: AppState) =>
  state.ledger.reduce((sum, entry) => {
    if (entry.kind === 'held') return sum + entry.points
    if (entry.kind === 'released' || entry.kind === 'removed') {
      return sum - Math.abs(entry.points)
    }
    return sum
  }, 0)

export const lifetimePoints = (state: AppState) =>
  state.ledger
    .filter((entry) =>
      ['earned', 'bonus', 'released'].includes(entry.kind),
    )
    .reduce((sum, entry) => sum + entry.points, state.devotee.openingLifetime)

export const levelInfo = (state: AppState) => {
  const levels = [...state.rules.levels].sort(
    (a, b) => a.minPoints - b.minPoints,
  )
  const lifetime = lifetimePoints(state)
  let index = 0

  levels.forEach((level, position) => {
    if (lifetime >= level.minPoints) index = position
  })

  const current = levels[index]
  const next = levels[index + 1] ?? null
  const progress = next ? Math.min(100, (lifetime / next.minPoints) * 100) : 100

  return {
    number: index + 1,
    current,
    next,
    nextNumber: index + 2,
    lifetime,
    progress,
    toNext: next ? next.minPoints - lifetime : 0,
  }
}

export const productName = (product: Product, lang: Lang) =>
  lang === 'hi' ? product.nameHi : product.name

export const stockTone = (stock: number) => {
  if (stock <= 0) return 'out'
  if (stock <= 5) return 'low'
  return 'in'
}

export const DELIVERY_FEE = 10

export const cartTotals = (state: AppState) => {
  const lines = state.cart.flatMap((line) => {
    const product = state.products.find((item) => item.id === line.productId)
    return product ? [{ ...line, product }] : []
  })
  const count = lines.reduce((sum, line) => sum + line.qty, 0)
  const subtotal = lines.reduce(
    (sum, line) => sum + line.product.price * line.qty,
    0,
  )
  const subtotalPoints = lines.reduce(
    (sum, line) => sum + line.product.points * line.qty,
    0,
  )
  const available = availablePoints(state)
  const deliveryFee =
    state.fulfilment === 'delivery' && lines.length > 0 ? DELIVERY_FEE : 0
  const rate = state.rules.pointsPerRupee
  const maxByRule = Math.floor(
    (subtotalPoints * state.rules.maxPctInPoints) / 100,
  )
  const maxApplicable = Math.max(0, Math.min(available, maxByRule))

  let pointsUsed = 0
  let toPay = subtotal + deliveryFee

  if (state.payWith === 'points') {
    pointsUsed = subtotalPoints
    toPay = deliveryFee
  } else if (state.payWith === 'mixed') {
    pointsUsed = Math.min(state.pointsApplied, maxApplicable)
    toPay = Math.max(0, subtotal - pointsUsed / rate) + deliveryFee
  }

  return {
    lines,
    count,
    subtotal,
    subtotalPoints,
    deliveryFee,
    pointsUsed,
    pointsValue: pointsUsed / rate,
    toPay,
    available,
    maxApplicable,
    pointsShort: Math.max(0, subtotalPoints - available),
  }
}
