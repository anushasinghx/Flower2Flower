import { useEffect, useState, type ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { StoreContext, type StoreValue } from '../store/appStore'
import type { AppState } from '../store/types'
import { makeState } from './fixtures'
import LocationProbe from './LocationProbe'

type Options = {
  state?: AppState
  route?: string
  path?: string
  toast?: StoreValue['toast']
  refresh?: StoreValue['refresh']
}

export const renderWithStore = (ui: ReactNode, options: Options = {}) => {
  const toast = options.toast ?? vi.fn()
  const refresh = options.refresh ?? vi.fn(async () => undefined)
  const initial = options.state ?? makeState()
  const latest: { state: AppState } = { state: initial }

  const Provider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<AppState>(initial)
    useEffect(() => {
      latest.state = state
    }, [state])
    return (
      <StoreContext.Provider value={{ state, run: setState, toast, refresh }}>{children}</StoreContext.Provider>
    )
  }

  const result = render(
    <MemoryRouter initialEntries={[options.route ?? '/']}>
      <Provider>
        <Routes>
          <Route path={options.path ?? '/'} element={ui} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </Provider>
    </MemoryRouter>,
  )

  return { ...result, toast, refresh, latest }
}
