import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { LogoLockup, LogoMark } from '../Brand/Logo'
import Icon from '../ui/Icon'
import LangSwitch from './LangSwitch'
import LogoutButton from './LogoutButton'
import { useStore, useT } from '../../store/appStore'
import { setOffline, syncOne } from '../../store/fieldActions'

const OperatorShell = () => {
  const { state, run, toast } = useStore()
  const t = useT()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const { offline, templeId, lastSync } = state.operator
  const temple = state.temples.find((item) => item.id === templeId)
  const queued = state.deposits.filter((deposit) => !deposit.synced).length
  const signedIn = state.session === 'operator'
  const previousQueued = useRef(queued)

  // Auto sync runs when the connection returns, one deposit at a time.
  useEffect(() => {
    if (offline || queued === 0) return
    const timer = window.setTimeout(() => run(syncOne), 700)
    return () => window.clearTimeout(timer)
  }, [offline, queued, run])

  useEffect(() => {
    if (previousQueued.current > 0 && queued === 0 && !offline) {
      toast(t('All synced.'))
    }
    previousQueued.current = queued
  }, [queued, offline, toast, t])

  if (!signedIn && pathname !== '/operator') {
    return <Navigate to="/operator" replace />
  }

  const statusText = offline
    ? t('Offline · working locally · {count} queued', { count: queued })
    : queued > 0
      ? t('Syncing · {count} left', { count: queued })
      : lastSync
        ? t('Online · {temple} · last sync {time}', {
            temple: temple?.name ?? '',
            time: lastSync,
          })
        : t('Online · {temple}', { temple: temple?.name ?? '' })

  return (
    <div className="app-theme flex flex-col">
      {signedIn && (
        <Link
          to="/operator/sync"
          className={`block px-4 py-1.5 text-center text-sm font-medium ${
            offline ? 'bg-sindoor text-marigold-ink' : 'bg-surface text-tulsi'
          }`}
        >
          <span aria-hidden="true">● </span>
          {statusText}
        </Link>
      )}

      <header className="sticky top-0 z-40 border-b border-line bg-night">
        <div className="mx-auto flex min-h-14 w-full max-w-3xl items-center justify-between gap-3 px-4 py-2">
          <Link to="/operator" aria-label={t('Operator')}>
            <span className="sm:hidden">
              <LogoMark size={34} />
            </span>
            <span className="hidden sm:inline-flex">
              <LogoLockup size="sm" subtitle={t('Temple counter')} />
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LangSwitch />
            {signedIn && (
              <div className="relative">
                <button
                  type="button"
                  aria-label={t('Menu')}
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink"
                >
                  <Icon name="menu" size={20} />
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-line bg-surface p-2 shadow-2xl"
                  >
                    {[
                      { to: '/operator', label: t('Collection point') },
                      { to: '/operator/find', label: t('Find devotee') },
                      { to: '/operator/summary', label: t('Daily summary') },
                      { to: '/operator/history', label: t('Deposit history') },
                      { to: '/operator/sync', label: t('Sync queue') },
                    ].map((item) => (
                      <Link
                        key={item.to}
                        role="menuitem"
                        to={item.to}
                        onClick={() => setMenuOpen(false)}
                        className="flex min-h-11 items-center rounded-xl px-3 hover:bg-raised"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        run((current) => setOffline(current, !offline))
                        setMenuOpen(false)
                      }}
                      className="flex min-h-11 w-full items-center rounded-xl px-3 text-left hover:bg-raised"
                    >
                      {offline
                        ? t('Go back online (demo)')
                        : t('Work offline (demo)')}
                    </button>
                  </div>
                )}
              </div>
            )}
            {signedIn && <LogoutButton />}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-12 pt-5 md:pt-8">
        <Outlet />
      </main>
    </div>
  )
}

export default OperatorShell
