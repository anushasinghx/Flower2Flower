import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { StoreContext } from './appStore'
import type { AppState } from './types'
import { initialState } from './initialState'
import { loadForSession, signedOut } from './remote'
import { errorMessage, getToken, onUnauthorized, setToken } from '../services/api'
import { translations } from '../utils/translations'

const STORAGE_KEY = 'flower2flower.app.v4'

type Saved = Pick<
  AppState,
  | 'lang'
  | 'textSize'
  | 'session'
  | 'user'
  | 'pendingMobile'
  | 'cart'
  | 'payWith'
  | 'pointsApplied'
  | 'fulfilment'
  | 'pickupTempleId'
  | 'operator'
  | 'devotees'
> & { queued: AppState['deposits'] }

const loadState = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const saved = JSON.parse(raw) as Partial<Saved>
    const hasToken = Boolean(getToken())
    const session = hasToken ? (saved.session ?? null) : null
    return {
      ...initialState,
      lang: saved.lang ?? initialState.lang,
      textSize: saved.textSize ?? initialState.textSize,
      session,
      user: session ? (saved.user ?? null) : null,
      pendingMobile: saved.pendingMobile ?? '',
      cart: saved.cart ?? [],
      payWith: saved.payWith ?? initialState.payWith,
      pointsApplied: saved.pointsApplied ?? 0,
      fulfilment: saved.fulfilment ?? initialState.fulfilment,
      pickupTempleId: saved.pickupTempleId ?? '',
      operator: session === 'operator' && saved.operator ? saved.operator : initialState.operator,
      devotees: session === 'operator' ? (saved.devotees ?? []) : [],
      deposits: session === 'operator' ? (saved.queued ?? []) : [],
    }
  } catch {
    return initialState
  }
}

const saveState = (state: AppState) => {
  const saved: Saved = {
    lang: state.lang,
    textSize: state.textSize,
    session: state.session,
    user: state.user,
    pendingMobile: state.pendingMobile,
    cart: state.cart,
    payWith: state.payWith,
    pointsApplied: state.pointsApplied,
    fulfilment: state.fulfilment,
    pickupTempleId: state.pickupTempleId,
    operator: state.operator,
    devotees: state.devotees.slice(0, 50),
    queued: state.deposits.filter((deposit) => !deposit.synced),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  } catch {
    return
  }
}

const textSizes = { small: '93.75%', normal: '100%', large: '112.5%' }

const AppStoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(loadState)
  const [message, setMessage] = useState('')
  const stateRef = useRef(state)
  const loadId = useRef(0)

  useEffect(() => {
    stateRef.current = state
    saveState(state)
  }, [state])

  useEffect(() => {
    document.documentElement.style.fontSize = textSizes[state.textSize]
    document.documentElement.lang = state.lang
  }, [state.textSize, state.lang])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 3200)
    return () => window.clearTimeout(timer)
  }, [message])

  const toast = useCallback((text: string) => setMessage(text), [])

  const refresh = useCallback(async () => {
    const current = stateRef.current
    const id = ++loadId.current
    try {
      const patch = await loadForSession(current.session, current.operator.templeId)
      if (id === loadId.current) setState(patch)
    } catch (error) {
      if (id === loadId.current) {
        setState((latest) => ({ ...latest, loaded: true }))
        if ((error as { status?: number }).status !== 401) toast(errorMessage(error))
      }
    }
  }, [toast])

  useEffect(() => {
    onUnauthorized(() => {
      setToken('')
      setState((latest) => (latest.session ? signedOut(latest) : latest))
      const text = 'Your session has ended. Please log in again.'
      setMessage(stateRef.current.lang === 'hi' ? (translations[text] ?? text) : text)
    })
    return () => onUnauthorized(null)
  }, [])

  useEffect(() => {
    void refresh()
  }, [state.session, state.user?.userId, state.operator.templeId, refresh])

  const value = useMemo(
    () => ({ state, run: setState, toast, refresh }),
    [state, toast, refresh],
  )

  return (
    <StoreContext.Provider value={value}>
      {children}
      {message && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-[70] mx-auto w-fit max-w-md rounded-2xl border border-line bg-raised px-5 py-3 text-center font-body text-sm text-ink shadow-2xl md:bottom-8"
        >
          {message}
        </div>
      )}
    </StoreContext.Provider>
  )
}

export default AppStoreProvider
