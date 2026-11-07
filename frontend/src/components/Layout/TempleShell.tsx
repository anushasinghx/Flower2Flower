import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { LogoLockup, LogoMark } from '../Brand/Logo'
import LangSwitch from './LangSwitch'
import LogoutButton from './LogoutButton'
import { useStore, useT } from '../../store/appStore'

const TempleShell = () => {
  const { state } = useStore()
  const t = useT()
  const { pathname } = useLocation()
  const signedIn = state.session === 'templeAdmin'

  if (!signedIn && pathname !== '/temple') {
    return <Navigate to="/temple" replace />
  }

  return (
    <div className="app-theme flex flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-night">
        <div className="mx-auto flex min-h-14 w-full max-w-3xl items-center justify-between gap-3 px-4 py-2">
          <Link to="/temple" aria-label={t('Temple admin')}>
            <span className="sm:hidden">
              <LogoMark size={34} />
            </span>
            <span className="hidden sm:inline-flex">
              <LogoLockup size="sm" subtitle={t('Temple admin')} />
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LangSwitch />
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

export default TempleShell
