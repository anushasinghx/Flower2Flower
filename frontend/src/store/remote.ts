import { api, dataUrlToBlob, fetchAll, query, setToken } from '../services/api'
import { dayLabel } from '../features/history/historyHelpers'
import type {
  Alert,
  AppState,
  AuditEntry,
  Batch,
  BatchStatus,
  ClosedCollection,
  Consent,
  Deposit,
  DepositStatus,
  DevoteeSummary,
  EarningRule,
  ExportEntry,
  Fulfilment,
  KycRequest,
  KycStatus,
  LedgerEntry,
  LedgerKind,
  Level,
  Notice,
  Order,
  OrderStatus,
  PayWith,
  PendingDeposit,
  Product,
  PublicStats,
  Rules,
  Session,
  SessionUser,
  Society,
  Staff,
  StaffRole,
  StockLine,
  Temple,
  TempleType,
} from './types'
import { initialState } from './initialState'

type Patch = (state: AppState) => AppState

type ProductView = {
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

type RulesView = {
  version: number
  earning: { id: string; waste: string; ptsPerKg: number; maxPerDay: number; active: boolean; charge: number | null }[]
  levels: { id: string; name: string; minPoints: number; multiplier: number }[]
  pointsPerRupee: number
  requiresKyc: boolean
  maxPctInPoints: number
  rejectionLimit: number
  maxDepositKg: number
  holdOnFlag: boolean
}

type SocietyView = { id: string; name: string; area: string; members: number; poolPoints: number; progress: number }

type PublicTempleView = { id: string; name: string; type: TempleType; address: string; timings: string; badge: string }

type TempleView = PublicTempleView & {
  status: Temple['status']
  contact: string
  mobileNumber: string
  note: string
  regNo: string
  deity: string
  photoFileId: string | null
  submittedAtUtc: string | null
  documents: { docType: string; fileId: string }[]
  history: { text: string; createdAtUtc: string }[]
}

type DepositView = {
  id: number
  code: string
  capturedAtUtc: string
  devoteeUserId: string
  devoteeName: string
  mobileNumber: string
  templeId: string
  templeName: string
  waste: string
  kg: number
  points: number
  charge: number
  status: DepositStatus
  reason: string
  note: string
  conflict: boolean
  clientId: string | null
}

type LedgerView = {
  id: string
  kind: LedgerKind
  points: number
  title: string
  detail: string
  depositCode: string | null
  createdAtUtc: string
}

type OrderView = {
  id: number
  customer: string
  mobileNumber: string
  createdAtUtc: string
  lines: { productId: string; name: string; pack: string; qty: number; price: number; points: number }[]
  fulfilment: Fulfilment
  templeName: string
  address: string
  payWith: PayWith
  pointsUsed: number
  inrPaid: number
  deliveryFee: number
  status: OrderStatus
  pickupCode: string | null
  trackingNote: string
}

type AlertView = {
  id: string
  severity: Alert['severity']
  subject: string
  rule: string
  ruleKind: Alert['ruleKind']
  detail: string
  heldPoints: number
  status: Alert['status']
  resolution: string
  createdAtUtc: string
}

type BatchView = {
  id: number
  code: string
  createdAtUtc: string
  status: BatchStatus
  outputKg: number | null
  inputs: { source: string; date: string; kg: number }[]
  stockAdded: { productId: string; units: number }[]
  history: { text: string; createdAtUtc: string }[]
}

type CollectionView = { id: string; templeId: string; source: string; date: string; kg: number; used: boolean }

type KycView = {
  id: string
  userId: string
  name: string
  maskedMobile: string
  docType: string
  docNumber: string
  dateOfBirth: string | null
  consents: string
  submittedAtUtc: string
  status: KycStatus
  reason: string
}

type StaffView = { id: string; name: string | null; mobileNumber: string; role: StaffRole | null; status: 'active' | 'suspended' }

type AuditView = {
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

type ExportView = { id: string; dataset: string; by: string; time: string; masked: boolean }

type ProfileView = {
  userId: string
  mobileNumber: string
  fullName: string | null
  dateOfBirth: string | null
  address: string | null
  userType: string
  profileComplete: boolean
  kyc: { status: KycStatus; docType: string; reason: string }
  society: { id: string } | null
  poolOn: boolean
  language: 'en' | 'hi'
  textSize: AppState['textSize']
  consents: { id: string; label: string; version: string; active: boolean; at: string }[]
  temple: { id: string } | null
}

type PointsView = { available: number; held: number; lifetime: number; kgOffered: number; co2Avoided: number }

type NoticeView = { id: string; kind: DepositStatus; kg: number; waste: string; points: number; temple: string; reason: string }

export type AuthResponse = {
  accessToken: string
  userId: string
  mobileNumber: string
  fullName: string | null
  userType: string
  isNewUser: boolean
  profileComplete: boolean
}

export type DepositQuote = {
  eligible: boolean
  levelNumber: number
  multiplier: number
  eligibleKg: number
  basePoints: number
  points: number
  charge: number
  overMax: boolean
  willHold: boolean
  flagged: boolean
  rejectionsThisWeek: number
  rejectionLimit: number
}

export type DashboardView = {
  range: string
  kpis: { devotees: number; devoteesDelta: number; kg: number; deposits: number; carbonTonnes: number; retention: number }
  collectionByDay: { date: string; day: string; kg: number }[]
  busiestDay: { date: string; day: string; kg: number } | null
  retentionCohorts: { cohort: string; weekStart: string; size: number; values: (number | null)[] }[]
  queues: { kycPending: number; openAlerts: number; activeBatches: number; ordersToFulfil: number; templesPending: number }
}

export const shortDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
      })
    : ''

export const dateTime = (iso: string) => {
  const date = new Date(iso)
  return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

const dobLabel = (iso: string | null) => {
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

const spendable: LedgerKind[] = ['earned', 'bonus', 'redeemed', 'refund', 'released']
const lifetimeKinds: LedgerKind[] = ['earned', 'bonus', 'released']

export const sessionFor = (userType: string): Exclude<Session, null> => {
  if (userType === 'admin' || userType === 'superAdmin') return 'admin'
  if (userType === 'operator') return 'operator'
  if (userType === 'templeAdmin') return 'templeAdmin'
  return 'devotee'
}

export const homeFor = (auth: AuthResponse) => {
  const session = sessionFor(auth.userType)
  if (session === 'admin') return '/admin'
  if (session === 'operator') return '/operator'
  if (session === 'templeAdmin') return '/temple'
  return auth.profileComplete ? '/app' : '/onboarding/profile'
}

const toProduct = (item: ProductView): Product => ({
  id: item.id,
  group: item.group,
  name: item.name,
  nameHi: item.nameHi || item.name,
  category: item.category,
  pack: item.pack,
  price: Number(item.price),
  points: item.points,
  stock: item.stock,
  listed: item.listed,
})

const toRules = (item: RulesView): Rules => ({
  version: item.version,
  earning: item.earning.map(
    (rule): EarningRule => ({
      id: rule.id,
      waste: rule.waste,
      ptsPerKg: rule.ptsPerKg,
      maxPerDay: Number(rule.maxPerDay),
      active: rule.active,
      charge: rule.charge === null || rule.charge === undefined ? null : Number(rule.charge),
    }),
  ),
  levels: item.levels.length
    ? item.levels.map((level): Level => ({
        id: level.id,
        name: level.name,
        minPoints: level.minPoints,
        multiplier: Number(level.multiplier),
      }))
    : initialState.rules.levels,
  pointsPerRupee: item.pointsPerRupee,
  requiresKyc: item.requiresKyc,
  maxPctInPoints: item.maxPctInPoints,
  rejectionLimit: item.rejectionLimit,
  maxDepositKg: Number(item.maxDepositKg),
  holdOnFlag: item.holdOnFlag,
})

const toSociety = (item: SocietyView): Society => ({
  id: item.id,
  name: item.name,
  area: item.area,
  members: item.members,
  poolPoints: item.poolPoints,
  progress: Math.round(Number(item.progress)),
})

const fromPublicTemple = (item: PublicTempleView): Temple => ({
  id: item.id,
  name: item.name,
  type: item.type,
  status: 'verified',
  address: item.address,
  contact: '',
  mobile: '',
  timings: item.timings,
  badge: item.badge,
  note: '',
  history: [],
})

export const toTemple = (item: TempleView): Temple => ({
  id: item.id,
  name: item.name,
  type: item.type,
  status: item.status,
  address: item.address,
  contact: item.contact,
  mobile: item.mobileNumber,
  timings: item.timings,
  badge: item.badge,
  note: item.note,
  history: item.history.map((event) => `${event.text}, ${shortDate(event.createdAtUtc)}`),
  regNo: item.regNo,
  deity: item.deity,
  docs: item.documents.map((doc) => doc.docType),
  documents: item.documents.map((doc) => ({ docType: doc.docType, fileId: doc.fileId })),
  photoFileId: item.photoFileId,
  submitted: shortDate(item.submittedAtUtc),
})

export const toDeposit = (item: DepositView): Deposit => ({
  id: item.code,
  at: item.capturedAtUtc,
  mobile: item.mobileNumber,
  name: item.devoteeName,
  templeId: item.templeId,
  waste: item.waste,
  kg: Number(item.kg),
  points: item.points,
  charge: Number(item.charge),
  status: item.status,
  reason: item.reason,
  note: item.note,
  synced: true,
  conflict: item.conflict,
  devoteeUserId: item.devoteeUserId,
})

const toLedger = (item: LedgerView): LedgerEntry => ({
  id: item.id,
  when: dayLabel(item.createdAtUtc),
  title: item.title,
  detail: item.detail,
  kind: item.kind,
  points: item.points,
  depositId: item.depositCode ?? undefined,
})

const toOrder = (item: OrderView, mine: boolean): Order => ({
  id: item.id,
  mine,
  customer: item.customer,
  mobile: item.mobileNumber,
  date: shortDate(item.createdAtUtc),
  lines: item.lines.map((line) => ({ ...line, price: Number(line.price) })),
  fulfilment: item.fulfilment,
  templeName: item.templeName,
  address: item.address,
  payWith: item.payWith,
  pointsUsed: item.pointsUsed,
  inrPaid: Number(item.inrPaid),
  deliveryFee: Number(item.deliveryFee),
  status: item.status,
  code: item.pickupCode ?? '',
  trackingNote: item.trackingNote,
})

const toAlert = (item: AlertView): Alert => ({
  id: item.id,
  severity: item.severity,
  subject: item.subject,
  rule: item.rule,
  ruleKind: item.ruleKind,
  time: dateTime(item.createdAtUtc),
  detail: item.detail,
  heldPoints: item.heldPoints,
  isCurrentUser: false,
  status: item.status,
  resolution: item.resolution,
})

const toBatch = (item: BatchView): Batch => ({
  id: item.code,
  created: shortDate(item.createdAtUtc),
  inputs: item.inputs.map((input) => ({ source: input.source, date: shortDate(input.date), kg: Number(input.kg) })),
  status: item.status,
  outputKg: item.outputKg === null ? null : Number(item.outputKg),
  stockAdded: item.stockAdded.map((line) => ({ productId: line.productId, units: line.units })),
  history: item.history.map((event) => `${event.text}, ${shortDate(event.createdAtUtc)}`),
})

const toCollection = (item: CollectionView): ClosedCollection => ({
  id: item.id,
  source: item.source,
  date: shortDate(item.date),
  kg: Number(item.kg),
  used: item.used,
})

const toKyc = (item: KycView): KycRequest => ({
  id: item.id,
  userId: item.userId,
  name: item.name,
  mobile: item.maskedMobile,
  docType: item.docType,
  docNumber: item.docNumber,
  dob: dobLabel(item.dateOfBirth),
  consents: item.consents,
  submitted: shortDate(item.submittedAtUtc),
  status: item.status === 'inReview' || item.status === 'notStarted' ? 'pending' : item.status,
  reason: item.reason,
  isCurrentUser: false,
})

const toStaff = (item: StaffView): Staff => ({
  id: item.id,
  name: item.name ?? '',
  mobile: item.mobileNumber,
  role: item.role ?? 'admin',
  status: item.status,
})

const toAudit = (item: AuditView): AuditEntry => ({ ...item, time: dateTime(item.time), at: item.time })

const toExport = (item: ExportView): ExportEntry => ({
  id: item.id,
  dataset: item.dataset,
  by: item.by,
  time: dateTime(item.time),
  masked: item.masked,
})

const toNotice = (item: NoticeView): Notice => ({ ...item, kg: Number(item.kg) })

const sumKinds = (ledger: LedgerEntry[], kinds: LedgerKind[]) =>
  ledger.filter((entry) => kinds.includes(entry.kind)).reduce((sum, entry) => sum + entry.points, 0)

const keepCart = (state: AppState, products: Product[]) =>
  state.cart.filter((line) => products.some((product) => product.id === line.productId && product.listed))

const pickTemple = (current: string, temples: Temple[]) =>
  temples.some((temple) => temple.id === current && temple.status === 'verified')
    ? current
    : (temples.find((temple) => temple.status === 'verified')?.id ?? '')

const loadShared = async (admin: boolean) => {
  const [stats, rules, societies, products, publicTemples] = await Promise.all([
    api.get<PublicStats>('/public/stats'),
    api.get<RulesView>(admin ? '/admin/rules' : '/rules'),
    api.get<SocietyView[]>('/societies'),
    api.get<ProductView[]>(admin ? '/admin/products' : '/products'),
    api.get<PublicTempleView[]>('/public/temples'),
  ])
  return {
    publicStats: stats,
    rules: toRules(rules),
    societies: societies.map(toSociety),
    products: products.map(toProduct),
    publicTemples: publicTemples.map(fromPublicTemple),
  }
}

const loadDevotee = async () => {
  const [profile, points, ledger, deposits, notices, orders] = await Promise.all([
    api.get<ProfileView>('/me'),
    api.get<PointsView>('/me/points'),
    fetchAll<LedgerView>('/me/ledger'),
    fetchAll<DepositView>('/me/deposits'),
    api.get<NoticeView[]>('/me/notices'),
    api.get<OrderView[]>('/orders'),
  ])
  const entries = ledger.map(toLedger)
  return { profile, points, ledger: entries, deposits: deposits.map(toDeposit), notices: notices.map(toNotice), orders: orders.map((order) => toOrder(order, true)) }
}

const loadAdmin = async () => {
  const [kyc, temples, alerts, batches, collections, orders, staff, audit, exports, deposits] = await Promise.all([
    fetchAll<KycView>('/admin/kyc'),
    api.get<{ items: TempleView[] }>('/admin/temples'),
    api.get<{ items: AlertView[] }>('/admin/alerts'),
    api.get<{ items: BatchView[] }>('/admin/batches'),
    api.get<CollectionView[]>('/admin/collections'),
    fetchAll<OrderView>('/admin/orders'),
    api.get<StaffView[]>('/admin/staff'),
    fetchAll<AuditView>('/admin/audit'),
    api.get<ExportView[]>('/admin/exports'),
    fetchAll<DepositView>('/admin/deposits'),
  ])
  return {
    kycRequests: kyc.map(toKyc),
    temples: temples.items.map(toTemple),
    alerts: alerts.items.map(toAlert),
    batches: batches.items.map(toBatch),
    closedCollections: collections.map(toCollection),
    orders: orders.map((order) => toOrder(order, false)),
    staff: staff.map(toStaff),
    audit: audit.map(toAudit),
    exports: exports.map(toExport),
    deposits: deposits.map(toDeposit),
  }
}

const loadOperator = async (templeId: string) => {
  const temples = (await api.get<PublicTempleView[]>('/operator/temples')).map(fromPublicTemple)
  const chosen = pickTemple(templeId, temples)
  if (!chosen) return { temples, templeId: '', deposits: [] as Deposit[], closed: null as ClosedCollection | null }
  const [deposits, summary] = await Promise.all([
    fetchAll<DepositView>('/operator/deposits', { templeId: chosen }),
    api.get<{ closedCollection: CollectionView | null }>(`/operator/summary${query({ templeId: chosen })}`),
  ])
  return {
    temples,
    templeId: chosen,
    deposits: deposits.map(toDeposit),
    closed: summary.closedCollection ? toCollection(summary.closedCollection) : null,
  }
}

const loadTemple = async () => {
  let mine: Temple | null = null
  try {
    mine = toTemple(await api.get<TempleView>('/temple/me'))
  } catch (error) {
    if ((error as { status?: number }).status !== 404) throw error
  }
  const deposits = mine ? await fetchAll<DepositView>('/temple/me/deposits') : []
  return { mine, deposits: deposits.map(toDeposit) }
}

export const loadForSession = async (session: Session, templeId: string): Promise<Patch> => {
  const shared = await loadShared(session === 'admin')
  const base = (state: AppState): AppState => ({
    ...state,
    loaded: true,
    publicStats: shared.publicStats,
    rules: shared.rules,
    societies: shared.societies,
    products: shared.products,
    cart: keepCart(state, shared.products),
  })

  if (session === 'devotee') {
    const data = await loadDevotee()
    return (state) => {
      if (state.session !== session) return state
      const next = base(state)
      const { profile, points } = data
      return {
        ...next,
        temples: shared.publicTemples,
        pickupTempleId: pickTemple(state.pickupTempleId, shared.publicTemples),
        user: { userId: profile.userId, name: profile.fullName ?? '', mobile: profile.mobileNumber, userType: profile.userType },
        devotee: {
          name: profile.fullName ?? '',
          mobile: profile.mobileNumber,
          dob: profile.dateOfBirth ?? '',
          address: profile.address ?? '',
          kyc: profile.kyc.status,
          kycDocType: profile.kyc.docType,
          kycReason: profile.kyc.reason,
          societyId: profile.society?.id ?? null,
          poolOn: profile.poolOn,
          kgOffered: Number(points.kgOffered),
          co2Avoided: Number(points.co2Avoided),
          openingAvailable: points.available - sumKinds(data.ledger, spendable),
          openingLifetime: points.lifetime - sumKinds(data.ledger, lifetimeKinds),
          consents: profile.consents.map(
            (consent): Consent => ({ id: consent.id, label: consent.label, at: dateTime(consent.at), version: consent.version, active: consent.active }),
          ),
        },
        ledger: data.ledger,
        deposits: data.deposits,
        notices: data.notices,
        orders: data.orders,
        payWith: profile.kyc.status === 'verified' ? state.payWith : 'inr',
      }
    }
  }

  if (session === 'admin') {
    const data = await loadAdmin()
    return (state) => (state.session !== session ? state : { ...base(state), ...data })
  }

  if (session === 'operator') {
    const data = await loadOperator(templeId)
    return (state) => {
      if (state.session !== session) return state
      const queued = state.deposits.filter((deposit) => !deposit.synced)
      return {
        ...base(state),
        temples: data.temples,
        deposits: [...queued, ...data.deposits],
        closedCollections: data.closed ? [data.closed] : [],
        operator: { ...state.operator, templeId: data.templeId },
      }
    }
  }

  if (session === 'templeAdmin') {
    const data = await loadTemple()
    return (state) => {
      if (state.session !== session) return state
      const others = shared.publicTemples.filter((temple) => temple.id !== data.mine?.id)
      return {
        ...base(state),
        temples: data.mine ? [data.mine, ...others] : others,
        deposits: data.deposits,
        templeAdmin: { templeId: data.mine?.id ?? null },
      }
    }
  }

  return (state) =>
    state.session !== null
      ? state
      : {
          ...base(state),
          temples: shared.publicTemples,
          pickupTempleId: pickTemple(state.pickupTempleId, shared.publicTemples),
        }
}

export const auth = {
  sendOtp: (mobile: string) => api.post('/auth/login', { mobileNumber: mobile }),
  verify: async (mobile: string, otp: string, createAccount = true) => {
    const response = await api.post<AuthResponse>('/auth/login/verify-otp', { mobileNumber: mobile, otp, createAccount })
    setToken(response.accessToken)
    return response
  },
  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      return
    } finally {
      setToken('')
    }
  },
}

export const signedIn = (state: AppState, response: AuthResponse, session: Exclude<Session, null>): AppState => {
  const user: SessionUser = {
    userId: response.userId,
    name: response.fullName ?? '',
    mobile: response.mobileNumber,
    userType: response.userType,
  }
  const keepCartFromGuest = session === 'devotee' ? state.cart : []
  return {
    ...initialState,
    lang: state.lang,
    textSize: state.textSize,
    products: state.products,
    rules: state.rules,
    societies: state.societies,
    temples: state.temples,
    publicStats: state.publicStats,
    pickupTempleId: state.pickupTempleId,
    cart: keepCartFromGuest,
    session,
    user,
    loaded: false,
    pendingMobile: response.mobileNumber,
  }
}

export const signedOut = (state: AppState): AppState => ({
  ...initialState,
  lang: state.lang,
  textSize: state.textSize,
  products: state.products.filter((product) => product.listed),
  publicStats: state.publicStats,
  societies: state.societies,
  rules: state.rules,
  temples: state.temples.filter((temple) => temple.status === 'verified'),
  loaded: true,
})

const uploadFile = async (file: Blob, purpose: string, name?: string) =>
  (await api.upload<{ id: string }>(file, purpose, name)).id

export const devotee = {
  saveProfile: (profile: { name: string; dob: string; address: string }) =>
    api.put('/me/profile', {
      fullName: profile.name,
      dateOfBirth: profile.dob || null,
      address: profile.address,
    }),
  giveConsents: async () => {
    await api.put('/me/consents/rules', { active: true })
    await api.put('/me/consents/data', { active: true })
  },
  setConsent: (id: string, active: boolean) => api.put(`/me/consents/${id}`, { active }),
  setPreferences: (language: string, textSize: string) =>
    api.put('/me/preferences', { language, textSize }),
  submitKyc: async (docType: string, docNumber: string, front: File, back: File) => {
    const frontFileId = await uploadFile(front, 'KycFront', front.name)
    const backFileId = await uploadFile(back, 'KycBack', back.name)
    return api.post('/me/kyc', { docType, docNumber, frontFileId, backFileId })
  },
  setSociety: (societyId: string | null, poolOn: boolean) =>
    api.put('/me/society', { societyId, poolOn }),
  dismissNotice: (id: string) => api.post(`/me/notices/${id}/dismiss`),
  qr: () => api.get<{ qrToken: string; expiresAtUtc: string; maskedMobile: string }>('/me/qr'),
  placeOrder: async (state: AppState, contact: { name: string; phone: string; address: string; pin: string }) => {
    const order = await api.post<OrderView>('/orders', {
      lines: state.cart.map((line) => ({ productId: line.productId, qty: line.qty })),
      fulfilment: state.fulfilment,
      payWith: state.payWith,
      pointsApplied: state.payWith === 'mixed' ? state.pointsApplied : 0,
      pickupTempleId: state.fulfilment === 'pickup' ? state.pickupTempleId || null : null,
      contactName: contact.name,
      contactPhone: contact.phone,
      address: contact.address,
      pin: contact.pin,
    })
    return order.id
  },
}

export const publicApi = {
  contact: (name: string, message: string, topic: 'contact' | 'feedback') =>
    api.post('/public/contact', { name, message, topic }),
}

type LookupView = {
  userId: string
  maskedMobile: string
  name: string
  level: number
  kyc: KycStatus
  societyId: string | null
  flagged: boolean
  assistedBy: string | null
  rejectionsThisWeek: number
  rejectionLimit: number
}

export const operatorApi = {
  lookup: async (mobile: string, qr?: string): Promise<DevoteeSummary> => {
    const found = await api.get<LookupView>(`/operator/devotees/lookup${query(qr ? { qr } : { mobile })}`)
    return {
      userId: found.userId,
      mobile: qr ? found.maskedMobile : mobile,
      name: found.name,
      level: found.level,
      kyc: found.kyc,
      societyId: found.societyId,
      flagged: found.flagged,
      assistedBy: found.assistedBy ?? undefined,
      rejectionsThisWeek: found.rejectionsThisWeek,
      rejectionLimit: found.rejectionLimit,
    }
  },
  sendOtp: (mobile: string) => api.post('/operator/devotees/send-otp', { mobileNumber: mobile }),
  register: async (body: { mobile: string; otp: string; name: string; dob: string; language: string }): Promise<DevoteeSummary> => {
    const created = await api.post<{ userId: string; name: string; level: number; kyc: KycStatus; assistedBy: string }>(
      '/operator/devotees/register',
      {
        mobileNumber: body.mobile,
        otp: body.otp,
        fullName: body.name,
        dateOfBirth: body.dob,
        language: body.language,
        rulesConsent: true,
        kycConsent: true,
      },
    )
    return {
      userId: created.userId,
      mobile: body.mobile,
      name: created.name,
      level: created.level,
      kyc: created.kyc,
      societyId: null,
      flagged: false,
      assistedBy: created.assistedBy,
      rejectionsThisWeek: 0,
    }
  },
  quote: (devoteeUserId: string, waste: string, kg: number) =>
    api.post<DepositQuote>('/operator/deposits/quote', { devoteeUserId, waste, kg }),
  record: async (pending: PendingDeposit) => {
    const photoFileId = pending.photo ? await uploadFile(await dataUrlToBlob(pending.photo), 'PurityPhoto', 'purity.jpg') : null
    const saved = await api.post<DepositView>('/operator/deposits', {
      clientId: pending.clientId,
      devoteeUserId: pending.devoteeUserId,
      templeId: pending.templeId,
      waste: pending.waste,
      kg: pending.kg,
      photoFileId,
      checks: pending.checks,
      chargeCollected: pending.chargeCollected,
      rejected: pending.rejected,
      reason: pending.reason,
      note: pending.note,
      capturedAtUtc: pending.capturedAtUtc,
    })
    return toDeposit(saved)
  },
  sync: async (pending: PendingDeposit) => {
    const photoFileId = pending.photo ? await uploadFile(await dataUrlToBlob(pending.photo), 'PurityPhoto', 'purity.jpg') : null
    const result = await api.post<{ lastSyncAtUtc: string; results: { saved: boolean; code: string | null; error: string | null }[] }>(
      '/operator/deposits/sync',
      {
        deposits: [
          {
            clientId: pending.clientId,
            devoteeUserId: pending.devoteeUserId,
            templeId: pending.templeId,
            waste: pending.waste,
            kg: pending.kg,
            photoFileId,
            checks: pending.checks,
            chargeCollected: pending.chargeCollected,
            rejected: pending.rejected,
            reason: pending.reason,
            note: pending.note,
            capturedAtUtc: pending.capturedAtUtc,
          },
        ],
      },
    )
    return result.results[0]
  },
  closeDay: (templeId: string) => api.post('/operator/close-day', { templeId }),
}

export const templeApi = {
  saveDetails: (details: { type: TempleType; name: string; regNo: string; address: string; contact: string; mobile: string }) =>
    api.put('/temple/me', {
      type: details.type,
      name: details.name,
      regNo: details.regNo,
      address: details.address,
      contact: details.contact,
      mobileNumber: details.mobile,
      authorised: true,
    }),
  submit: async (deity: string, photo: File | null, files: Record<string, File>) => {
    const photoFileId = photo ? await uploadFile(photo, 'TemplePhoto', photo.name) : null
    const documents = []
    for (const [docType, file] of Object.entries(files)) {
      documents.push({ docType, fileId: await uploadFile(file, 'TempleDocument', file.name) })
    }
    return api.post('/temple/me/submit', { deity, photoFileId, documents })
  },
  setTimings: (timings: string) => api.put('/temple/me/timings', { timings }),
}

const batchNumber = (code: string) => Number(code.replace(/\D/g, ''))

export const adminApi = {
  dashboard: (range: string) => api.get<DashboardView>(`/admin/dashboard${query({ range })}`),
  decideKyc: (id: string, approve: boolean, reason: string) =>
    api.post(`/admin/kyc/${id}/decision`, { approve, reason }),
  unmaskKyc: (id: string) =>
    api.post<{ mobileNumber: string; docNumber: string; dateOfBirth: string | null; frontFileId: string; backFileId: string | null }>(
      `/admin/kyc/${id}/unmask`,
    ),
  addTemple: (temple: { name: string; type: TempleType; address: string; contact: string; mobile: string }) =>
    api.post('/admin/temples', {
      name: temple.name,
      type: temple.type,
      address: temple.address,
      contact: temple.contact,
      mobileNumber: temple.mobile,
    }),
  verifyTemple: (id: string, badge: string) => api.post(`/admin/temples/${id}/verify`, { badge }),
  requestTempleChanges: (id: string, note: string) =>
    api.post(`/admin/temples/${id}/request-changes`, { note }),
  publishRules: (rules: Rules) =>
    api.put('/admin/rules', {
      baseVersion: rules.version,
      earning: rules.earning.map((rule) => ({
        waste: rule.waste,
        ptsPerKg: rule.ptsPerKg,
        maxPerDay: rule.maxPerDay,
        active: rule.active,
        charge: rule.charge,
      })),
      levels: rules.levels.map((level) => ({
        name: level.name,
        minPoints: level.minPoints,
        multiplier: level.multiplier,
      })),
      pointsPerRupee: rules.pointsPerRupee,
      requiresKyc: rules.requiresKyc,
      maxPctInPoints: rules.maxPctInPoints,
      rejectionLimit: rules.rejectionLimit,
      maxDepositKg: rules.maxDepositKg,
      holdOnFlag: rules.holdOnFlag,
    }),
  resolveAlert: (id: string, action: 'release' | 'remove' | 'dismiss', note: string) =>
    api.post(`/admin/alerts/${id}/resolve`, { action, note }),
  createBatch: (collectionIds: string[], totalOverrideKg: number | null, overrideReason: string) =>
    api.post<BatchView>('/admin/batches', { collectionIds, totalOverrideKg, overrideReason }),
  moveBatch: (code: string, to: BatchStatus, reason: string) =>
    api.post(`/admin/batches/${batchNumber(code)}/move`, { to, reason }),
  updateStock: (code: string, outputKg: number, lines: StockLine[]) =>
    api.post(`/admin/batches/${batchNumber(code)}/stock`, { outputKg, lines }),
  saveProduct: (product: Product, exists: boolean) => {
    const body = {
      group: product.group,
      name: product.name,
      nameHi: product.nameHi,
      category: product.category,
      pack: product.pack,
      price: product.price,
      points: product.points,
      stock: product.stock,
      listed: product.listed,
    }
    return exists ? api.put(`/admin/products/${product.id}`, body) : api.post('/admin/products', body)
  },
  setOrderStatus: (id: number, status: OrderStatus, trackingNote: string, pickupCode?: string) =>
    api.post(`/admin/orders/${id}/status`, { status, trackingNote, pickupCode }),
  saveStaff: (staff: Staff, exists: boolean) =>
    exists
      ? api.put(`/admin/staff/${staff.id}`, { fullName: staff.name, role: staff.role, status: staff.status })
      : api.post('/admin/staff', { fullName: staff.name, mobileNumber: staff.mobile, role: staff.role }),
  exportCsv: (dataset: string, reason: string, masked: boolean, from?: string, to?: string) =>
    api.blob('/admin/exports', { dataset, reason, masked, from: from || null, to: to || null }),
}
