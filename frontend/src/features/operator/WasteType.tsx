import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import { Button, InfoNote, Pill, Sheet } from '../../components/ui/kit'
import { DepositSteps, NeedsDraft } from './common'
import { useDraft } from './helpers'
import { useStore, useT } from '../../store/appStore'
import { updateDraft } from '../../store/fieldActions'

const OTHER = 'Other'

const WasteType = () => {
  const { state, run } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const { draft, devotee } = useDraft()
  const [otherOpen, setOtherOpen] = useState(false)
  const [chargeOpen, setChargeOpen] = useState(false)

  if (!draft) return <NeedsDraft />

  const rules = state.rules.earning.filter((rule) => rule.active)
  const choose = (waste: string) =>
    run((current) => updateDraft(current, { waste, chargeCollected: false }))

  const next = () => {
    const rule = rules.find((item) => item.waste === draft.waste)
    if (rule?.charge && !chargeOpen) {
      setChargeOpen(true)
      return
    }
    navigate('/operator/weight')
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <DepositSteps current={1} />
      <ScreenHeader
        title={t('Waste type')}
        backTo="/operator/find"
        right={<Pill>{devotee?.name}</Pill>}
      />

      <div className="grid grid-cols-2 gap-3">
        {rules.map((rule) => (
          <button
            key={rule.id}
            type="button"
            aria-pressed={draft.waste === rule.waste}
            onClick={() => choose(rule.waste)}
            className={`flex min-h-28 flex-col justify-between rounded-3xl bg-surface p-4 text-left transition-colors ${
              draft.waste === rule.waste
                ? 'border-2 border-marigold'
                : 'border border-line hover:border-muted'
            }`}
          >
            <span className="text-lg font-bold">{t(rule.waste)}</span>
            <span className={rule.charge ? 'text-sindoor' : 'text-muted'}>
              {rule.charge
                ? t('Charge ₹{charge} per kg', { charge: rule.charge })
                : t('{points} pts per kg', { points: rule.ptsPerKg })}
            </span>
          </button>
        ))}
        <button
          type="button"
          aria-pressed={draft.waste === OTHER}
          onClick={() => setOtherOpen(true)}
          className={`flex min-h-28 flex-col justify-between rounded-3xl bg-surface p-4 text-left ${
            draft.waste === OTHER
              ? 'border-2 border-sindoor'
              : 'border border-line hover:border-muted'
          }`}
        >
          <span className="text-lg font-bold">{t('Other')}</span>
          <span className="text-muted">{t('Eligible list only')}</span>
        </button>
      </div>

      <Button full disabled={!draft.waste} onClick={next} className="!min-h-14">
        {t('Next: weight')}
      </Button>

      <InfoNote>
        {t('Eligible types are set by the admin. Broken idols need the INR charge collected. Items that are not eligible are rejected.')}
      </InfoNote>

      <Sheet open={otherOpen} title={t('Other items')} onClose={() => setOtherOpen(false)}>
        <div className="flex flex-col gap-4">
          <p>{t('Only these types are accepted:')}</p>
          <ul className="flex flex-wrap gap-2">
            {rules.map((rule) => (
              <li key={rule.id}>
                <Pill tone="green">{t(rule.waste)}</Pill>
              </li>
            ))}
          </ul>
          <p className="text-muted">
            {t('Plastic bags, synthetic thread, foil and food waste are not accepted. Weigh and photograph the item, then reject it.')}
          </p>
          <Button
            variant="danger"
            full
            onClick={() => {
              choose(OTHER)
              setOtherOpen(false)
              navigate('/operator/weight')
            }}
          >
            {t('Continue to reject as not eligible')}
          </Button>
        </div>
      </Sheet>

      <Sheet open={chargeOpen} title={t('Collect INR charge')} onClose={() => setChargeOpen(false)}>
        <div className="flex flex-col gap-4">
          <p>
            {t('Broken idols are accepted for a charge of ₹{charge} per kg. Tell the devotee before weighing.', {
              charge: rules.find((rule) => rule.waste === draft.waste)?.charge ?? 0,
            })}
          </p>
          <p className="text-muted">
            {t('The total is shown after weighing. Confirm payment on the review screen.')}
          </p>
          <Button full onClick={() => navigate('/operator/weight')}>
            {t('Devotee agrees, continue')}
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

export default WasteType
