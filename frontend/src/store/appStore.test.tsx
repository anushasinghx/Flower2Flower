import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { StoreContext, useAction, useStore, useT, type StoreValue } from './appStore'
import { makeState } from '../test/fixtures'
import { ApiError } from '../services/api'

const wrapper = (value: Partial<StoreValue>) => {
  const full: StoreValue = {
    state: makeState(),
    run: vi.fn(),
    toast: vi.fn(),
    refresh: vi.fn(async () => undefined),
    ...value,
  }
  const Wrapper = ({ children }: { children: ReactNode }) => <StoreContext.Provider value={full}>{children}</StoreContext.Provider>
  return { Wrapper, value: full }
}

describe('useStore', () => {
  it('throws outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => renderHook(() => useStore())).toThrow('useStore must be used inside AppStoreProvider')
    spy.mockRestore()
  })
})

describe('useT', () => {
  it('returns english text in english', () => {
    const { Wrapper } = wrapper({ state: makeState({ lang: 'en' }) })
    const { result } = renderHook(() => useT(), { wrapper: Wrapper })
    expect(result.current('Send OTP')).toBe('Send OTP')
  })

  it('returns hindi text in hindi', () => {
    const { Wrapper } = wrapper({ state: makeState({ lang: 'hi' }) })
    const { result } = renderHook(() => useT(), { wrapper: Wrapper })
    expect(result.current('Send OTP')).toBe('OTP भेजें')
  })

  it('falls back to english for unknown text', () => {
    const { Wrapper } = wrapper({ state: makeState({ lang: 'hi' }) })
    const { result } = renderHook(() => useT(), { wrapper: Wrapper })
    expect(result.current('Totally new sentence')).toBe('Totally new sentence')
  })

  it('fills every placeholder', () => {
    const { Wrapper } = wrapper({ state: makeState({ lang: 'en' }) })
    const { result } = renderHook(() => useT(), { wrapper: Wrapper })
    expect(result.current('{a} and {b} and {a}', { a: 1, b: 'two' })).toBe('1 and two and 1')
  })
})

describe('useAction', () => {
  it('runs work, refreshes and shows the success toast', async () => {
    const { Wrapper, value } = wrapper({})
    const { result } = renderHook(() => useAction(), { wrapper: Wrapper })
    const work = vi.fn(async () => undefined)

    let ok = false
    await act(async () => {
      ok = await result.current.act(work, 'Saved')
    })

    expect(ok).toBe(true)
    expect(work).toHaveBeenCalledTimes(1)
    expect(value.refresh).toHaveBeenCalledTimes(1)
    expect(value.toast).toHaveBeenCalledWith('Saved')
    expect(result.current.busy).toBe(false)
  })

  it('shows the translated error and skips refresh on failure', async () => {
    const { Wrapper, value } = wrapper({ state: makeState({ lang: 'hi' }) })
    const { result } = renderHook(() => useAction(), { wrapper: Wrapper })

    let ok = true
    await act(async () => {
      ok = await result.current.act(async () => {
        throw new ApiError('Send OTP', 400)
      }, 'Saved')
    })

    expect(ok).toBe(false)
    expect(value.refresh).not.toHaveBeenCalled()
    expect(value.toast).toHaveBeenCalledWith('OTP भेजें')
  })

  it('is busy while work is running', async () => {
    const { Wrapper } = wrapper({})
    let finish: () => void = () => undefined
    const Probe = () => {
      const { act: run, busy } = useAction()
      return (
        <button onClick={() => void run(() => new Promise<void>((resolve) => { finish = resolve }))}>
          {busy ? 'busy' : 'idle'}
        </button>
      )
    }
    render(<Probe />, { wrapper: Wrapper })

    act(() => screen.getByRole('button').click())
    expect(await screen.findByText('busy')).toBeInTheDocument()

    await act(async () => finish())
    await waitFor(() => expect(screen.getByText('idle')).toBeInTheDocument())
  })
})
