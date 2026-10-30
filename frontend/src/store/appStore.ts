import { createContext, useCallback, useContext } from 'react'
import type { AppState } from './types'
import { translations } from '../utils/translations'

export type StoreValue = {
  state: AppState
  run: (update: (state: AppState) => AppState) => void
  toast: (message: string) => void
}

export const StoreContext = createContext<StoreValue | null>(null)

export const useStore = () => {
  const value = useContext(StoreContext)

  if (!value) {
    throw new Error('useStore must be used inside AppStoreProvider')
  }

  return value
}

export type Translate = (
  text: string,
  vars?: Record<string, string | number>,
) => string

export const useT = (): Translate => {
  const { state } = useStore()
  const lang = state.lang

  return useCallback(
    (text, vars) => {
      let result = lang === 'hi' ? (translations[text] ?? text) : text

      if (vars) {
        Object.entries(vars).forEach(([key, value]) => {
          result = result.replaceAll(`{${key}}`, String(value))
        })
      }

      return result
    },
    [lang],
  )
}
