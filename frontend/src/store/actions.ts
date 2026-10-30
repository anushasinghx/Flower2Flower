import type {
  AppState,
  AuditEntry,
  Batch,
  BatchStatus,
  Fulfilment,
  Order,
  OrderStatus,
  PayWith,
  Product,
  Rules,
  Staff,
  StockLine,
  Temple,
} from './types'
import {
  DEMO_ADMIN_MOBILE,
  DEMO_DEVOTEE_MOBILE,
  initialState,
} from '../services/mockData'
import { cartTotals, nowLabel, todayLabel } from '../utils/points'

const ADMIN_NAME = 'Anita Desai'
const uid = (prefix: string) =>
  `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`

const withAudit = (
  state: AppState,
  entry: Omit<AuditEntry, 'id' | 'time' | 'actor' | 'role'> &
    Partial<Pick<AuditEntry, 'actor' | 'role'>>,
): AppState => ({
  ...state,
  audit: [
    {
      id: uid('x'),
      time: nowLabel(),
      actor: ADMIN_NAME,
      role: 'Admin',
      ...entry,
    },
    ...state.audit,
  ],
})

export const resetDemo = (state: AppState): AppState => ({
  ...initialState,
  lang: state.lang,
  textSize: state.textSize,
  session: state.session,
})

export const setMobile = (state: AppState, mobile: string): AppState => ({
  ...state,
  pendingMobile: mobile,
})

export const isReturningMobile = (mobile: string) =>
  mobile === DEMO_DEVOTEE_MOBILE || mobile === DEMO_ADMIN_MOBILE

export const completeLogin = (state: AppState): AppState => {
  const mobile = state.pendingMobile

  if (mobile === DEMO_ADMIN_MOBILE) return { ...state, session: 'admin' }
  if (mobile === DEMO_DEVOTEE_MOBILE || mobile === state.devotee.mobile) {
    return { ...state, session: 'devotee' }
  }

  return {
    ...state,
    session: 'devotee',
    ledger: [],
    cart: [],
    payWith: 'inr',
    orders: state.orders.map((order) => ({ ...order, mine: false })),
    alerts: state.alerts.map((alert) => ({ ...alert, isCurrentUser: false })),
    kycRequests: state.kycRequests.map((request) => ({
      ...request,
      isCurrentUser: false,
    })),
    devotee: {
      name: '',
      mobile,
      dob: '',
      address: '',
      kyc: 'notStarted',
      kycDocType: '',
      kycReason: '',
      societyId: null,
      poolOn: false,
      kgOffered: 0,
      co2Avoided: 0,
      openingAvailable: 0,
      openingLifetime: 0,
      consents: [],
    },
  }
}

export const logout = (state: AppState): AppState => ({
  ...state,
  session: null,
  pendingMobile: '',
})

export const saveProfile = (
  state: AppState,
  profile: { name: string; dob: string; address: string },
): AppState => ({
  ...state,
  devotee: {
    ...state.devotee,
    ...profile,
    consents: state.devotee.consents.length
      ? state.devotee.consents
      : [
          {
            id: 'c1',
            label: 'Nirmalya deposit and points rules',
            at: nowLabel(),
            version: 'v1',
            active: true,
          },
          {
            id: 'c2',
            label: 'Data and KYC processing',
            at: nowLabel(),
            version: 'v1',
            active: true,
          },
        ],
  },
})

export const setConsent = (
  state: AppState,
  id: string,
  active: boolean,
): AppState => ({
  ...state,
  devotee: {
    ...state.devotee,
    consents: state.devotee.consents.map((consent) =>
      consent.id === id ? { ...consent, active, at: nowLabel() } : consent,
    ),
  },
})

export const submitKyc = (
  state: AppState,
  doc: { docType: string; docNumber: string },
): AppState => {
  const { devotee } = state
  const others = state.kycRequests.filter((item) => !item.isCurrentUser)

  return {
    ...state,
    devotee: {
      ...devotee,
      kyc: 'inReview',
      kycDocType: doc.docType,
      kycReason: '',
    },
    kycRequests: [
      {
        id: `U${130 + others.length}`,
        name: devotee.name || 'New devotee',
        mobile: devotee.mobile,
        docType: doc.docType,
        docNumber: doc.docNumber,
        dob: devotee.dob || '01/01/1990',
        consents: '3 of 3',
        submitted: todayLabel(),
        status: 'pending',
        reason: '',
        isCurrentUser: true,
      },
      ...others,
    ],
  }
}

export const setSociety = (
  state: AppState,
  societyId: string | null,
  poolOn: boolean,
): AppState => ({
  ...state,
  devotee: { ...state.devotee, societyId, poolOn },
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

export const nextOrderId = (state: AppState) =>
  Math.max(...state.orders.map((order) => order.id), 1000) + 1

export const placeOrder = (
  state: AppState,
  orderId: number,
  address: string,
): AppState => {
  const totals = cartTotals(state)
  const temple = state.temples.find((item) => item.id === state.pickupTempleId)
  const order: Order = {
    id: orderId,
    mine: true,
    customer: state.devotee.name || 'Devotee',
    mobile: state.devotee.mobile,
    date: todayLabel(),
    lines: totals.lines.map((line) => ({
      productId: line.productId,
      name: line.product.name,
      pack: line.product.pack,
      qty: line.qty,
      price: line.product.price,
      points: line.product.points,
    })),
    fulfilment: state.fulfilment,
    templeName: state.fulfilment === 'pickup' ? (temple?.name ?? '') : '',
    address: state.fulfilment === 'delivery' ? address : '',
    payWith: state.payWith,
    pointsUsed: totals.pointsUsed,
    inrPaid: totals.toPay,
    deliveryFee: totals.deliveryFee,
    status: 'new',
    code: String(1000 + (orderId * 37) % 9000),
    trackingNote: '',
  }

  return {
    ...state,
    orders: [order, ...state.orders],
    cart: [],
    pointsApplied: 0,
    products: state.products.map((product) => {
      const line = state.cart.find((item) => item.productId === product.id)
      return line ? { ...product, stock: product.stock - line.qty } : product
    }),
    ledger:
      totals.pointsUsed > 0
        ? [
            {
              id: uid('l'),
              when: todayLabel(),
              title: `Order #${orderId}`,
              detail: 'Redeemed',
              kind: 'redeemed',
              points: -totals.pointsUsed,
            },
            ...state.ledger,
          ]
        : state.ledger,
  }
}

export const decideKyc = (
  state: AppState,
  id: string,
  approve: boolean,
  reason: string,
): AppState => {
  const request = state.kycRequests.find((item) => item.id === id)
  if (!request) return state

  let next: AppState = {
    ...state,
    kycRequests: state.kycRequests.map((item) =>
      item.id === id
        ? { ...item, status: approve ? 'verified' : 'rejected', reason }
        : item,
    ),
  }

  if (request.isCurrentUser) {
    const gotBonus = state.ledger.some((entry) => entry.kind === 'bonus')
    next = {
      ...next,
      devotee: {
        ...next.devotee,
        kyc: approve ? 'verified' : 'rejected',
        kycReason: reason,
      },
      ledger:
        approve && !gotBonus
          ? [
              {
                id: uid('l'),
                when: todayLabel(),
                title: 'Welcome bonus',
                detail: 'KYC verified',
                kind: 'bonus',
                points: 100,
              },
              ...next.ledger,
            ]
          : next.ledger,
    }
  }

  return withAudit(next, {
    action: approve ? 'KYC approved' : 'KYC rejected',
    record: `User ${id}`,
    oldValue: 'Pending',
    newValue: approve ? 'Verified' : 'Rejected',
    reason: reason || 'Document checked',
  })
}

export const logUnmask = (state: AppState, id: string): AppState =>
  withAudit(state, {
    action: 'Viewed unmasked data',
    record: `User ${id}`,
    oldValue: 'Masked',
    newValue: 'Unmasked',
    reason: 'KYC document check',
  })

export const decideTemple = (
  state: AppState,
  id: string,
  status: Temple['status'],
  badge: string,
  note: string,
): AppState =>
  withAudit(
    {
      ...state,
      temples: state.temples.map((temple) =>
        temple.id === id
          ? {
              ...temple,
              status,
              badge,
              note,
              history: [
                ...temple.history,
                `${
                  status === 'verified' ? 'Verified' : 'Changes requested'
                } by Admin, ${todayLabel()}`,
              ],
            }
          : temple,
      ),
    },
    {
      action: status === 'verified' ? 'Temple verified' : 'Temple changes asked',
      record: id,
      oldValue: 'Pending',
      newValue: status === 'verified' ? badge : 'Needs changes',
      reason: note || 'Checklist complete',
    },
  )

export const addTemple = (
  state: AppState,
  temple: Pick<Temple, 'name' | 'type' | 'address' | 'contact' | 'mobile'>,
): AppState =>
  withAudit(
    {
      ...state,
      temples: [
        {
          ...temple,
          id: uid('t'),
          status: 'pending',
          timings: 'Not set yet',
          badge: '',
          note: '',
          history: [`Added by Admin, ${todayLabel()}`],
        },
        ...state.temples,
      ],
    },
    {
      action: 'Temple added',
      record: temple.name,
      oldValue: 'None',
      newValue: 'Pending',
      reason: 'Added from the temple registry',
    },
  )

export const publishRules = (state: AppState, rules: Rules): AppState =>
  withAudit(
    { ...state, rules: { ...rules, version: state.rules.version + 1 } },
    {
      action: 'Rule changed',
      record: 'Points rules and levels',
      oldValue: `Version ${state.rules.version}`,
      newValue: `Version ${state.rules.version + 1}`,
      reason: 'Published from rules screen',
    },
  )

export const resolveAlert = (
  state: AppState,
  id: string,
  action: 'release' | 'remove' | 'dismiss',
  note: string,
): AppState => {
  const alert = state.alerts.find((item) => item.id === id)
  if (!alert) return state

  let ledger = state.ledger
  if (alert.isCurrentUser && alert.heldPoints > 0 && action !== 'dismiss') {
    ledger = [
      {
        id: uid('l'),
        when: todayLabel(),
        title: action === 'release' ? 'Held points released' : 'Held points removed',
        detail: note,
        kind: action === 'release' ? 'released' : 'removed',
        points: action === 'release' ? alert.heldPoints : -alert.heldPoints,
      },
      ...ledger,
    ]
  }

  const labels = {
    release: 'Points released',
    remove: 'Points removed',
    dismiss: 'Alert dismissed',
  }

  return withAudit(
    {
      ...state,
      ledger,
      alerts: state.alerts.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'resolved',
              resolution: note,
              heldPoints: action === 'dismiss' ? item.heldPoints : 0,
            }
          : item,
      ),
    },
    {
      action: labels[action],
      record: `Alert ${id}`,
      oldValue: 'Open',
      newValue: 'Resolved',
      reason: note,
    },
  )
}

export const createBatch = (
  state: AppState,
  batch: Pick<Batch, 'inputs'>,
): AppState => {
  const highest = Math.max(
    ...state.batches.map((item) => Number(item.id.slice(1))),
  )
  const id = `B${String(highest + 1).padStart(4, '0')}`

  return withAudit(
    {
      ...state,
      batches: [
        {
          id,
          created: todayLabel(),
          inputs: batch.inputs,
          status: 'created',
          outputKg: null,
          stockAdded: [],
          history: [`Created by Admin, ${todayLabel()}`],
        },
        ...state.batches,
      ],
    },
    {
      action: 'Batch created',
      record: id,
      oldValue: 'None',
      newValue: 'Created',
      reason: 'Waste arrived at processing unit',
    },
  )
}

export const moveBatch = (
  state: AppState,
  id: string,
  to: BatchStatus,
  label: string,
  reason: string,
): AppState => {
  const batch = state.batches.find((item) => item.id === id)
  if (!batch) return state

  return withAudit(
    {
      ...state,
      batches: state.batches.map((item) =>
        item.id === id
          ? {
              ...item,
              status: to,
              history: [
                ...item.history,
                `Moved to ${label}, ${todayLabel()}${
                  reason ? ` (${reason})` : ''
                }`,
              ],
            }
          : item,
      ),
    },
    {
      action: 'Batch status changed',
      record: id,
      oldValue: batch.status,
      newValue: to,
      reason: reason || 'Next stage',
    },
  )
}

export const updateStock = (
  state: AppState,
  id: string,
  outputKg: number,
  lines: StockLine[],
): AppState =>
  withAudit(
    {
      ...state,
      batches: state.batches.map((item) =>
        item.id === id
          ? {
              ...item,
              outputKg,
              stockAdded: [...item.stockAdded, ...lines],
              history: [
                ...item.history,
                `Stock updated, ${todayLabel()}`,
              ],
            }
          : item,
      ),
      products: state.products.map((product) => {
        const added = lines
          .filter((line) => line.productId === product.id)
          .reduce((sum, line) => sum + line.units, 0)
        return added ? { ...product, stock: product.stock + added } : product
      }),
    },
    {
      action: 'Sellable stock updated',
      record: id,
      oldValue: 'Output not recorded',
      newValue: `${outputKg} kg`,
      reason: 'Batch output',
    },
  )

export const saveProduct = (state: AppState, product: Product): AppState => {
  const exists = state.products.some((item) => item.id === product.id)

  return withAudit(
    {
      ...state,
      products: exists
        ? state.products.map((item) =>
            item.id === product.id ? product : item,
          )
        : [product, ...state.products],
    },
    {
      action: exists ? 'Product changed' : 'Product added',
      record: `${product.name} ${product.pack}`,
      oldValue: exists ? 'Previous details' : 'None',
      newValue: product.listed ? 'Listed' : 'Hidden',
      reason: 'Catalogue edit',
    },
  )
}

export const setOrderStatus = (
  state: AppState,
  id: number,
  status: OrderStatus,
  trackingNote = '',
): AppState => {
  const order = state.orders.find((item) => item.id === id)
  if (!order) return state

  const cancelling = status === 'cancelled'
  const refund = cancelling && order.mine && order.pointsUsed > 0

  return withAudit(
    {
      ...state,
      orders: state.orders.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              trackingNote: trackingNote || item.trackingNote,
            }
          : item,
      ),
      products: cancelling
        ? state.products.map((product) => {
            const line = order.lines.find(
              (item) => item.productId === product.id,
            )
            return line
              ? { ...product, stock: product.stock + line.qty }
              : product
          })
        : state.products,
      ledger: refund
        ? [
            {
              id: uid('l'),
              when: todayLabel(),
              title: `Order #${id}`,
              detail: 'Cancelled, points refunded',
              kind: 'refund',
              points: order.pointsUsed,
            },
            ...state.ledger,
          ]
        : state.ledger,
    },
    {
      action: 'Order status changed',
      record: `Order #${id}`,
      oldValue: order.status,
      newValue: status,
      reason: trackingNote || 'Order update',
    },
  )
}

export const saveStaff = (state: AppState, staff: Staff): AppState => {
  const existing = state.staff.find((item) => item.id === staff.id)

  return withAudit(
    {
      ...state,
      staff: existing
        ? state.staff.map((item) => (item.id === staff.id ? staff : item))
        : [...state.staff, staff],
    },
    {
      action: existing ? 'Role changed' : 'Staff invited',
      record: staff.name,
      oldValue: existing ? `${existing.role}, ${existing.status}` : 'None',
      newValue: `${staff.role}, ${staff.status}`,
      reason: 'Users and roles',
    },
  )
}

export const logExport = (
  state: AppState,
  dataset: string,
  reason: string,
  masked: boolean,
): AppState =>
  withAudit(
    {
      ...state,
      exports: [
        {
          id: uid('ex'),
          dataset,
          by: ADMIN_NAME,
          time: nowLabel(),
          masked,
        },
        ...state.exports,
      ],
    },
    {
      action: 'Data export',
      record: `${dataset} CSV`,
      oldValue: 'None',
      newValue: masked ? 'Exported, masked' : 'Exported, unmasked',
      reason,
    },
  )
