const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api/v1'
const TOKEN_KEY = 'flower2flower.token'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

let unauthorizedHandler: (() => void) | null = null

export const onUnauthorized = (handler: (() => void) | null) => {
  unauthorizedHandler = handler
}

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export const setToken = (token: string) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    return
  }
}

const readError = async (response: Response) => {
  try {
    const body = await response.json()
    if (typeof body?.message === 'string') return body.message as string
    if (body?.errors && typeof body.errors === 'object') {
      const first = Object.values(body.errors as Record<string, string[]>)[0]
      if (Array.isArray(first) && first[0]) return first[0]
    }
    if (typeof body?.title === 'string') return body.title as string
  } catch {
    return response.statusText || 'Something went wrong.'
  }
  return response.statusText || 'Something went wrong.'
}

const request = async (method: string, path: string, body?: unknown) => {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, { method, headers, body: payload })
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection.', 0)
  }

  if (response.status === 401 && token) {
    unauthorizedHandler?.()
  }

  if (!response.ok) {
    throw new ApiError(await readError(response), response.status)
  }

  return response
}

const json = async <T>(response: Response): Promise<T> => {
  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  get: async <T>(path: string) => json<T>(await request('GET', path)),
  post: async <T>(path: string, body?: unknown) =>
    json<T>(await request('POST', path, body ?? {})),
  put: async <T>(path: string, body?: unknown) =>
    json<T>(await request('PUT', path, body ?? {})),
  blob: async (path: string, body: unknown) => {
    const response = await request('POST', path, body)
    const disposition = response.headers.get('Content-Disposition') ?? ''
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
    return { blob: await response.blob(), filename: match?.[1] ?? 'export.csv' }
  },
  file: async (id: string) => (await request('GET', `/files/${id}`)).blob(),
  upload: async <T>(file: Blob, purpose: string, name = 'upload.jpg') => {
    const form = new FormData()
    form.append('File', file, name)
    form.append('Purpose', purpose)
    return json<T>(await request('POST', '/files', form))
  },
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong.'

export const query = (params: Record<string, string | number | boolean | undefined | null>) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  const text = search.toString()
  return text ? `?${text}` : ''
}

export const fetchAll = async <T>(path: string, params: Record<string, string | number | undefined> = {}) => {
  const items: T[] = []
  for (let page = 1; page <= 20; page += 1) {
    const result = await api.get<{ items: T[]; total: number }>(
      `${path}${query({ ...params, page, pageSize: 200 })}`,
    )
    items.push(...result.items)
    if (items.length >= result.total || result.items.length === 0) break
  }
  return items
}

export const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const dataUrlToBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob()

export const compressImage = (file: File, maxSide = 1280, quality = 0.8) =>
  new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Could not read the file.'))
      reader.readAsDataURL(file)
      return
    }
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read the photo.'))
    }
    image.src = url
  })

export const samplePhoto = (label: string) => {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 480
  const context = canvas.getContext('2d')
  if (context) {
    context.fillStyle = '#2f4a3a'
    context.fillRect(0, 0, 640, 480)
    context.fillStyle = '#f2a541'
    for (let index = 0; index < 60; index += 1) {
      context.beginPath()
      context.arc((index * 97) % 640, (index * 53) % 480, 18 + (index % 5) * 4, 0, Math.PI * 2)
      context.fill()
    }
    context.fillStyle = '#ffffff'
    context.font = 'bold 36px sans-serif'
    context.textAlign = 'center'
    context.fillText(label, 320, 250)
  }
  return canvas.toDataURL('image/jpeg', 0.8)
}
