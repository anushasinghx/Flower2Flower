import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { StoreContext } from './appStore'
import type { AppState } from './types'
import { initialState } from '../services/mockData'

const STORAGE_KEY = 'flower2flower.demo.v1'

const loadState = (): AppState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { ...initialState, ...JSON.parse(saved) } : initialState
  } catch {
    return initialState
  }
}

const textSizes = { small: '93.75%', normal: '100%', large: '112.5%' }

const AppStoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(loadState)
  const [message, setMessage] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Demo data simply stays in memory when storage is blocked.
    }
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

  const value = useMemo(
    () => ({ state, run: setState, toast }),
    [state, toast],
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
