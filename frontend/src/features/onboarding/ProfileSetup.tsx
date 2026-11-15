import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import {
  Button,
  Card,
  CheckRow,
  Field,
  Sheet,
  Steps,
  TextInput,
} from '../../components/ui/kit'
import { useOnboardingSteps } from './steps'
import { useStore, useT } from '../../store/appStore'
import { saveProfile } from '../../store/actions'

const yearsSince = (date: string) => {
  const birth = new Date(date)
  const now = new Date()
  const hadBirthday =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate())

  return now.getFullYear() - birth.getFullYear() - (hadBirthday ? 0 : 1)
}

const consentCopy = {
  rules:
    'Your offerings are weighed and photographed at the counter. Points follow the published rules. Corrections appear as new entries.',
  data: 'Your mobile number and KYC documents are stored encrypted and reviewed by an admin. You can view or withdraw consent from your profile.',
}

const ProfileSetup = () => {
  const { state, run } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const steps = useOnboardingSteps()
  const [name, setName] = useState(state.devotee.name)
  const [dob, setDob] = useState(state.devotee.dob)
  const [address, setAddress] = useState(state.devotee.address)
  const [rulesConsent, setRulesConsent] = useState(false)
  const [dataConsent, setDataConsent] = useState(false)
  const [reading, setReading] = useState<'rules' | 'data' | null>(null)
  const [underage, setUnderage] = useState(false)
  const [tried, setTried] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTried(true)

    if (!name.trim() || !dob || !address.trim()) return
    if (!rulesConsent || !dataConsent) return
    if (yearsSince(dob) < 18) {
      setUnderage(true)
      return
    }

    run((current) => saveProfile(current, { name: name.trim(), dob, address }))
    navigate('/onboarding/kyc')
  }

  if (underage) {
    return (
      <Card className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 text-center md:p-8">
        <h1 className="font-display text-3xl">
          {t('You must be 18+ to register.')}
        </h1>
        <p className="text-muted">
          {t('Flower2Flower accounts are for adults. A parent or guardian can register instead.')}
        </p>
        <Button variant="secondary" onClick={() => setUnderage(false)}>
          {t('Check my date of birth')}
        </Button>
      </Card>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <Steps steps={steps} current={2} />
      <ScreenHeader title={t('Your profile')} />

      <form onSubmit={handleSubmit}>
        <Card className="flex flex-col gap-4 md:p-7">
          <Field
            label={t('Full name')}
            error={tried && !name.trim() ? t('Enter your name.') : ''}
          >
            {(id) => (
              <TextInput
                id={id}
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('As on ID')}
              />
            )}
          </Field>
          <Field
            label={t('Date of birth')}
            error={tried && !dob ? t('Enter your date of birth.') : ''}
          >
            {(id) => (
              <TextInput
                id={id}
                type="date"
                value={dob}
                onChange={(event) => setDob(event.target.value)}
              />
            )}
          </Field>
          <Field
            label={t('Address or area')}
            error={tried && !address.trim() ? t('Enter your area.') : ''}
          >
            {(id) => (
              <TextInput
                id={id}
                autoComplete="street-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder={t('Locality, city, PIN')}
              />
            )}
          </Field>

          <fieldset className="flex flex-col gap-2 border-t border-line pt-4">
            <legend className="text-sm font-medium text-muted">
              {t('Consent (each is logged with time and version)')}
            </legend>
            <CheckRow checked={rulesConsent} onChange={setRulesConsent}>
              {t('I consent to nirmalya deposit and points rules.')}{' '}
              <button
                type="button"
                onClick={() => setReading('rules')}
                className="font-medium text-marigold underline underline-offset-4"
              >
                {t('Read')}
              </button>
            </CheckRow>
            <CheckRow checked={dataConsent} onChange={setDataConsent}>
              {t('I consent to my data and KYC being processed.')}{' '}
              <button
                type="button"
                onClick={() => setReading('data')}
                className="font-medium text-marigold underline underline-offset-4"
              >
                {t('Read')}
              </button>
            </CheckRow>
            {tried && (!rulesConsent || !dataConsent) && (
              <p role="alert" className="text-sm text-sindoor">
                {t('Required consents must be ticked to continue.')}
              </p>
            )}
          </fieldset>

          <Button type="submit" full>
            {t('Save and continue')}
          </Button>
        </Card>
      </form>

      <Sheet
        open={reading !== null}
        title={t('Consent details')}
        onClose={() => setReading(null)}
      >
        <p>{reading ? t(consentCopy[reading]) : ''}</p>
      </Sheet>
    </div>
  )
}

export default ProfileSetup
