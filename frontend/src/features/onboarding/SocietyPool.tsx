import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import Icon from '../../components/ui/Icon'
import {
  Button,
  Card,
  EmptyState,
  Pill,
  Progress,
  TextInput,
  Toggle,
} from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'
import { setSociety } from '../../store/actions'
import { formatNumber } from '../../utils/points'

const SocietyPool = ({ inApp = false }: { inApp?: boolean }) => {
  const { state, run, toast } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(state.devotee.societyId)
  const [poolOn, setPoolOn] = useState(state.devotee.poolOn)
  const nextPath = inApp ? '/app/profile' : '/app'
  const society = state.societies.find((item) => item.id === selected)
  const results = state.societies.filter((item) =>
    `${item.name} ${item.area} 201014`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )

  const save = () => {
    run((current) => setSociety(current, selected, poolOn && selected !== null))
    if (inApp) toast(t('Society choice saved.'))
    navigate(nextPath)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <ScreenHeader
        title={t('Your society')}
        backTo={inApp ? '/app/profile' : undefined}
      />
      <p className="text-muted">
        {t(
          'Join your housing society so neighbours can pool points toward bigger rewards. This is optional.',
        )}
      </p>

      <label className="relative block">
        <span className="sr-only">{t('Search society name or PIN')}</span>
        <Icon
          name="search"
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        />
        <TextInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('Search society name or PIN')}
          className="pl-11"
        />
      </label>

      <div className="flex flex-col gap-3">
        {results.length === 0 && (
          <EmptyState icon="search" title={t('No society found')} />
        )}
        {results.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected === item.id}
            onClick={() => setSelected(selected === item.id ? null : item.id)}
            className={`flex items-center justify-between gap-3 rounded-3xl border bg-surface p-4 text-left transition-colors ${
              selected === item.id
                ? 'border-2 border-marigold'
                : 'border-line hover:border-muted'
            }`}
          >
            <span className="min-w-0">
              <span className="block font-semibold">{item.name}</span>
              <span className="text-sm text-muted">
                {t(item.area)} · {t('{count} members', { count: item.members })}
              </span>
            </span>
            {selected === item.id && <Pill tone="green">{t('Selected')}</Pill>}
          </button>
        ))}
      </div>

      {society && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">
              {t('Contribute my points to society pool')}
            </span>
            <Toggle
              checked={poolOn}
              onChange={setPoolOn}
              label={t('Contribute my points to society pool')}
            />
          </div>
          <p className="text-sm text-muted">
            {t('You can change this anytime in your profile.')}
          </p>
          <div className="border-t border-line pt-3">
            <p className="text-sm text-muted">{t('Society pool this month')}</p>
            <p className="font-display text-4xl text-marigold">
              {formatNumber(society.poolPoints)} {t('pts')}
            </p>
            <div className="mt-2">
              <Progress
                value={society.progress}
                label={t('Society pool this month')}
              />
            </div>
            <p className="mt-2 text-sm text-muted">
              {t('{percent}% of next society reward', {
                percent: society.progress,
              })}
            </p>
          </div>
        </Card>
      )}

      <Button full onClick={save}>
        {inApp ? t('Save') : t('Continue to Home')}
      </Button>
      {!inApp && (
        <Button variant="secondary" full onClick={() => navigate('/app')}>
          {t('Skip for now')}
        </Button>
      )}
    </div>
  )
}

export default SocietyPool
