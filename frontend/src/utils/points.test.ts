import { describe, expect, it } from 'vitest'
import {
  availablePoints,
  cartTotals,
  DELIVERY_FEE,
  formatNumber,
  heldPoints,
  levelInfo,
  lifetimePoints,
  maskDocument,
  maskMobile,
  productName,
  stockTone,
} from './points'
import { defaultRules } from '../store/initialState'
import { entry, makeState, product } from '../test/fixtures'

const levels = [
  { id: 'l3', name: 'Evangelist', minPoints: 5000, multiplier: 1.2 },
  { id: 'l1', name: 'Novice', minPoints: 0, multiplier: 1 },
  { id: 'l2', name: 'Regular', minPoints: 1000, multiplier: 1 },
]

describe('formatting', () => {
  it('formats numbers with Indian grouping', () => {
    expect(formatNumber(1234567)).toBe('12,34,567')
    expect(formatNumber(0)).toBe('0')
  })

  it('masks mobile to last four digits', () => {
    expect(maskMobile('9876541234')).toBe('******1234')
  })

  it('masks documents ignoring spaces', () => {
    expect(maskDocument('1234 5678 9012')).toBe('XXXX XXXX 9012')
  })

  it('picks product name by language', () => {
    expect(productName(product(), 'en')).toBe('Organic manure')
    expect(productName(product(), 'hi')).toBe('जैविक खाद')
  })

  it.each([
    [-1, 'out'],
    [0, 'out'],
    [1, 'low'],
    [5, 'low'],
    [6, 'in'],
  ])('stock %i is %s', (stock, tone) => {
    expect(stockTone(stock)).toBe(tone)
  })
})

describe('point balances', () => {
  const ledger = [
    entry('earned', 500),
    entry('bonus', 100),
    entry('redeemed', -200),
    entry('refund', 50),
    entry('held', 300),
    entry('released', 100),
    entry('removed', -50),
    entry('rejected', 0),
  ]

  it('available sums spendable kinds plus opening balance', () => {
    const state = makeState({ ledger, devotee: { ...makeState().devotee, openingAvailable: 10 } })
    expect(availablePoints(state)).toBe(560)
  })

  it('held subtracts released and removed points', () => {
    expect(heldPoints(makeState({ ledger }))).toBe(150)
  })

  it('lifetime counts earned, bonus and released plus opening lifetime', () => {
    const state = makeState({ ledger, devotee: { ...makeState().devotee, openingLifetime: 5 } })
    expect(lifetimePoints(state)).toBe(705)
  })
})

describe('levelInfo', () => {
  it('starts at the first level with progress towards the next', () => {
    const info = levelInfo(makeState({ rules: { ...defaultRules, levels }, ledger: [entry('earned', 500)] }))
    expect(info.number).toBe(1)
    expect(info.current.name).toBe('Novice')
    expect(info.next?.name).toBe('Regular')
    expect(info.toNext).toBe(500)
    expect(info.progress).toBe(50)
  })

  it('moves up at the exact threshold even when levels are unsorted', () => {
    const info = levelInfo(makeState({ rules: { ...defaultRules, levels }, ledger: [entry('earned', 1000)] }))
    expect(info.number).toBe(2)
    expect(info.next?.name).toBe('Evangelist')
    expect(info.toNext).toBe(4000)
    expect(info.progress).toBe(20)
  })

  it('has no next level at the top', () => {
    const info = levelInfo(makeState({ rules: { ...defaultRules, levels }, ledger: [entry('earned', 9000)] }))
    expect(info.number).toBe(3)
    expect(info.next).toBeNull()
    expect(info.toNext).toBe(0)
    expect(info.progress).toBe(100)
  })
})

describe('cartTotals', () => {
  const manure = product()
  const base = (overrides = {}) =>
    makeState({
      products: [manure],
      cart: [{ productId: 'p1', qty: 2 }],
      ledger: [entry('earned', 1000)],
      ...overrides,
    })

  it('charges rupees for pickup without delivery fee', () => {
    const totals = cartTotals(base())
    expect(totals.count).toBe(2)
    expect(totals.subtotal).toBe(70)
    expect(totals.subtotalPoints).toBe(700)
    expect(totals.deliveryFee).toBe(0)
    expect(totals.toPay).toBe(70)
  })

  it('adds delivery fee for delivery', () => {
    const totals = cartTotals(base({ fulfilment: 'delivery' }))
    expect(totals.deliveryFee).toBe(DELIVERY_FEE)
    expect(totals.toPay).toBe(80)
  })

  it('does not charge delivery for empty cart', () => {
    expect(cartTotals(base({ fulfilment: 'delivery', cart: [] })).deliveryFee).toBe(0)
  })

  it('pays fully with points leaving only delivery', () => {
    const totals = cartTotals(base({ payWith: 'points', fulfilment: 'delivery' }))
    expect(totals.pointsUsed).toBe(700)
    expect(totals.toPay).toBe(10)
    expect(totals.pointsShort).toBe(0)
  })

  it('mixed payment converts points to rupees', () => {
    const totals = cartTotals(base({ payWith: 'mixed', pointsApplied: 300 }))
    expect(totals.pointsUsed).toBe(300)
    expect(totals.pointsValue).toBe(30)
    expect(totals.toPay).toBe(40)
  })

  it('mixed payment is capped by available points', () => {
    const totals = cartTotals(base({ payWith: 'mixed', pointsApplied: 5000, ledger: [entry('bonus', 100)] }))
    expect(totals.maxApplicable).toBe(100)
    expect(totals.pointsUsed).toBe(100)
    expect(totals.toPay).toBe(60)
  })

  it('mixed payment is capped by max percent rule', () => {
    const totals = cartTotals(base({ payWith: 'mixed', pointsApplied: 600, rules: { ...defaultRules, maxPctInPoints: 50 } }))
    expect(totals.maxApplicable).toBe(350)
    expect(totals.pointsUsed).toBe(350)
  })

  it('reports points short when balance is too low', () => {
    expect(cartTotals(base({ ledger: [entry('bonus', 100)] })).pointsShort).toBe(600)
  })

  it('ignores cart lines for unknown products', () => {
    const totals = cartTotals(base({ cart: [{ productId: 'gone', qty: 3 }, { productId: 'p1', qty: 1 }] }))
    expect(totals.lines).toHaveLength(1)
    expect(totals.count).toBe(1)
  })
})
