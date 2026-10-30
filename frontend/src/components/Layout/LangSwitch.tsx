import { useStore, useT } from '../../store/appStore'

const LangSwitch = () => {
  const { state, run } = useStore()
  const t = useT()

  return (
    <button
      type="button"
      onClick={() =>
        run((current) => ({
          ...current,
          lang: current.lang === 'en' ? 'hi' : 'en',
        }))
      }
      aria-label={t('Change language')}
      className="flex h-11 items-center gap-1 rounded-full border border-line px-3 text-sm text-muted transition-colors hover:text-ink"
    >
      <span className={state.lang === 'en' ? 'font-semibold text-ink' : ''}>
        EN
      </span>
      <span aria-hidden="true">·</span>
      <span className={state.lang === 'hi' ? 'font-semibold text-ink' : ''}>
        हि
      </span>
    </button>
  )
}

export default LangSwitch
