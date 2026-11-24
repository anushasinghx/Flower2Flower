import type {
  AppState,
  Deposit,
  DepositDraft,
  DevoteeSummary,
  PendingDeposit,
} from './types'

export const isToday = (iso: string) =>
  new Date(iso).toDateString() === new Date().toDateString()

export const findDevotee = (
  state: AppState,
  key: string,
): DevoteeSummary | null =>
  state.devotees.find((item) => item.userId === key || item.mobile === key) ?? null

export const rememberDevotee = (
  state: AppState,
  devotee: DevoteeSummary,
): AppState => ({
  ...state,
  devotees: [
    devotee,
    ...state.devotees.filter((item) => item.userId !== devotee.userId),
  ],
})

export const ruleFor = (state: AppState, waste: string) =>
  state.rules.earning.find((rule) => rule.waste === waste && rule.active)

export const depositQuote = (state: AppState, draft: DepositDraft) => {
  const devotee = findDevotee(state, draft.devoteeUserId)
  const rule = ruleFor(state, draft.waste)
  const levels = [...state.rules.levels].sort((a, b) => a.minPoints - b.minPoints)
  const multiplier = levels[(devotee?.level ?? 1) - 1]?.multiplier ?? 1
  const base = rule && rule.charge === null ? draft.kg * rule.ptsPerKg : 0
  const charge = rule?.charge ? Math.round(draft.kg * rule.charge) : 0

  return {
    devotee,
    eligible: Boolean(rule),
    multiplier,
    base: Math.round(base),
    points: Math.round(base * multiplier),
    charge,
    overMax: draft.kg > state.rules.maxDepositKg,
    rejectionsThisWeek: devotee?.rejectionsThisWeek ?? 0,
    rejectionLimit: devotee?.rejectionLimit ?? state.rules.rejectionLimit,
  }
}

export const setOperatorTemple = (
  state: AppState,
  templeId: string,
): AppState => ({ ...state, operator: { ...state.operator, templeId } })

export const startDraft = (
  state: AppState,
  devotee: DevoteeSummary,
): AppState => ({
  ...rememberDevotee(state, devotee),
  operator: {
    ...state.operator,
    draft: {
      devoteeUserId: devotee.userId,
      name: devotee.name,
      mobile: devotee.mobile,
      waste: '',
      kg: 0,
      photo: '',
      checks: [],
      chargeCollected: false,
    },
  },
})

export const updateDraft = (
  state: AppState,
  change: Partial<DepositDraft>,
): AppState =>
  state.operator.draft
    ? {
        ...state,
        operator: {
          ...state.operator,
          draft: { ...state.operator.draft, ...change },
        },
      }
    : state

export const pendingFromDraft = (
  state: AppState,
  outcome: { rejected: boolean; reason: string; note: string },
): PendingDeposit | null => {
  const draft = state.operator.draft
  if (!draft) return null
  return {
    clientId: `c${Date.now()}${Math.floor(Math.random() * 100000)}`,
    devoteeUserId: draft.devoteeUserId,
    templeId: state.operator.templeId,
    waste: draft.waste,
    kg: draft.kg,
    photo: draft.photo,
    checks: draft.checks,
    chargeCollected: draft.chargeCollected,
    rejected: outcome.rejected,
    reason: outcome.rejected ? outcome.reason : '',
    note: outcome.note,
    capturedAtUtc: new Date().toISOString(),
  }
}

export const queueDeposit = (
  state: AppState,
  pending: PendingDeposit,
  quote: { points: number; charge: number; overMax: boolean },
): AppState => {
  const draft = state.operator.draft
  const deposit: Deposit = {
    id: pending.clientId,
    at: pending.capturedAtUtc,
    mobile: draft?.mobile ?? '',
    name: draft?.name ?? 'Devotee',
    templeId: pending.templeId,
    waste: pending.waste,
    kg: pending.kg,
    points: pending.rejected ? 0 : quote.points,
    charge: quote.charge,
    status: pending.rejected
      ? 'rejected'
      : quote.overMax && state.rules.holdOnFlag
        ? 'held'
        : 'accepted',
    reason: pending.reason,
    note: pending.note,
    synced: false,
    conflict: false,
    devoteeUserId: pending.devoteeUserId,
    pending,
  }

  return {
    ...state,
    deposits: [deposit, ...state.deposits],
    operator: { ...state.operator, draft: null, lastDepositId: deposit.id },
  }
}

export const savedDeposit = (state: AppState, deposit: Deposit): AppState => ({
  ...state,
  deposits: [deposit, ...state.deposits.filter((item) => item.id !== deposit.id)],
  operator: { ...state.operator, draft: null, lastDepositId: deposit.id },
})

export const markSynced = (
  state: AppState,
  clientId: string,
  code: string | null,
): AppState => ({
  ...state,
  deposits: state.deposits.filter((deposit) => deposit.id !== clientId),
  operator: {
    ...state.operator,
    lastSync: new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    lastDepositId:
      state.operator.lastDepositId === clientId && code
        ? code
        : state.operator.lastDepositId,
  },
})

export const setOffline = (state: AppState, offline: boolean): AppState => ({
  ...state,
  operator: { ...state.operator, offline },
})
