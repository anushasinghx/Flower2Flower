import { vi } from 'vitest'
import { initialState } from '../store/initialState'
import type { AppState, Deposit, DevoteeSummary, LedgerEntry, Product } from '../store/types'

export const makeState = (overrides: Partial<AppState> = {}): AppState => ({
  ...initialState,
  loaded: true,
  ...overrides,
})

export const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  group: 'manure',
  name: 'Organic manure',
  nameHi: 'जैविक खाद',
  category: 'Manure',
  pack: '500 g',
  price: 35,
  points: 350,
  stock: 10,
  listed: true,
  ...overrides,
})

export const entry = (kind: LedgerEntry['kind'], points: number): LedgerEntry => ({
  id: `${kind}${points}${Math.random()}`,
  when: 'Today',
  title: kind,
  detail: '',
  kind,
  points,
})

export const deposit = (overrides: Partial<Deposit> = {}): Deposit => ({
  id: 'D2001',
  at: new Date().toISOString(),
  mobile: '9876541234',
  name: 'Sunita',
  templeId: 't1',
  waste: 'Flowers',
  kg: 1,
  points: 100,
  charge: 0,
  status: 'accepted',
  reason: '',
  note: '',
  synced: true,
  conflict: false,
  ...overrides,
})

export const devoteeSummary = (overrides: Partial<DevoteeSummary> = {}): DevoteeSummary => ({
  userId: 'u1',
  mobile: '9876541234',
  name: 'Sunita',
  level: 1,
  kyc: 'verified',
  societyId: null,
  flagged: false,
  ...overrides,
})

export const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })

export const mockFetch = (...responses: (Response | (() => Response))[]) => {
  const queue = [...responses]
  const fn = vi.fn(async () => {
    const next = queue.shift()
    if (!next) throw new Error('No more mocked responses')
    return typeof next === 'function' ? next() : next
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

export const sentBody = (fn: ReturnType<typeof mockFetch>, call = 0) => {
  const init = (fn.mock.calls[call] as unknown as [string, RequestInit])[1]
  return JSON.parse(String(init.body))
}

export const sentUrl = (fn: ReturnType<typeof mockFetch>, call = 0) =>
  (fn.mock.calls[call] as unknown as [string, RequestInit])[0]

export const sentInit = (fn: ReturnType<typeof mockFetch>, call = 0) =>
  (fn.mock.calls[call] as unknown as [string, RequestInit])[1]
