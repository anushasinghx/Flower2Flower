import type { AppState, Fulfilment, PayWith } from './types'

export const setMobile = (state: AppState, mobile: string): AppState => ({
  ...state,
  pendingMobile: mobile,
})

export const changeCart = (
  state: AppState,
  productId: string,
  delta: number,
): AppState => {
  const product = state.products.find((item) => item.id === productId)
  if (!product) return state

  const existing = state.cart.find((line) => line.productId === productId)
  const qty = Math.min(product.stock, Math.max(0, (existing?.qty ?? 0) + delta))
  const others = state.cart.filter((line) => line.productId !== productId)

  return {
    ...state,
    cart: qty > 0 ? [...others, { productId, qty }] : others,
  }
}

export const setPayWith = (state: AppState, payWith: PayWith): AppState => ({
  ...state,
  payWith,
})

export const applyPoints = (state: AppState, points: number): AppState => ({
  ...state,
  pointsApplied: points,
  payWith: points > 0 ? 'mixed' : 'inr',
})

export const setFulfilment = (
  state: AppState,
  fulfilment: Fulfilment,
): AppState => ({ ...state, fulfilment })

export const setPickupTemple = (
  state: AppState,
  pickupTempleId: string,
): AppState => ({ ...state, pickupTempleId })

export const clearCart = (state: AppState): AppState => ({
  ...state,
  cart: [],
  pointsApplied: 0,
})
