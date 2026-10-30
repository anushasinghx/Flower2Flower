import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LogoLockup, LogoMark } from '../Brand/Logo'
import Icon from '../ui/Icon'
import { Button, Field, Sheet, TextArea, TextInput } from '../ui/kit'
import LangSwitch from './LangSwitch'
import { useStore, useT } from '../../store/appStore'
import { devoteeNav } from './devoteeNav'

const TopBar = ({ showNav = false }: { showNav?: boolean }) => {
  const { state, toast } = useStore()
  const t = useT()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [happened, setHappened] = useState('')
  const [expected, setExpected] = useState('')
  const count = state.cart.reduce((sum, line) => sum + line.qty, 0)

  const submitFeedback = () => {
    setFeedbackOpen(false)
    setHappened('')
    setExpected('')
    toast(t('Thank you. Your feedback was sent.'))
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-night">
      <div className="mx-auto flex min-h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 py-2 md:min-h-16 md:px-8">
        <div className="flex min-w-0 items-center gap-8">
          <Link to={showNav ? '/app' : '/welcome'} aria-label="Flower2Flower">
            <span className="sm:hidden">
              <LogoMark size={34} />
            </span>
            <span className="hidden sm:inline-flex">
              <LogoLockup size="sm" />
            </span>
          </Link>

          {showNav && (
            <nav className="hidden gap-6 md:flex" aria-label={t('Main')}>
              {devoteeNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/app'}
                  className={({ isActive }) =>
                    `font-medium transition-colors ${
                      isActive ? 'text-marigold' : 'text-ink hover:text-marigold'
                    }`
                  }
                >
                  {t(item.label)}
                </NavLink>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          <LangSwitch />
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            aria-label={t('Feedback')}
            className="flex h-11 items-center gap-2 rounded-full border border-line px-3 text-sm text-muted transition-colors hover:text-ink"
          >
            <Icon name="chat" size={18} />
            <span className="hidden lg:inline">{t('Feedback')}</span>
          </button>
          {showNav && (
            <Link
              to="/app/cart"
              aria-label={t('Cart ({count})', { count })}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-line text-muted transition-colors hover:text-ink"
            >
              <Icon name="cart" size={20} />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-marigold px-1 text-xs font-bold text-marigold-ink">
                  {count}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>

      <Sheet
        open={feedbackOpen}
        title={t('Send feedback')}
        onClose={() => setFeedbackOpen(false)}
        footer={
          <Button
            full
            disabled={!happened.trim()}
            onClick={submitFeedback}
          >
            {t('Submit')}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label={t('What happened?')}>
            {(id) => (
              <TextArea
                id={id}
                value={happened}
                onChange={(event) => setHappened(event.target.value)}
              />
            )}
          </Field>
          <Field label={t('What did you expect?')}>
            {(id) => (
              <TextArea
                id={id}
                value={expected}
                onChange={(event) => setExpected(event.target.value)}
              />
            )}
          </Field>
          <Field label={t('Attach screenshot')}>
            {(id) => <TextInput id={id} type="file" accept="image/*" />}
          </Field>
        </div>
      </Sheet>
    </header>
  )
}

export default TopBar
