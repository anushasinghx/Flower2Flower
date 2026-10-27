import { useState } from 'react'
import flowerLogo from '../../assets/flower.jpg'
const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'About Us', href: '#about' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Marketplace', href: '#marketplace' },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-5 py-3 md:px-10">
        <a href="#home" className="flex items-center gap-2">
          <img
            src={flowerLogo}
            className="h-9 w-9 rounded-full object-cover"
          />
          <span className="text-lg font-semibold tracking-wide text-white">
            Flower2Flower
          </span>
        </a>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm text-white/75 transition-colors duration-200 hover:text-white"
            >
              {link.name}
            </a>
          ))}

          <a
            href="#login"
            className="rounded-full border border-white/30 px-5 py-2 text-sm text-white transition-colors duration-200 hover:bg-white hover:text-black"
          >
            Login / Sign Up
          </a>
        </div>

        {/* Mobile hamburger button */}
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
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

      {/* Mobile navigation menu */}
      {isMenuOpen && (
        <div className="border-t border-white/10 bg-black/90 px-5 py-5 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-5">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="text-sm text-white/80 transition-colors hover:text-white"
              >
                {link.name}
              </a>
            ))}

            <a
              href="#login"
              onClick={() => setIsMenuOpen(false)}
              className="w-fit rounded-full border border-white/30 px-5 py-2 text-sm text-white hover:bg-white hover:text-black"
            >
              Login / Sign Up
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar