import { describe, expect, it } from 'vitest'
import { adminApi, auth, devotee, homeFor, operatorApi, sessionFor, shortDate, signedIn, signedOut, toDeposit, toTemple, type AuthResponse } from './remote'
import { getToken, setToken } from '../services/api'
import { defaultRules } from './initialState'
import { jsonResponse, makeState, mockFetch, product, sentBody, sentInit, sentUrl } from '../test/fixtures'

const authResponse = (overrides: Partial<AuthResponse> = {}): AuthResponse => ({
  accessToken: 'tok',
  userId: 'u1',
  mobileNumber: '9876541234',
  fullName: 'Sunita',
  userType: 'devotee',
  isNewUser: false,
  profileComplete: true,
  ...overrides,
})

describe('sessions and routing', () => {
  it.each([
    ['admin', 'admin'],
    ['superAdmin', 'admin'],
    ['operator', 'operator'],
    ['templeAdmin', 'templeAdmin'],
    ['devotee', 'devotee'],
    ['nurseryAdmin', 'devotee'],
  ])('user type %s opens %s session', (userType, session) => {
    expect(sessionFor(userType)).toBe(session)
  })

  it.each([
    ['superAdmin', true, '/admin'],
    ['operator', true, '/operator'],
    ['templeAdmin', true, '/temple'],
    ['devotee', true, '/app'],
    ['devotee', false, '/onboarding/profile'],
  ])('%s with complete profile %s goes to %s', (userType, profileComplete, path) => {
    expect(homeFor(authResponse({ userType, profileComplete }))).toBe(path)
  })

  it('signedIn keeps shared data and guest cart only for devotees', () => {
    const state = makeState({ lang: 'hi', cart: [{ productId: 'p1', qty: 1 }], products: [product()], ledger: [{ id: 'x', when: '', title: '', detail: '', kind: 'bonus', points: 5 }] })

    const asDevotee = signedIn(state, authResponse(), 'devotee')
    const asAdmin = signedIn(state, authResponse({ userType: 'admin' }), 'admin')

    expect(asDevotee.session).toBe('devotee')
    expect(asDevotee.user).toEqual({ userId: 'u1', name: 'Sunita', mobile: '9876541234', userType: 'devotee' })
    expect(asDevotee.lang).toBe('hi')
    expect(asDevotee.cart).toHaveLength(1)
    expect(asDevotee.ledger).toEqual([])
    expect(asDevotee.loaded).toBe(false)
    expect(asAdmin.cart).toEqual([])
  })

  it('signedOut clears the session and hides unlisted products and unverified temples', () => {
    const state = makeState({
      session: 'admin',
      products: [product({ id: 'a' }), product({ id: 'b', listed: false })],
      temples: [toTemple(templeView('verified')), toTemple(templeView('pending'))],
      textSize: 'large',
    })

    const next = signedOut(state)

    expect(next.session).toBeNull()
    expect(next.user).toBeNull()
    expect(next.products.map((item) => item.id)).toEqual(['a'])
    expect(next.temples.map((item) => item.status)).toEqual(['verified'])
    expect(next.textSize).toBe('large')
    expect(next.loaded).toBe(true)
  })
})

const templeView = (status: 'verified' | 'pending') => ({
  id: `t-${status}`,
  name: 'Shiv Mandir',
  type: 'registered' as const,
  address: 'Indirapuram',
  timings: '7 am',
  badge: 'Verified',
  status,
  contact: 'Mahesh',
  mobileNumber: '9000006666',
  note: '',
  regNo: 'REG1',
  deity: 'Shiv',
  photoFileId: null,
  submittedAtUtc: '2026-01-05T06:00:00',
  documents: [{ docType: 'Admin ID proof', fileId: 'f1' }],
  history: [{ text: 'Submitted', createdAtUtc: '2026-01-05T06:00:00' }],
})

describe('mapping server views', () => {
  it('shortDate formats dates and handles empty values', () => {
    expect(shortDate('2026-01-05')).toBe('05 Jan')
    expect(shortDate(null)).toBe('')
    expect(shortDate('')).toBe('')
  })

  it('toTemple formats history and documents', () => {
    const temple = toTemple(templeView('verified'))
    expect(temple.mobile).toBe('9000006666')
    expect(temple.history).toEqual(['Submitted, 05 Jan'])
    expect(temple.docs).toEqual(['Admin ID proof'])
    expect(temple.submitted).toBe('05 Jan')
  })

  it('toDeposit uses the deposit code as id and numbers for amounts', () => {
    const mapped = toDeposit({
      id: 2001,
      code: 'D2001',
      capturedAtUtc: '2026-01-05T06:00:00Z',
      devoteeUserId: 'u1',
      devoteeName: 'Sunita',
      mobileNumber: '******1234',
      templeId: 't1',
      templeName: 'Shiv',
      waste: 'Flowers',
      kg: '1.250' as unknown as number,
      points: 125,
      charge: '0.00' as unknown as number,
      status: 'accepted',
      reason: '',
      note: '',
      conflict: false,
      clientId: null,
    })
    expect(mapped.id).toBe('D2001')
    expect(mapped.kg).toBe(1.25)
    expect(mapped.charge).toBe(0)
    expect(mapped.synced).toBe(true)
  })
})

describe('api wrappers', () => {
  it('verify stores the access token', async () => {
    const fetch = mockFetch(jsonResponse(authResponse({ accessToken: 'new-token' })))

    await auth.verify('9876541234', '123456')

    expect(getToken()).toBe('new-token')
    expect(sentBody(fetch)).toEqual({ mobileNumber: '9876541234', otp: '123456', createAccount: true })
  })

  it('logout clears the token even when the server fails', async () => {
    setToken('tok')
    mockFetch(jsonResponse({ message: 'down' }, 500))

    await auth.logout()

    expect(getToken()).toBe('')
  })

  it('placeOrder sends points only for mixed payment and temple only for pickup', async () => {
    const fetch = mockFetch(jsonResponse({ id: 1001 }, 201), jsonResponse({ id: 1002 }, 201))
    const cart = [{ productId: 'p1', qty: 2 }]

    const pickupId = await devotee.placeOrder(makeState({ cart, payWith: 'inr', pointsApplied: 50, fulfilment: 'pickup', pickupTempleId: 't1' }), { name: '', phone: '', address: '', pin: '' })
    await devotee.placeOrder(makeState({ cart, payWith: 'mixed', pointsApplied: 50, fulfilment: 'delivery', pickupTempleId: 't1' }), { name: 'A', phone: '9876541234', address: 'House 1', pin: '201014' })

    expect(pickupId).toBe(1001)
    expect(sentBody(fetch, 0)).toMatchObject({ lines: cart, pointsApplied: 0, pickupTempleId: 't1', fulfilment: 'pickup' })
    expect(sentBody(fetch, 1)).toMatchObject({ pointsApplied: 50, pickupTempleId: null, pin: '201014' })
  })

  it('lookup by qr shows the masked mobile and by number keeps the typed one', async () => {
    const view = { userId: 'u1', maskedMobile: '******1234', name: 'Sunita', level: 1, kyc: 'verified', societyId: null, flagged: false, assistedBy: null, rejectionsThisWeek: 0, rejectionLimit: 3 }
    const fetch = mockFetch(jsonResponse(view), jsonResponse(view))

    const byQr = await operatorApi.lookup('', 'qr.token')
    const byMobile = await operatorApi.lookup('9876541234')

    expect(byQr.mobile).toBe('******1234')
    expect(byMobile.mobile).toBe('9876541234')
    expect(byMobile.assistedBy).toBeUndefined()
    expect(sentUrl(fetch, 0)).toBe('/api/v1/operator/devotees/lookup?qr=qr.token')
    expect(sentUrl(fetch, 1)).toBe('/api/v1/operator/devotees/lookup?mobile=9876541234')
  })

  it('assisted register always sends both consents', async () => {
    const fetch = mockFetch(jsonResponse({ userId: 'u9', name: 'Ramesh', level: 1, kyc: 'notStarted', assistedBy: 'Ravi' }, 201))

    const created = await operatorApi.register({ mobile: '9876500000', otp: '123456', name: 'Ramesh', dob: '1960-01-01', language: 'hi' })

    expect(sentBody(fetch)).toMatchObject({ rulesConsent: true, kycConsent: true, fullName: 'Ramesh', language: 'hi' })
    expect(created).toMatchObject({ userId: 'u9', mobile: '9876500000', flagged: false, assistedBy: 'Ravi' })
  })

  it('batch actions use the numeric id from the batch code', async () => {
    const fetch = mockFetch(jsonResponse({}), jsonResponse({}))

    await adminApi.moveBatch('B0007', 'composting', '')
    await adminApi.updateStock('B0012', 5, [{ productId: 'p1', units: 2 }])

    expect(sentUrl(fetch, 0)).toBe('/api/v1/admin/batches/7/move')
    expect(sentUrl(fetch, 1)).toBe('/api/v1/admin/batches/12/stock')
  })

  it('publishRules sends the base version for conflict checks', async () => {
    const fetch = mockFetch(jsonResponse({}))

    await adminApi.publishRules({ ...defaultRules, version: 4 })

    expect(sentInit(fetch).method).toBe('PUT')
    expect(sentBody(fetch)).toMatchObject({ baseVersion: 4, pointsPerRupee: 10, levels: [{ name: 'Novice', minPoints: 0, multiplier: 1 }] })
  })

  it('saveStaff creates new staff and updates existing staff', async () => {
    const fetch = mockFetch(jsonResponse({}), jsonResponse({}))
    const staff = { id: 's1', name: 'Ravi', mobile: '9000004444', role: 'operator' as const, status: 'active' as const }

    await adminApi.saveStaff(staff, false)
    await adminApi.saveStaff(staff, true)

    expect(sentInit(fetch, 0).method).toBe('POST')
    expect(sentBody(fetch, 0)).toEqual({ fullName: 'Ravi', mobileNumber: '9000004444', role: 'operator' })
    expect(sentInit(fetch, 1).method).toBe('PUT')
    expect(sentUrl(fetch, 1)).toBe('/api/v1/admin/staff/s1')
  })

  it('exportCsv sends null for empty dates', async () => {
    const fetch = mockFetch(new Response('a', { status: 200 }))

    await adminApi.exportCsv('Deposits', 'Monthly', true)

    expect(sentBody(fetch)).toEqual({ dataset: 'Deposits', reason: 'Monthly', masked: true, from: null, to: null })
  })
})
