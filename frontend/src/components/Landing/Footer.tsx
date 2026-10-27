const Footer = () => {
  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'About', href: '#about' },
    { name: 'Services', href: '#services' },
    { name: 'Marketplace', href: '#marketplace' },
  ]

  return (
    <footer className="w-full border-t border-white/10 bg-white/[0.04] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 py-8 sm:px-10 md:flex-row">
        <a
          href="#home"
          className="text-lg font-semibold tracking-wide text-white"
        >
          Flower2Flower
        </a>


        
        <p className="text-center text-xs text-white/40">
          © {new Date().getFullYear()} Flower2Flower
        </p>
      </div>
    </footer>
  )
}

export default Footer