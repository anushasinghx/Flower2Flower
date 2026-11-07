import { Link } from 'react-router-dom'
import { useT } from '../../store/appStore'

const Footer = () => {
  const t = useT()
  const links = [
    { to: '/privacy', label: t('Privacy Notice') },
    { to: '/terms', label: t('Terms') },
    { to: '/contact?topic=feedback', label: t('Feedback') },
    { to: '/contact', label: t('Contact') },
  ]

  return (
    <footer className="w-full border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-8">
        <p className="text-sm text-muted">© Pushp Vatika · Flower2Flower</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm text-ink underline underline-offset-4 hover:text-marigold"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}

export default Footer
