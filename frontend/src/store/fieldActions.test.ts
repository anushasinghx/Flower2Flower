import { describe, expect, it } from 'vitest'
import {
  depositQuote,
  findDevotee,
  isToday,
  markSynced,
  pendingFromDraft,
  queueDeposit,
  rememberDevotee,
  ruleFor,
  savedDeposit,
  setOffline,
  setOperatorTemple,
  startDraft,
  updateDraft,
} from './fieldActions'
import { defaultRules } from './initialState'
import type { AppState, Rules } from './types'
import { deposit, devoteeSummary, makeState } from '../test/fixtures'

const rules: Rules = {
  ...defaultRules,
  earning: [
    { id: 'r1', waste: 'Flowers', ptsPerKg: 100, maxPerDay: 10, active: true, charge: null },
    { id: 'r2', waste: 'Broken idols', ptsPerKg: 0, maxPerDay: 0, active: true, charge: 10 },
    { id: 'r3', waste: 'Plastic', ptsPerKg: 5, maxPerDay: 1, active: false, charge: null },
  ],
  levels: [
    { id: 'l1', name: 'Novice', minPoints: 0, multiplier: 1 },
    { id: 'l2', name: 'Regular', minPoints: 1000, multiplier: 1 },
    { id: 'l3', name: 'Evangelist', minPoints: 5000, multiplier: 1.2 },
  ],
}

const withDraft = (overrides: Partial<AppState['operator']> = {}, devotee = devoteeSummary()): AppState => {
  const state = startDraft(makeState({ rules, operator: { ...makeState().operator, templeId: 't1', ...overrides } }), devotee)
  return updateDraft(state, { waste: 'Flowers', kg: 2, photo: 'data:image/jpeg;base64,AA', checks: ['No plastic'] })
}

describe('devotee helpers', () => {
  it('isToday compares calendar day', () => {
    expect(isToday(new Date().toISOString())).toBe(true)
    expect(isToday('2001-01-01T10:00:00Z')).toBe(false)
  })

  it('findDevotee matches by user id or mobile', () => {
    const state = makeState({ devotees: [devoteeSummary()] })
    expect(findDevotee(state, 'u1')?.name).toBe('Sunita')
    expect(findDevotee(state, '9876541234')?.name).toBe('Sunita')
    expect(findDevotee(state, 'nobody')).toBeNull()
  })

  it('rememberDevotee puts the latest first without duplicates', () => {
    const state = makeState({ devotees: [devoteeSummary(), devoteeSummary({ userId: 'u2', name: 'Ravi' })] })
    const next = rememberDevotee(state, devoteeSummary({ name: 'Sunita Devi' }))
    expect(next.devotees.map((item) => item.userId)).toEqual(['u1', 'u2'])
    expect(next.devotees[0].name).toBe('Sunita Devi')
  })

  it('ruleFor returns only active rules', () => {
    const state = makeState({ rules })
    expect(ruleFor(state, 'Flowers')?.ptsPerKg).toBe(100)
    expect(ruleFor(state, 'Plastic')).toBeUndefined()
  })
})

describe('depositQuote', () => {
  it('computes points for eligible waste', () => {
    const state = withDraft()
    const quote = depositQuote(state, state.operator.draft!)
    expect(quote.eligible).toBe(true)
    expect(quote.base).toBe(200)
    expect(quote.points).toBe(200)
    expect(quote.charge).toBe(0)
    expect(quote.overMax).toBe(false)
  })

  it('applies level multiplier', () => {
    const state = withDraft({}, devoteeSummary({ level: 3 }))
    expect(depositQuote(state, state.operator.draft!).points).toBe(240)
  })

  it('charges for charged waste without points', () => {
    const state = updateDraft(withDraft(), { waste: 'Broken idols', kg: 2.5 })
    const quote = depositQuote(state, state.operator.draft!)
    expect(quote.points).toBe(0)
    expect(quote.charge).toBe(25)
  })

  it('marks unknown waste as not eligible', () => {
    const state = updateDraft(withDraft(), { waste: 'Stones' })
    expect(depositQuote(state, state.operator.draft!).eligible).toBe(false)
  })

  it('flags weight over the maximum', () => {
    const state = updateDraft(withDraft(), { kg: 12 })
    expect(depositQuote(state, state.operator.draft!).overMax).toBe(true)
  })

  it('uses devotee rejection counts when known', () => {
    const state = withDraft({}, devoteeSummary({ rejectionsThisWeek: 2, rejectionLimit: 4 }))
    const quote = depositQuote(state, state.operator.draft!)
    expect(quote.rejectionsThisWeek).toBe(2)
    expect(quote.rejectionLimit).toBe(4)
  })
})

describe('draft flow', () => {
  it('startDraft opens an empty draft for the devotee', () => {
    const state = startDraft(makeState(), devoteeSummary())
    expect(state.operator.draft).toMatchObject({ devoteeUserId: 'u1', name: 'Sunita', waste: '', kg: 0, chargeCollected: false })
    expect(state.devotees[0].userId).toBe('u1')
  })

  it('updateDraft does nothing without a draft', () => {
    const state = makeState()
    expect(updateDraft(state, { kg: 3 })).toBe(state)
  })

  it('pendingFromDraft returns null without a draft', () => {
    expect(pendingFromDraft(makeState(), { rejected: false, reason: 'x', note: '' })).toBeNull()
  })

  it('pendingFromDraft keeps reason only for rejections', () => {
    const state = withDraft()
    const accepted = pendingFromDraft(state, { rejected: false, reason: 'ignored', note: 'ok' })!
    const rejected = pendingFromDraft(state, { rejected: true, reason: 'Plastic', note: '' })!
    expect(accepted.reason).toBe('')
    expect(accepted.templeId).toBe('t1')
    expect(accepted.clientId).toMatch(/^c\d+/)
    expect(rejected.reason).toBe('Plastic')
    expect(rejected.rejected).toBe(true)
  })

  it('queueDeposit adds an unsynced deposit and clears the draft', () => {
    const state = withDraft()
    const pending = pendingFromDraft(state, { rejected: false, reason: '', note: '' })!
    const next = queueDeposit(state, pending, { points: 200, charge: 0, overMax: false })
    expect(next.deposits[0]).toMatchObject({ id: pending.clientId, status: 'accepted', points: 200, synced: false, name: 'Sunita' })
    expect(next.operator.draft).toBeNull()
    expect(next.operator.lastDepositId).toBe(pending.clientId)
  })

  it('queueDeposit holds overweight deposits when rules say so', () => {
    const state = withDraft()
    const pending = pendingFromDraft(state, { rejected: false, reason: '', note: '' })!
    expect(queueDeposit(state, pending, { points: 1000, charge: 0, overMax: true }).deposits[0].status).toBe('held')
  })

  it('queueDeposit gives no points for rejections', () => {
    const state = withDraft()
    const pending = pendingFromDraft(state, { rejected: true, reason: 'Plastic', note: '' })!
    const queued = queueDeposit(state, pending, { points: 200, charge: 0, overMax: false }).deposits[0]
    expect(queued.status).toBe('rejected')
    expect(queued.points).toBe(0)
  })

  it('savedDeposit replaces a deposit with the same id', () => {
    const state = makeState({ deposits: [deposit({ id: 'D1', points: 1 }), deposit({ id: 'D2' })] })
    const next = savedDeposit(state, deposit({ id: 'D1', points: 99 }))
    expect(next.deposits.map((item) => item.id)).toEqual(['D1', 'D2'])
    expect(next.deposits[0].points).toBe(99)
  })

  it('markSynced removes the queued item and swaps last deposit id for the server code', () => {
    const state = makeState({
      deposits: [deposit({ id: 'c1', synced: false }), deposit({ id: 'D5' })],
      operator: { ...makeState().operator, lastDepositId: 'c1' },
    })
    const next = markSynced(state, 'c1', 'D2009')
    expect(next.deposits.map((item) => item.id)).toEqual(['D5'])
    expect(next.operator.lastDepositId).toBe('D2009')
    expect(next.operator.lastSync).toMatch(/^\d{2}:\d{2}$/)
  })

  it('markSynced keeps last deposit id when it was another item', () => {
    const state = makeState({ operator: { ...makeState().operator, lastDepositId: 'c2' } })
    expect(markSynced(state, 'c1', 'D1').operator.lastDepositId).toBe('c2')
  })

  it('sets offline flag and counter temple', () => {
    expect(setOffline(makeState(), true).operator.offline).toBe(true)
    expect(setOperatorTemple(makeState(), 't7').operator.templeId).toBe('t7')
  })
})
