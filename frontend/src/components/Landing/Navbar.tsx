import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LogoLockup } from '../Brand/Logo'
import Icon from '../ui/Icon'
import LangSwitch from '../Layout/LangSwitch'
import { useT } from '../../store/appStore'

const Navbar = () => {
  const t = useT()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navLinks = [
    { name: t('How it works'), href: '/#how' },
    { name: t('Collection points'), href: '/#points' },
    { name: t('Shop'), href: '/#shop' },
    { name: t('Points'), href: '/#levels' },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-line bg-night">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-2 md:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" onClick={() => setIsMenuOpen(false)} aria-label="Flower2Flower">
            <LogoLockup size="sm" />
          </Link>
          <div className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-ink transition-colors hover:text-marigold"
              >
                {link.name}
              </a>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LangSwitch />
          <Link
            to="/login"
            className="hidden min-h-11 items-center px-3 text-sm text-ink hover:text-marigold sm:flex"
          >
            {t('Log in')}
          </Link>
          <Link
            to="/welcome"
            className="hidden min-h-11 items-center rounded-full bg-marigold px-5 text-sm font-semibold text-marigold-ink hover:bg-[#f7b555] sm:flex"
          >
            {t('Register')}
          </Link>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? t('Close menu') : t('Open menu')}
            aria-expanded={isMenuOpen}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line lg:hidden"
          >
            <Icon name={isMenuOpen ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="border-t border-line bg-night px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="flex min-h-11 items-center text-ink hover:text-marigold"
              >
                {link.name}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-3 sm:hidden">
              <Link
                to="/login"
                className="flex min-h-11 items-center justify-center rounded-full border border-line"
              >
                {t('Log in')}
              </Link>
              <Link
                to="/welcome"
                className="flex min-h-11 items-center justify-center rounded-full bg-marigold font-semibold text-marigold-ink"
              >
                {t('Register')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar
