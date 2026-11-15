import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import Icon from '../../components/ui/Icon'
import {
  Button,
  ButtonLink,
  Card,
  Field,
  InfoNote,
  Pill,
  Sheet,
} from '../../components/ui/kit'
import { DepositSteps } from './common'
import { useStore, useT } from '../../store/appStore'
import { findDevotee, startDraft } from '../../store/fieldActions'
import type { DevoteeSummary } from '../../store/types'
import { maskMobile } from '../../utils/points'
import { DEMO_DEVOTEE_MOBILE } from '../../services/mockData'

const FindDevotee = () => {
  const { state, run } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const [mobile, setMobile] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<DevoteeSummary | null | undefined>()
  const [scanning, setScanning] = useState(false)

  const lookUp = (number: string) => {
    if (!/^[6-9]\d{9}$/.test(number)) {
      setError(t('Enter a valid 10 digit number starting with 6, 7, 8 or 9.'))
      setResult(undefined)
      return
    }
    setError('')
    setResult(findDevotee(state, number))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    lookUp(mobile)
  }

  const society = result
    ? state.societies.find((item) => item.id === result.societyId)
    : undefined

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <DepositSteps current={0} />
      <ScreenHeader title={t('Find devotee')} backTo="/operator" />

      <form onSubmit={handleSubmit}>
        <Card className="flex flex-col gap-4">
          <Field label={t('Mobile number')} error={error}>
            {(id) => (
              <div className="flex min-h-11 items-center rounded-2xl border border-line bg-night focus-within:border-marigold">
                <span className="border-r border-line px-4 text-muted">+91</span>
                <input
                  id={id}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={(event) => {
                    setResult(undefined)
                    setMobile(event.target.value.replace(/\D/g, ''))
                  }}
                  placeholder={t('10 digit mobile number')}
                  className="min-h-11 w-full min-w-0 flex-1 rounded-r-2xl bg-transparent px-4 text-ink outline-none"
                />
              </div>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Button type="submit" full icon="search">
              {t('Look up')}
            </Button>
            <Button
              variant="secondary"
              full
              icon="qr"
              onClick={() => setScanning(true)}
            >
              {t('Scan QR')}
            </Button>
          </div>
        </Card>
      </form>

      {result && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xl font-bold">{result.name}</p>
              <p className="text-muted">+91 {maskMobile(result.mobile)}</p>
            </div>
            <Pill tone="marigold">
              {t('Level {number}', { number: result.level })}
            </Pill>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone={result.kyc === 'verified' ? 'green' : 'neutral'}>
              {result.kyc === 'verified' ? t('KYC verified') : t('KYC pending')}
            </Pill>
            {society && <Pill>{society.name}</Pill>}
            {result.flagged && (
              <Pill tone="warning">{t('Flagged for review')}</Pill>
            )}
          </div>
          {result.flagged && (
            <p className="text-sm text-sindoor">
              {t('This devotee has an open alert. Points may be held until an admin reviews it.')}
            </p>
          )}
          <Button
            full
            onClick={() => {
              run((current) => startDraft(current, result.mobile))
              navigate('/operator/waste')
            }}
          >
            {t('Continue to deposit')}
          </Button>
        </Card>
      )}

      {result === null && (
        <Card className="flex flex-col gap-3">
          <p className="font-semibold">{t('No account for this number.')}</p>
          <ButtonLink to={`/operator/register?mobile=${mobile}`} full>
            {t('Register devotee (assisted)')}
          </ButtonLink>
        </Card>
      )}

      <InfoNote>
        {t('Operators see masked mobile numbers only. A flagged devotee shows a warning tag.')}
      </InfoNote>

      <Sheet open={scanning} title={t('Scan QR')} onClose={() => setScanning(false)}>
        <div className="flex flex-col gap-4">
          <div className="flex aspect-square items-center justify-center rounded-3xl border border-dashed border-line bg-raised p-6 text-center text-muted">
            <span className="flex flex-col items-center gap-3">
              <Icon name="camera" size={32} />
              {t("Point the camera at the devotee's QR code")}
            </span>
          </div>
          <Button
            full
            onClick={() => {
              setScanning(false)
              setMobile(DEMO_DEVOTEE_MOBILE)
              lookUp(DEMO_DEVOTEE_MOBILE)
            }}
          >
            {t('Use demo QR (Sunita)')}
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

export default FindDevotee
