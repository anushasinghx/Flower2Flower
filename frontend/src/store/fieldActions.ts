import type {
  Alert,
  AppState,
  Deposit,
  DepositDraft,
  DepositStatus,
  DevoteeSummary,
  Temple,
  TempleType,
} from './types'
import { levelInfo, nowLabel, todayLabel } from '../utils/points'

export const OPERATOR_NAME = 'Ravi Prasad'
const CO2_PER_KG = 0.9

const uid = (prefix: string) =>
  `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })

export const isToday = (iso: string) =>
  new Date(iso).toDateString() === new Date().toDateString()

export const findDevotee = (
  state: AppState,
  mobile: string,
): DevoteeSummary | null => {
  if (mobile === state.devotee.mobile) {
    return {
      mobile,
      name: state.devotee.name || 'Devotee',
      level: levelInfo(state).number,
      kyc: state.devotee.kyc,
      societyId: state.devotee.societyId,
      flagged: state.alerts.some(
        (alert) => alert.isCurrentUser && alert.status === 'open',
      ),
    }
  }

  return state.devotees.find((item) => item.mobile === mobile) ?? null
}

export const rejectionsThisWeek = (state: AppState, mobile: string) =>
  state.deposits.filter(
    (deposit) =>
      deposit.mobile === mobile &&
      deposit.status === 'rejected' &&
      Date.now() - new Date(deposit.at).getTime() < 7 * 86400000,
  ).length

export const ruleFor = (state: AppState, waste: string) =>
  state.rules.earning.find((rule) => rule.waste === waste)

const multiplierFor = (state: AppState, devotee: DevoteeSummary | null) => {
  const levels = [...state.rules.levels].sort(
    (a, b) => a.minPoints - b.minPoints,
  )
  return levels[(devotee?.level ?? 1) - 1]?.multiplier ?? 1
}

export const depositQuote = (state: AppState, draft: DepositDraft) => {
  const devotee = findDevotee(state, draft.mobile)
  const rule = ruleFor(state, draft.waste)
  const multiplier = multiplierFor(state, devotee)
  const base = rule && rule.charge === null ? draft.kg * rule.ptsPerKg : 0
  const charge = rule?.charge ? Math.round(draft.kg * rule.charge) : 0

  return {
    devotee,
    rule,
    multiplier,
    base: Math.round(base),
    points: Math.round(base * multiplier),
    charge,
    overMax: draft.kg > state.rules.maxDepositKg,
  }
}

export const setOperatorTemple = (
  state: AppState,
  templeId: string,
): AppState => ({ ...state, operator: { ...state.operator, templeId } })

export const startDraft = (state: AppState, mobile: string): AppState => ({
  ...state,
  operator: {
    ...state.operator,
    draft: {
      mobile,
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

export const registerAssisted = (
  state: AppState,
  devotee: { mobile: string; name: string },
): AppState =>
  startDraft(
    {
      ...state,
      devotees: [
        {
          mobile: devotee.mobile,
          name: devotee.name,
          level: 1,
          kyc: 'notStarted',
          societyId: null,
          flagged: false,
          assistedBy: OPERATOR_NAME,
        },
        ...state.devotees.filter((item) => item.mobile !== devotee.mobile),
      ],
      audit: [
        {
          id: uid('x'),
          time: nowLabel(),
          actor: OPERATOR_NAME,
          role: 'Operator',
          action: 'Assisted registration',
          record: devotee.name,
          oldValue: 'None',
          newValue: 'Registered',
          reason: 'Registered at the counter',
        },
        ...state.audit,
      ],
    },
    devotee.mobile,
  )

const templeName = (state: AppState, templeId: string) =>
  state.temples.find((temple) => temple.id === templeId)?.name ?? ''

const newAlert = (alert: Omit<Alert, 'id' | 'time' | 'status' | 'resolution'>) =>
  ({
    ...alert,
    id: uid('a'),
    time: timeLabel(new Date().toISOString()),
    status: 'open',
    resolution: '',
  }) satisfies Alert

// Writes a saved deposit into the ledger, alerts and devotee totals.
const applyDeposit = (state: AppState, deposit: Deposit): AppState => {
  const isCurrent = deposit.mobile === state.devotee.mobile
  const place = templeName(state, deposit.templeId)
  const alerts: Alert[] = []

  if (deposit.kg > state.rules.maxDepositKg) {
    alerts.push(
      newAlert({
        severity: 'medium',
        subject: deposit.name,
        rule: 'Weight above max',
        ruleKind: 'weight',
        detail: `A ${deposit.kg} kg deposit was entered at ${place}`,
        heldPoints: deposit.status === 'held' ? deposit.points : 0,
        isCurrentUser: isCurrent,
      }),
    )
  }

  if (
    deposit.status === 'rejected' &&
    rejectionsThisWeek(state, deposit.mobile) >= state.rules.rejectionLimit
  ) {
    alerts.push(
      newAlert({
        severity: 'high',
        subject: deposit.name,
        rule: `${state.rules.rejectionLimit} rejections in 7 days`,
        ruleKind: 'rejection',
        detail: `${rejectionsThisWeek(state, deposit.mobile)} rejections in 7 days at ${place}`,
        heldPoints: 0,
        isCurrentUser: isCurrent,
      }),
    )
  }

  if (deposit.conflict) {
    alerts.push(
      newAlert({
        severity: 'medium',
        subject: deposit.name,
        rule: 'Sync conflict',
        ruleKind: 'other',
        detail: `Deposit ${deposit.id} synced after the devotee was flagged`,
        heldPoints: deposit.points,
        isCurrentUser: isCurrent,
      }),
    )
  }

  let next: AppState = { ...state, alerts: [...alerts, ...state.alerts] }

  if (isCurrent) {
    const counted = deposit.status !== 'rejected'
    const kind =
      deposit.status === 'accepted'
        ? 'earned'
        : deposit.status === 'held'
          ? 'held'
          : 'rejected'

    next = {
      ...next,
      ledger: [
        {
          id: uid('l'),
          when: todayLabel(),
          title: `${deposit.kg} kg`,
          detail:
            deposit.status === 'rejected'
              ? 'Contaminated, rejected'
              : deposit.status === 'held'
                ? 'Held, under review'
                : deposit.waste,
          kind,
          points: deposit.status === 'rejected' ? 0 : deposit.points,
          depositId: deposit.id,
        },
        ...next.ledger,
      ],
      devotee: counted
        ? {
            ...next.devotee,
            kgOffered: Math.round((next.devotee.kgOffered + deposit.kg) * 100) / 100,
            co2Avoided:
              Math.round((next.devotee.co2Avoided + deposit.kg * CO2_PER_KG) * 10) / 10,
          }
        : next.devotee,
      notices: [
        {
          id: uid('n'),
          kind: deposit.status,
          kg: deposit.kg,
          waste: deposit.waste,
          points: deposit.points,
          temple: place,
          reason: deposit.reason,
        },
        ...next.notices,
      ],
    }
  }

  return next
}

export const nextDepositId = (state: AppState) => {
  const highest = Math.max(
    2000,
    ...state.deposits.map((deposit) => Number(deposit.id.slice(1)) || 0),
  )
  return `D${highest + 1}`
}

export const commitDeposit = (
  state: AppState,
  id: string,
  outcome: { rejected: boolean; reason: string; note: string },
): AppState => {
  const draft = state.operator.draft
  if (!draft) return state

  const quote = depositQuote(state, draft)
  const status: DepositStatus = outcome.rejected
    ? 'rejected'
    : quote.overMax && state.rules.holdOnFlag
      ? 'held'
      : 'accepted'
  const deposit: Deposit = {
    id,
    at: new Date().toISOString(),
    mobile: draft.mobile,
    name: quote.devotee?.name ?? 'Devotee',
    templeId: state.operator.templeId,
    waste: draft.waste,
    kg: draft.kg,
    points: outcome.rejected ? 0 : quote.points,
    charge: quote.charge,
    status,
    reason: outcome.reason,
    note: outcome.note,
    synced: !state.operator.offline,
    conflict: false,
  }

  const withDeposit: AppState = {
    ...state,
    deposits: [deposit, ...state.deposits],
    operator: { ...state.operator, draft: null, lastDepositId: id },
  }

  return state.operator.offline ? withDeposit : applyDeposit(withDeposit, deposit)
}

// Syncs the oldest queued deposit. The operator screen calls this one at a
// time so the progress is visible.
export const syncOne = (state: AppState): AppState => {
  const item = state.deposits
    .filter((deposit) => !deposit.synced)
    .sort((a, b) => a.at.localeCompare(b.at))[0]

  if (!item) return state

  const devotee = findDevotee(state, item.mobile)
  const conflict = Boolean(devotee?.flagged) && item.status !== 'rejected'
  const synced: Deposit = {
    ...item,
    synced: true,
    conflict,
    status: conflict ? 'held' : item.status,
  }

  return applyDeposit(
    {
      ...state,
      deposits: state.deposits.map((deposit) =>
        deposit.id === item.id ? synced : deposit,
      ),
      operator: {
        ...state.operator,
        lastSync: timeLabel(new Date().toISOString()),
      },
    },
    synced,
  )
}

export const setOffline = (state: AppState, offline: boolean): AppState => ({
  ...state,
  operator: { ...state.operator, offline },
})

export const closeDay = (state: AppState): AppState => {
  const { templeId } = state.operator
  const source = templeName(state, templeId)
  const date = todayLabel()
  const kg = state.deposits
    .filter(
      (deposit) =>
        deposit.templeId === templeId &&
        deposit.synced &&
        deposit.status !== 'rejected' &&
        isToday(deposit.at),
    )
    .reduce((sum, deposit) => sum + deposit.kg, 0)
  const id = `cc${templeId}${date.replace(' ', '')}`
  const others = state.closedCollections.filter((item) => item.id !== id)

  return {
    ...state,
    closedCollections: [
      { id, source, date, kg: Math.round(kg * 100) / 100, used: false },
      ...others,
    ],
  }
}

export const dismissNotice = (state: AppState, id: string): AppState => ({
  ...state,
  notices: state.notices.filter((notice) => notice.id !== id),
})

export type TempleDetails = {
  type: TempleType
  name: string
  regNo: string
  address: string
  contact: string
  mobile: string
}

export const saveTempleDetails = (
  state: AppState,
  details: TempleDetails,
): AppState => {
  const existing = state.temples.find(
    (temple) => temple.id === state.templeAdmin.templeId,
  )

  if (existing) {
    return {
      ...state,
      temples: state.temples.map((temple) =>
        temple.id === existing.id ? { ...temple, ...details } : temple,
      ),
    }
  }

  const id = uid('t')
  const temple: Temple = {
    ...details,
    id,
    status: 'draft',
    timings: 'Not set yet',
    badge: '',
    note: '',
    history: [],
    docs: [],
  }

  return {
    ...state,
    temples: [temple, ...state.temples],
    templeAdmin: { templeId: id },
  }
}

export const submitTempleDocs = (
  state: AppState,
  deity: string,
  docs: string[],
): AppState => {
  const id = state.templeAdmin.templeId

  return {
    ...state,
    temples: state.temples.map((temple) =>
      temple.id === id
        ? {
            ...temple,
            deity,
            docs,
            status: 'pending',
            note: '',
            submitted: todayLabel(),
            history: [
              ...temple.history,
              `${temple.history.length ? 'Submitted again' : 'Submitted'}, ${todayLabel()}`,
            ],
          }
        : temple,
    ),
  }
}

export const setTempleTimings = (
  state: AppState,
  timings: string,
): AppState => ({
  ...state,
  temples: state.temples.map((temple) =>
    temple.id === state.templeAdmin.templeId ? { ...temple, timings } : temple,
  ),
})
