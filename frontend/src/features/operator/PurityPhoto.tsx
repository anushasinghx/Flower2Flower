import { useNavigate } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import Icon from '../../components/ui/Icon'
import { Button, Card, CheckRow, InfoNote, Pill } from '../../components/ui/kit'
import { DepositSteps, NeedsDraft, PhotoPreview } from './common'
import { formatKg, purityChecks, useDraft } from './helpers'
import { useStore, useT } from '../../store/appStore'
import { updateDraft } from '../../store/fieldActions'

const PurityPhoto = () => {
  const { run } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const { draft } = useDraft()

  if (!draft) return <NeedsDraft />

  const setPhoto = (photo: string) =>
    run((current) => updateDraft(current, { photo }))

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <DepositSteps current={3} />
      <ScreenHeader
        title={t('Proof of Purity')}
        backTo="/operator/weight"
        right={
          <Pill>
            {t(draft.waste)} · {formatKg(draft.kg)}
          </Pill>
        }
      />

      <label className="relative block aspect-[4/3] cursor-pointer overflow-hidden rounded-3xl border border-line">
        {draft.photo ? (
          <PhotoPreview photo={draft.photo} />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-3 bg-raised p-6 text-center text-muted">
            <Icon name="camera" size={36} />
            <span className="font-medium">{t('Tap to open the camera')}</span>
            <span className="text-sm">{t('Frame the full deposit')}</span>
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label={t('Take photo')}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) setPhoto(URL.createObjectURL(file))
          }}
        />
      </label>
      {!draft.photo && (
        <Button variant="ghost" onClick={() => setPhoto('sample')}>
          {t('Use a sample photo (demo)')}
        </Button>
      )}

      <Card>
        <fieldset>
          <legend className="mb-1 font-semibold">{t('Checklist')}</legend>
          {purityChecks.map((check) => (
            <CheckRow
              key={check}
              checked={draft.checks.includes(check)}
              onChange={(value) =>
                run((current) =>
                  updateDraft(current, {
                    checks: value
                      ? [...draft.checks, check]
                      : draft.checks.filter((item) => item !== check),
                  }),
                )
              }
            >
              {t(check)}
            </CheckRow>
          ))}
        </fieldset>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          full
          disabled={!draft.photo}
          onClick={() => setPhoto('')}
        >
          {t('Retake')}
        </Button>
        <Button
          full
          disabled={!draft.photo}
          onClick={() => navigate('/operator/review')}
        >
          {t('Use photo')}
        </Button>
      </div>

      <InfoNote>
        {t('The photo is stored with the time, operator and deposit ID. Offline, it stays on the device and uploads on sync.')}
      </InfoNote>
    </div>
  )
}

export default PurityPhoto
