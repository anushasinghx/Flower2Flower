import { NavLink, Outlet, useLocation } from 'react-router-dom'
import TopBar from './TopBar'
import Icon from '../ui/Icon'
import { devoteeNav } from './devoteeNav'
import { useStore, useT } from '../../store/appStore'

const DevoteeShell = () => {
  const { pathname } = useLocation()
  const { state } = useStore()
  const t = useT()
  const hasNavRoute = devoteeNav.some((item) => item.to === pathname)
  const shopBarShowing = pathname === '/app/shop' && state.cart.length > 0
  const showBottomNav = hasNavRoute && !shopBarShowing

  return (
    <div className="app-theme flex flex-col">
      <TopBar showNav />

      <main
        className={`mx-auto w-full max-w-6xl flex-1 px-4 pt-5 md:px-8 md:pt-8 ${
          showBottomNav ? 'pb-28 md:pb-12' : 'pb-12'
        }`}
      >
        <Outlet />
      </main>

      {showBottomNav && (
        <nav
          aria-label={t('Main')}
          className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden"
        >
          <div className="grid grid-cols-4">
            {devoteeNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/app'}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-1 text-sm ${
                    isActive ? 'text-marigold' : 'text-muted'
                  }`
                }
              >
                <Icon name={item.icon} size={24} />
                {t(item.label)}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

export default DevoteeShell
