import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogoLockup } from '../Brand/Logo'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'About Us', href: '#about' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Marketplace', href: '#marketplace' },
  ]

  const handleAuthNavigation = () => {
    setIsMenuOpen(false)
    navigate('/auth')
  }

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (href === '/') {
      e.preventDefault()
      setIsMenuOpen(false)
      navigate('/')
    } else {
      setIsMenuOpen(false)
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-5 py-3 md:px-10">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            setIsMenuOpen(false)
            navigate('/')
          }}
          className="flex items-center gap-2"
        >
          <LogoLockup size="sm" subtitle="" />
        </a>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-sm text-white/75 transition-colors duration-200 hover:text-white"
            >
              {link.name}
            </a>
          ))}

          <button
            type="button"
            onClick={handleAuthNavigation}
            className="rounded-full border border-white/30 px-5 py-2 text-sm text-white transition-colors duration-200 hover:bg-white hover:text-black"
          >
            Login / Sign Up
          </button>
        </div>

        
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={
            isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'
          }
          aria-expanded={isMenuOpen}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/20 md:hidden"
        >
          <span
            className={`h-0.5 w-5 bg-white transition-transform ${
              isMenuOpen ? 'translate-y-2 rotate-45' : ''
            }`}
          />
          <span
            className={`h-0.5 w-5 bg-white transition-opacity ${
              isMenuOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`h-0.5 w-5 bg-white transition-transform ${
              isMenuOpen ? '-translate-y-2 -rotate-45' : ''
            }`}
          />
        </button>
      </div>

      
      {isMenuOpen && (
        <div className="border-t border-white/10 bg-black/90 px-5 py-5 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-5">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-sm text-white/80 transition-colors hover:text-white"
              >
                {link.name}
              </a>
            ))}

            <button
              type="button"
              onClick={handleAuthNavigation}
              className="w-fit rounded-full border border-white/30 px-5 py-2 text-sm text-white hover:bg-white hover:text-black"
            >
              Login / Sign Up
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar