import { describe, expect, it } from 'vitest'
import {
  applyPoints,
  changeCart,
  clearCart,
  setFulfilment,
  setMobile,
  setPayWith,
  setPickupTemple,
} from './actions'
import { makeState, product } from '../test/fixtures'

const withProducts = () =>
  makeState({ products: [product({ id: 'p1', stock: 3 }), product({ id: 'p2', stock: 0 })] })

describe('cart actions', () => {
  it('adds a product to the cart', () => {
    expect(changeCart(withProducts(), 'p1', 1).cart).toEqual([{ productId: 'p1', qty: 1 }])
  })

  it('increments an existing line', () => {
    const once = changeCart(withProducts(), 'p1', 1)
    expect(changeCart(once, 'p1', 1).cart).toEqual([{ productId: 'p1', qty: 2 }])
  })

  it('never exceeds available stock', () => {
    expect(changeCart(withProducts(), 'p1', 10).cart).toEqual([{ productId: 'p1', qty: 3 }])
  })

  it('cannot add an out of stock product', () => {
    expect(changeCart(withProducts(), 'p2', 1).cart).toEqual([])
  })

  it('removes the line when quantity reaches zero', () => {
    const once = changeCart(withProducts(), 'p1', 1)
    expect(changeCart(once, 'p1', -1).cart).toEqual([])
    expect(changeCart(once, 'p1', -5).cart).toEqual([])
  })

  it('ignores unknown products', () => {
    const state = withProducts()
    expect(changeCart(state, 'missing', 1)).toBe(state)
  })

  it('does not mutate the previous state', () => {
    const state = withProducts()
    changeCart(state, 'p1', 1)
    expect(state.cart).toEqual([])
  })

  it('clearCart empties cart and applied points', () => {
    const state = applyPoints(changeCart(withProducts(), 'p1', 2), 100)
    const cleared = clearCart(state)
    expect(cleared.cart).toEqual([])
    expect(cleared.pointsApplied).toBe(0)
  })
})

describe('checkout actions', () => {
  it('applying points switches to mixed payment', () => {
    const state = applyPoints(makeState(), 150)
    expect(state.pointsApplied).toBe(150)
    expect(state.payWith).toBe('mixed')
  })

  it('applying zero points switches back to rupees', () => {
    expect(applyPoints(makeState({ payWith: 'mixed' }), 0).payWith).toBe('inr')
  })

  it('sets pay method, fulfilment, pickup temple and mobile', () => {
    expect(setPayWith(makeState(), 'points').payWith).toBe('points')
    expect(setFulfilment(makeState(), 'delivery').fulfilment).toBe('delivery')
    expect(setPickupTemple(makeState(), 't9').pickupTempleId).toBe('t9')
    expect(setMobile(makeState(), '9876541234').pendingMobile).toBe('9876541234')
  })
})
