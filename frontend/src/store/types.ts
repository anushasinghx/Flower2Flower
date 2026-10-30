export type Lang = 'en' | 'hi'
export type TextSize = 'small' | 'normal' | 'large'
export type KycStatus = 'notStarted' | 'inReview' | 'verified' | 'rejected'
export type LedgerKind =
  | 'earned'
  | 'bonus'
  | 'redeemed'
  | 'refund'
  | 'held'
  | 'released'
  | 'removed'
  | 'rejected'
export type Fulfilment = 'pickup' | 'delivery'
export type PayWith = 'mixed' | 'points' | 'inr'
export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'ready'
  | 'completed'
  | 'cancelled'
export type TempleStatus = 'pending' | 'verified' | 'needsChanges'
export type TempleType = 'registered' | 'unregistered'
export type BatchStatus =
  | 'created'
  | 'composting'
  | 'curing'
  | 'ready'
  | 'closed'
export type StaffRole = 'admin' | 'operator' | 'templeAdmin'

export type Consent = {
  id: string
  label: string
  at: string
  version: string
  active: boolean
}

export type Devotee = {
  name: string
  mobile: string
  dob: string
  address: string
  kyc: KycStatus
  kycDocType: string
  kycReason: string
  societyId: string | null
  poolOn: boolean
  kgOffered: number
  co2Avoided: number
  openingAvailable: number
  openingLifetime: number
  consents: Consent[]
}

export type LedgerEntry = {
  id: string
  when: string
  title: string
  detail: string
  kind: LedgerKind
  points: number
}

export type Society = {
  id: string
  name: string
  area: string
  members: number
  poolPoints: number
  progress: number
}

export type Product = {
  id: string
  group: string
  name: string
  nameHi: string
  category: string
  pack: string
  price: number
  points: number
  stock: number
  listed: boolean
}

export type CartLine = { productId: string; qty: number }

export type OrderLine = {
  productId: string
  name: string
  pack: string
  qty: number
  price: number
  points: number
}

export type Order = {
  id: number
  mine: boolean
  customer: string
  mobile: string
  date: string
  lines: OrderLine[]
  fulfilment: Fulfilment
  templeName: string
  address: string
  payWith: PayWith
  pointsUsed: number
  inrPaid: number
  deliveryFee: number
  status: OrderStatus
  code: string
  trackingNote: string
}

export type KycRequest = {
  id: string
  name: string
  mobile: string
  docType: string
  docNumber: string
  dob: string
  consents: string
  submitted: string
  status: 'pending' | 'verified' | 'rejected'
  reason: string
  isCurrentUser: boolean
}

export type Temple = {
  id: string
  name: string
  type: TempleType
  status: TempleStatus
  address: string
  contact: string
  mobile: string
  timings: string
  badge: string
  note: string
  history: string[]
}

export type EarningRule = {
  id: string
  waste: string
  ptsPerKg: number
  maxPerDay: number
  active: boolean
  charge: number | null
}

export type Level = {
  id: string
  name: string
  minPoints: number
  multiplier: number
}

export type Rules = {
  version: number
  earning: EarningRule[]
  levels: Level[]
  pointsPerRupee: number
  requiresKyc: boolean
  maxPctInPoints: number
  rejectionLimit: number
  maxDepositKg: number
  holdOnFlag: boolean
}

export type Alert = {
  id: string
  severity: 'high' | 'medium' | 'low'
  subject: string
  rule: string
  ruleKind: 'weight' | 'rejection' | 'rapid' | 'other'
  time: string
  detail: string
  heldPoints: number
  isCurrentUser: boolean
  status: 'open' | 'resolved'
  resolution: string
}

export type BatchInput = { source: string; date: string; kg: number }
export type StockLine = { productId: string; units: number }

export type Batch = {
  id: string
  created: string
  inputs: BatchInput[]
  status: BatchStatus
  outputKg: number | null
  stockAdded: StockLine[]
  history: string[]
}

export type Staff = {
  id: string
  name: string
  mobile: string
  role: StaffRole
  status: 'active' | 'suspended'
}

export type AuditEntry = {
  id: string
  time: string
  actor: string
  role: string
  action: string
  record: string
  oldValue: string
  newValue: string
  reason: string
}

export type ExportEntry = {
  id: string
  dataset: string
  by: string
  time: string
  masked: boolean
}

export type Session = 'devotee' | 'admin' | null

export type AppState = {
  lang: Lang
  textSize: TextSize
  session: Session
  pendingMobile: string
  devotee: Devotee
  ledger: LedgerEntry[]
  societies: Society[]
  products: Product[]
  cart: CartLine[]
  payWith: PayWith
  pointsApplied: number
  fulfilment: Fulfilment
  pickupTempleId: string
  orders: Order[]
  kycRequests: KycRequest[]
  temples: Temple[]
  rules: Rules
  alerts: Alert[]
  batches: Batch[]
  staff: Staff[]
  audit: AuditEntry[]
  exports: ExportEntry[]
}
