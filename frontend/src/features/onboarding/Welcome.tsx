import { LogoLockup } from '../../components/Brand/Logo'
import { ButtonLink, Card, Segmented } from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'
import type { Lang, TextSize } from '../../store/types'

const textSizeOptions: { value: TextSize; className: string; label: string }[] = [
  { value: 'small', className: 'text-sm', label: 'Small text' },
  { value: 'normal', className: 'text-base', label: 'Normal text' },
  { value: 'large', className: 'text-xl', label: 'Large text' },
]

export const TextSizePicker = () => {
  const { state, run } = useStore()
  const t = useT()

  return (
    <div
      role="group"
      aria-label={t('Text size')}
      className="flex items-center gap-2"
    >
      {textSizeOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-label={t(option.label)}
          aria-pressed={state.textSize === option.value}
          onClick={() =>
            run((current) => ({ ...current, textSize: option.value }))
          }
          className={`flex h-11 w-11 items-center justify-center rounded-full border font-semibold transition-colors ${
            option.className
          } ${
            state.textSize === option.value
              ? 'border-marigold bg-marigold text-marigold-ink'
              : 'border-line text-muted hover:text-ink'
          }`}
        >
          A
        </button>
      ))}
    </div>
  )
}

export const LanguagePicker = () => {
  const { state, run } = useStore()
  const t = useT()

  return (
    <Segmented<Lang>
      label={t('Choose language')}
      value={state.lang}
      onChange={(lang) => run((current) => ({ ...current, lang }))}
      options={[
        { value: 'en', label: 'English' },
        { value: 'hi', label: 'हिन्दी' },
      ]}
    />
  )
}

const Welcome = () => {
  const t = useT()

  return (
    <div className="grid items-center gap-8 lg:min-h-[70vh] lg:grid-cols-2 lg:gap-16">
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
        <LogoLockup size="lg" stacked subtitle="" />
        <h1 className="mt-6 font-display text-4xl leading-tight md:text-6xl">
          {t('Complete your offering.')}
        </h1>
        <p className="mt-3 font-display text-2xl text-marigold md:text-3xl">
          निर्माल्य को प्रकृति को लौटाएँ
        </p>
        <p className="mt-4 max-w-md text-muted">
          {t('Turn temple nirmalya into manure and rewards.')}
        </p>
      </div>

      <Card className="mx-auto flex w-full max-w-md flex-col gap-5 md:p-7">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted">
            {t('Choose language')}
          </p>
          <LanguagePicker />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted">{t('Text size')}</p>
          <TextSizePicker />
        </div>
        <ButtonLink to="/login" full>
          {t('Get started')}
        </ButtonLink>
        <ButtonLink to="/login" variant="secondary" full>
          {t('I already have an account')}
        </ButtonLink>
      </Card>
    </div>
  )
}

export default Welcome
