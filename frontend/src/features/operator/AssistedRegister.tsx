import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import {
  Button,
  Card,
  CheckRow,
  Field,
  InfoNote,
  Select,
  TextInput,
} from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'
import { registerAssisted } from '../../store/fieldActions'
import { DEMO_OTP } from '../../services/mockData'

const ageFrom = (date: string) => {
  const birth = new Date(date)
  const now = new Date()
  const hadBirthday =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate())
  return now.getFullYear() - birth.getFullYear() - (hadBirthday ? 0 : 1)
}

const AssistedRegister = () => {
  const { run, toast } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mobile, setMobile] = useState(params.get('mobile') ?? '')
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [language, setLanguage] = useState('hi')
  const [rulesConsent, setRulesConsent] = useState(false)
  const [kycConsent, setKycConsent] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const validate = () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) return t('Enter a valid mobile number.')
    if (!name.trim()) return t('Enter the name as on ID.')
    if (!dob) return t('Enter the date of birth.')
    if (ageFrom(dob) < 18) return t('The devotee must be 18 or older.')
    if (!rulesConsent || !kycConsent) {
      return t('Both consents are needed to register.')
    }
    return ''
  }

  const sendOtp = () => {
    const problem = validate()
    setError(problem)
    if (!problem) setOtpSent(true)
  }

  const confirm = () => {
    if (code !== DEMO_OTP) {
      setError(t('Incorrect code. Try again.'))
      return
    }
    run((current) => registerAssisted(current, { mobile, name: name.trim() }))
    toast(t('{name} is registered. Continue with the deposit.', { name }))
    navigate('/operator/waste')
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <ScreenHeader title={t('Register devotee')} backTo="/operator/find" />

      <Card className="flex flex-col gap-4">
        <Field label={t('Mobile number')}>
          {(id) => (
            <TextInput
              id={id}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              disabled={otpSent}
              value={mobile}
              onChange={(event) => setMobile(event.target.value.replace(/\D/g, ''))}
            />
          )}
        </Field>
        <Field label={t('Full name')}>
          {(id) => (
            <TextInput
              id={id}
              disabled={otpSent}
              value={name}
              placeholder={t('As on ID')}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Date of birth')}>
            {(id) => (
              <TextInput
                id={id}
                type="date"
                disabled={otpSent}
                value={dob}
                onChange={(event) => setDob(event.target.value)}
              />
            )}
          </Field>
          <Field label={t('Language')}>
            {(id) => (
              <Select
                id={id}
                disabled={otpSent}
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                <option value="hi">हिन्दी</option>
                <option value="en">English</option>
              </Select>
            )}
          </Field>
        </div>
        <p className="text-sm text-muted">
          {t('The devotee confirms they are 18+. This is checked against the date of birth.')}
        </p>

        <fieldset disabled={otpSent} className="border-t border-line pt-3">
          <legend className="text-sm font-medium text-muted">
            {t('Consent (read aloud or shown to the devotee)')}
          </legend>
          <CheckRow checked={rulesConsent} onChange={setRulesConsent}>
            {t('Data processing and deposit rules')}
          </CheckRow>
          <CheckRow checked={kycConsent} onChange={setKycConsent}>
            {t('KYC processing')}
          </CheckRow>
        </fieldset>

        {otpSent && (
          <Field label={t("Code from the devotee's phone")}>
            {(id) => (
              <input
                id={id}
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) => {
                  setError('')
                  setCode(event.target.value.replace(/\D/g, ''))
                }}
                className="min-h-14 w-full rounded-2xl border border-line bg-night px-4 text-center text-2xl font-semibold tracking-[0.5em] text-ink outline-none focus:border-marigold"
              />
            )}
          </Field>
        )}

        {error && (
          <p role="alert" className="text-sm text-sindoor">
            {error}
          </p>
        )}

        {otpSent ? (
          <Button full disabled={code.length < 6} onClick={confirm}>
            {t('Confirm and register')}
          </Button>
        ) : (
          <Button full onClick={sendOtp}>
            {t('Send OTP to devotee')}
          </Button>
        )}
      </Card>

      <InfoNote>
        {t('Assisted registrations are tagged with the operator name in the consent log and audit log. The devotee completes KYC later in the app.')}
      </InfoNote>
    </div>
  )
}

export default AssistedRegister
