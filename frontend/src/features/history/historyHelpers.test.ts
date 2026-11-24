import { describe, expect, it } from 'vitest'
import { dayLabel, depositsCsv, filterDeposits, groupByDay, historyTotals, type HistoryFilters } from './historyHelpers'
import { deposit } from '../../test/fixtures'
import type { Temple } from '../../store/types'

const DAY = 86400000
const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString()
const filters = (overrides: Partial<HistoryFilters> = {}): HistoryFilters => ({ period: 'all', status: 'all', query: '', templeId: '', ...overrides })

const list = [
  deposit({ id: 'D1', at: daysAgo(0), name: 'Sunita', mobile: '9876541234', status: 'accepted', kg: 2, points: 200 }),
  deposit({ id: 'D2', at: daysAgo(3), name: 'Ravi', mobile: '9000011111', status: 'rejected', kg: 1, points: 0, templeId: 't2' }),
  deposit({ id: 'c3', at: daysAgo(10), name: 'Asha', mobile: '9000022222', status: 'accepted', synced: false, kg: 1.5, points: 150 }),
  deposit({ id: 'D4', at: daysAgo(40), name: 'Old', mobile: '9000033333', status: 'held', kg: 12, points: 1000 }),
]

describe('filterDeposits', () => {
  it('returns all deposits newest first', () => {
    expect(filterDeposits(list, filters()).map((item) => item.id)).toEqual(['D1', 'D2', 'c3', 'D4'])
  })

  it.each([
    ['today', ['D1']],
    ['7', ['D1', 'D2']],
    ['30', ['D1', 'D2', 'c3']],
  ] as const)('period %s', (period, ids) => {
    expect(filterDeposits(list, filters({ period })).map((item) => item.id)).toEqual(ids)
  })

  it('queued shows only unsynced deposits', () => {
    expect(filterDeposits(list, filters({ status: 'queued' })).map((item) => item.id)).toEqual(['c3'])
  })

  it('status filter skips unsynced deposits', () => {
    expect(filterDeposits(list, filters({ status: 'accepted' })).map((item) => item.id)).toEqual(['D1'])
  })

  it('searches name, mobile and id ignoring case', () => {
    expect(filterDeposits(list, filters({ query: 'SUNI' })).map((item) => item.id)).toEqual(['D1'])
    expect(filterDeposits(list, filters({ query: '11111' })).map((item) => item.id)).toEqual(['D2'])
    expect(filterDeposits(list, filters({ query: 'd4' })).map((item) => item.id)).toEqual(['D4'])
  })

  it('filters by temple', () => {
    expect(filterDeposits(list, filters({ templeId: 't2' })).map((item) => item.id)).toEqual(['D2'])
  })
})

describe('day grouping', () => {
  it('labels today and yesterday', () => {
    expect(dayLabel(new Date().toISOString())).toBe('Today')
    expect(dayLabel(daysAgo(1))).toBe('Yesterday')
    expect(dayLabel('2026-01-05T06:00:00')).toBe('05 Jan')
  })

  it('groups consecutive deposits on the same day', () => {
    const groups = groupByDay([deposit({ id: 'a', at: daysAgo(0) }), deposit({ id: 'b', at: daysAgo(0) }), deposit({ id: 'c', at: daysAgo(1) })])
    expect(groups.map((group) => [group.label, group.items.length])).toEqual([
      ['Today', 2],
      ['Yesterday', 1],
    ])
  })
})

describe('totals and csv', () => {
  it('totals exclude rejected weight', () => {
    expect(historyTotals(list)).toEqual({ count: 4, kg: 15.5, points: 1350 })
  })

  it('csv masks mobile, names temple and marks queued items', () => {
    const temples = [{ id: 't1', name: 'Shiv Mandir' }] as Temple[]
    const csv = depositsCsv([list[0], list[2]], temples).split('\n')
    expect(csv[0]).toBe('Deposit,Date,Devotee,Mobile,Temple,Waste,Kg,Points,Charge,Status,Reason')
    expect(csv[1]).toContain('******1234')
    expect(csv[1]).toContain('Shiv Mandir')
    expect(csv[1]).not.toContain('9876541234')
    expect(csv[2]).toMatch(/,queued,$/)
  })

  it('csv quotes values with commas and quotes', () => {
    const csv = depositsCsv([deposit({ name: 'Sharma, "Ji"', reason: 'a,b' })], [])
    expect(csv).toContain('"Sharma, ""Ji"""')
    expect(csv).toContain('"a,b"')
  })
})
