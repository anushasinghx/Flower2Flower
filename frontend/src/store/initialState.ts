import type { AppState, Devotee, Rules } from './types'

export const DEMO_OTP = '123456'
export const DEMO_ADMIN_MOBILE = '9000000000'
export const DEMO_DEVOTEE_MOBILE = '9876541234'
export const DEMO_OPERATOR_MOBILE = '9000004444'
export const DEMO_TEMPLE_MOBILE = '9000006666'

export const emptyDevotee: Devotee = {
  name: '',
  mobile: '',
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
}

export const defaultRules: Rules = {
  version: 0,
  earning: [],
  levels: [{ id: 'level1', name: 'Novice', minPoints: 0, multiplier: 1 }],
  pointsPerRupee: 10,
  requiresKyc: true,
  maxPctInPoints: 100,
  rejectionLimit: 3,
  maxDepositKg: 10,
  holdOnFlag: true,
}

export const initialState: AppState = {
  lang: 'en',
  textSize: 'normal',
  session: null,
  user: null,
  loaded: false,
  publicStats: { kgOffered: 0, co2AvoidedKg: 0, manureKg: 0, devotees: 0, verifiedTemples: 0 },
  pendingMobile: '',
  devotee: emptyDevotee,
  ledger: [],
  societies: [],
  products: [],
  cart: [],
  payWith: 'inr',
  pointsApplied: 0,
  fulfilment: 'pickup',
  pickupTempleId: '',
  orders: [],
  kycRequests: [],
  temples: [],
  rules: defaultRules,
  alerts: [],
  batches: [],
  staff: [],
  audit: [],
  exports: [],
  devotees: [],
  deposits: [],
  closedCollections: [],
  notices: [],
  operator: {
    templeId: '',
    offline: false,
    lastSync: '',
    draft: null,
    lastDepositId: '',
  },
  templeAdmin: { templeId: null },
}
