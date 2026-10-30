import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogoLockup, LogoMark } from '../Brand/Logo'
import Icon, { type IconName } from '../ui/Icon'
import LangSwitch from './LangSwitch'
import { useStore, useT } from '../../store/appStore'
import { logout, resetDemo } from '../../store/actions'

type NavItem = { to: string; label: string; icon: IconName }

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: '',
    items: [{ to: '/admin', label: 'Dashboard', icon: 'grid' }],
  },
  {
    label: 'People',
    items: [
      { to: '/admin/kyc', label: 'User KYC', icon: 'badge' },
      { to: '/admin/temples', label: 'Temples', icon: 'temple' },
    ],
  },
  {
    label: 'Points',
    items: [
      { to: '/admin/rules', label: 'Rules and levels', icon: 'sliders' },
      { to: '/admin/alerts', label: 'Alerts and held', icon: 'bell' },
    ],
  },
  {
    label: 'Nursery',
    items: [
      { to: '/admin/batches', label: 'Batches', icon: 'layers' },
      { to: '/admin/catalogue', label: 'Catalogue', icon: 'box' },
      { to: '/admin/orders', label: 'Orders', icon: 'cart' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/users', label: 'Users and roles', icon: 'users' },
      { to: '/admin/audit', label: 'Audit log', icon: 'file' },
    ],
  },
]

const SideNav = ({
  compact = false,
  onNavigate,
}: {
  compact?: boolean
  onNavigate?: () => void
}) => {
  const t = useT()

  return (
    <nav aria-label={t('Admin')} className="flex flex-col gap-1 p-3">
      {navGroups.map((group) => (
        <div key={group.label || 'top'} className="flex flex-col gap-1">
          {group.label && !compact && (
            <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {t(group.label)}
            </p>
          )}
          {group.label && compact && <span className="mx-3 my-2 border-t border-line" />}
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              onClick={onNavigate}
              title={compact ? t(item.label) : undefined}
              aria-label={compact ? t(item.label) : undefined}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-2xl px-3 font-medium transition-colors ${
                  compact ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-marigold text-marigold-ink'
                    : 'text-ink hover:bg-surface'
                }`
              }
            >
              <Icon name={item.icon} size={20} />
              {!compact && t(item.label)}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}

const AdminMenu = () => {
  const { run, toast } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(!open)}
        className="flex h-11 items-center gap-2 rounded-full border border-line px-3 text-sm text-ink hover:bg-surface"
      >
        <Icon name="user" size={18} />
        <span className="hidden sm:inline">{t('Admin')}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-line bg-surface p-2 shadow-2xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              run(resetDemo)
              setOpen(false)
              toast(t('Demo data was reset.'))
            }}
            className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left hover:bg-raised"
          >
            <Icon name="reset" size={18} />
            {t('Reset demo data')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              run(logout)
              navigate('/welcome')
            }}
            className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sindoor hover:bg-raised"
          >
            <Icon name="logout" size={18} />
            {t('Log out')}
          </button>
        </div>
      )}
    </div>
  )
}

const AdminShell = () => {
  const t = useT()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const nursery = pathname.startsWith('/admin/batches')

  return (
    <div className="app-theme flex flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-night">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t('Open menu')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line md:hidden"
            >
              <Icon name="menu" size={20} />
            </button>
            <span className="sm:hidden">
              <LogoMark size={34} />
            </span>
            <span className="hidden sm:inline-flex">
              <LogoLockup
                size="sm"
                subtitle={nursery ? t('Nursery') : t('Admin console')}
              />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted lg:inline">
              {t('Pilot: Shipra')}
            </span>
            <LangSwitch />
            <AdminMenu />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 overflow-y-auto border-r border-line md:block md:w-[4.75rem] lg:w-64">
          <div className="lg:hidden">
            <SideNav compact />
          </div>
          <div className="hidden lg:block">
            <SideNav />
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-12 pt-5 md:px-6 md:pt-6 lg:px-8">
          <div className="mx-auto w-full max-w-[90rem]">
            <Outlet />
          </div>
        </main>
      </div>

      {drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('Menu')}
          className="fixed inset-0 z-[60] md:hidden"
        >
          <button
            type="button"
            aria-label={t('Close')}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 cursor-default bg-black/60"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-line bg-night">
            <div className="flex items-center justify-between gap-2 border-b border-line p-3">
              <LogoLockup size="sm" subtitle={t('Admin console')} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t('Close')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <SideNav onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminShell
