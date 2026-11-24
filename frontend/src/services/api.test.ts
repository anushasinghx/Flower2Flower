import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, errorMessage, fetchAll, getToken, onUnauthorized, query, setToken } from './api'
import { jsonResponse, mockFetch, sentBody, sentInit, sentUrl } from '../test/fixtures'

afterEach(() => {
  onUnauthorized(null)
})

describe('token storage', () => {
  it('stores and clears the token', () => {
    setToken('abc')
    expect(getToken()).toBe('abc')
    setToken('')
    expect(getToken()).toBe('')
  })
})

describe('requests', () => {
  it('sends bearer token and accept header when signed in', async () => {
    setToken('tok')
    const fetch = mockFetch(jsonResponse({ ok: true }))

    const result = await api.get<{ ok: boolean }>('/me')

    expect(result).toEqual({ ok: true })
    expect(sentUrl(fetch)).toBe('/api/v1/me')
    const headers = sentInit(fetch).headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer tok')
    expect(headers.Accept).toBe('application/json')
  })

  it('omits authorization when signed out', async () => {
    const fetch = mockFetch(jsonResponse([]))
    await api.get('/products')
    expect((sentInit(fetch).headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('posts json bodies', async () => {
    const fetch = mockFetch(jsonResponse({ id: 1 }, 201))

    await api.post('/orders', { qty: 2 })

    expect(sentInit(fetch).method).toBe('POST')
    expect((sentInit(fetch).headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(sentBody(fetch)).toEqual({ qty: 2 })
  })

  it('sends an empty object when post has no body', async () => {
    const fetch = mockFetch(jsonResponse({}))
    await api.post('/auth/logout')
    expect(sentBody(fetch)).toEqual({})
  })

  it('uses put for updates', async () => {
    const fetch = mockFetch(jsonResponse({}))
    await api.put('/me/profile', { fullName: 'A' })
    expect(sentInit(fetch).method).toBe('PUT')
  })

  it('returns undefined for no content', async () => {
    mockFetch(new Response(null, { status: 204 }))
    await expect(api.post('/me/notices/1/dismiss')).resolves.toBeUndefined()
  })

  it('uploads files as form data without json header', async () => {
    const fetch = mockFetch(jsonResponse({ id: 'f1' }, 201))

    const result = await api.upload<{ id: string }>(new Blob(['x'], { type: 'image/jpeg' }), 'KycFront', 'front.jpg')

    const init = sentInit(fetch)
    expect(result.id).toBe('f1')
    expect(init.body).toBeInstanceOf(FormData)
    expect((init.body as FormData).get('Purpose')).toBe('KycFront')
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined()
  })

  it('reads filename from content disposition for downloads', async () => {
    mockFetch(new Response('a,b', { status: 200, headers: { 'Content-Disposition': 'attachment; filename=deposits_20261124.csv' } }))
    const result = await api.blob('/admin/exports', { dataset: 'Deposits' })
    expect(result.filename).toBe('deposits_20261124.csv')
    expect(await result.blob.text()).toBe('a,b')
  })

  it('falls back to export.csv when filename is missing', async () => {
    mockFetch(new Response('x', { status: 200 }))
    expect((await api.blob('/admin/exports', {})).filename).toBe('export.csv')
  })
})

describe('errors', () => {
  it('uses the server message', async () => {
    mockFetch(jsonResponse({ message: 'This number is already registered.' }, 409))
    await expect(api.post('/x', {})).rejects.toMatchObject({ message: 'This number is already registered.', status: 409 })
  })

  it('uses the first validation error', async () => {
    mockFetch(jsonResponse({ title: 'One or more validation errors occurred.', errors: { FullName: ['The FullName field is required.'] } }, 400))
    await expect(api.post('/x', {})).rejects.toThrow('The FullName field is required.')
  })

  it('uses the problem title when there is no message', async () => {
    mockFetch(jsonResponse({ title: 'Not Found' }, 404))
    await expect(api.get('/x')).rejects.toThrow('Not Found')
  })

  it('falls back to status text for non json errors', async () => {
    mockFetch(new Response('oops', { status: 500, statusText: 'Server Error' }))
    await expect(api.get('/x')).rejects.toThrow('Server Error')
  })

  it('reports network failures as status 0', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    const error = (await api.get('/x').catch((problem: unknown) => problem)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
    expect(error.message).toBe('Cannot reach the server. Check your connection.')
  })

  it('calls the unauthorized handler only when a token was sent', async () => {
    const handler = vi.fn()
    onUnauthorized(handler)

    mockFetch(jsonResponse({ message: 'no' }, 401))
    await api.get('/me').catch(() => undefined)
    expect(handler).not.toHaveBeenCalled()

    setToken('expired')
    mockFetch(jsonResponse({ message: 'no' }, 401))
    await api.get('/me').catch(() => undefined)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('errorMessage reads errors and falls back for unknown values', () => {
    expect(errorMessage(new Error('Boom'))).toBe('Boom')
    expect(errorMessage('text')).toBe('Something went wrong.')
  })
})

describe('query and paging helpers', () => {
  it('builds a query string skipping empty values', () => {
    expect(query({ a: 1, b: '', c: undefined, d: null, e: false, f: 'x y' })).toBe('?a=1&e=false&f=x+y')
    expect(query({ a: undefined })).toBe('')
  })

  it('fetchAll keeps paging until total is reached', async () => {
    const fetch = mockFetch(jsonResponse({ items: [1, 2], total: 3 }), jsonResponse({ items: [3], total: 3 }))

    const items = await fetchAll<number>('/admin/kyc', { status: 'pending' })

    expect(items).toEqual([1, 2, 3])
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(sentUrl(fetch, 1)).toBe('/api/v1/admin/kyc?status=pending&page=2&pageSize=200')
  })

  it('fetchAll stops on an empty page', async () => {
    const fetch = mockFetch(jsonResponse({ items: [], total: 50 }))
    expect(await fetchAll('/admin/audit')).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
