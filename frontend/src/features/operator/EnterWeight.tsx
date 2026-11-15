import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import Icon from '../../components/ui/Icon'
import { Button, Card, CheckRow, InfoNote, Pill } from '../../components/ui/kit'
import { DepositSteps, NeedsDraft } from './common'
import { useDraft } from './helpers'
import { useStore, useT } from '../../store/appStore'
import { updateDraft } from '../../store/fieldActions'

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']

const EnterWeight = () => {
  const { state, run } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const { draft, devotee } = useDraft()
  const [value, setValue] = useState(draft?.kg ? String(draft.kg) : '')
  const [confirmed, setConfirmed] = useState(false)

  if (!draft) return <NeedsDraft />

  const kg = Number(value)
  const max = state.rules.maxDepositKg
  const overMax = kg > max

  const press = (key: string) => {
    setConfirmed(false)
    if (key === 'back') {
      setValue(value.slice(0, -1))
      return
    }
    if (key === '.' && value.includes('.')) return
    const [, decimals = ''] = value.split('.')
    if (value.includes('.') && decimals.length >= 2) return
    if (value.replace('.', '').length >= 5) return
    setValue(value === '0' && key !== '.' ? key : `${value}${key}`)
  }

  const next = () => {
    run((current) => updateDraft(current, { kg }))
    navigate('/operator/photo')
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <DepositSteps current={2} />
      <ScreenHeader
        title={t('Enter weight')}
        backTo="/operator/waste"
        right={<Pill>{t(draft.waste)}</Pill>}
      />

      <Card className="flex flex-col gap-4">
        <div className="text-center">
          <p className="text-sm text-muted">{t('Weight (kg)')}</p>
          <p
            aria-live="polite"
            className="font-display text-7xl leading-tight text-marigold"
          >
            {value || '0'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('Keypad')}>
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              aria-label={key === 'back' ? t('Delete') : key}
              onClick={() => press(key)}
              className="flex min-h-14 items-center justify-center rounded-2xl border border-line bg-night text-2xl font-semibold transition-colors hover:bg-raised"
            >
              {key === 'back' ? <Icon name="back" size={22} /> : key}
            </button>
          ))}
        </div>

        {overMax && (
          <p role="alert" className="rounded-2xl border border-sindoor/50 p-3 text-sindoor">
            {t('Above the {max} kg limit. An alert is raised for the admin and points are held.', { max })}
          </p>
        )}

        {kg > 0 && (
          <div className="rounded-2xl border border-line p-3">
            <p className="text-sm text-muted">{t('Read back')}</p>
            <p className="font-medium">
              {t('"{kg} kg of {waste} for {name}"', {
                kg: value,
                waste: t(draft.waste),
                name: devotee?.name ?? '',
              })}
            </p>
            <CheckRow checked={confirmed} onChange={setConfirmed}>
              {t('Weight confirmed with devotee')}
            </CheckRow>
          </div>
        )}

        <Button
          full
          disabled={!(kg > 0) || !confirmed}
          onClick={next}
          className="!min-h-14"
        >
          {t('Confirm and take photo')}
        </Button>
      </Card>

      <InfoNote>
        {t('Manual entry only in Phase 1. The weight must be above 0. Unusual values raise an anomaly flag.')}
      </InfoNote>
    </div>
  )
}

export default EnterWeight
