import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import {
  Button,
  Card,
  CheckRow,
  Field,
  InfoNote,
  Steps,
} from '../../components/ui/kit'
import { useOnboardingSteps } from './steps'
import { useStore, useT } from '../../store/appStore'
import { setMobile } from '../../store/actions'
import {
  DEMO_ADMIN_MOBILE,
  DEMO_DEVOTEE_MOBILE,
  DEMO_OTP,
} from '../../services/mockData'

const MobileNumber = () => {
  const { run } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const steps = useOnboardingSteps()
  const [mobile, setMobileValue] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError(t('Enter a valid 10 digit number starting with 6, 7, 8 or 9.'))
      return
    }
    if (!agreed) {
      setError(t('Please agree to the Terms and Privacy Notice.'))
      return
    }

    run((state) => setMobile(state, mobile))
    navigate('/verify')
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <Steps steps={steps} current={0} />
      <ScreenHeader title={t('Enter your mobile number')} backTo="/welcome" />

      <form onSubmit={handleSubmit}>
        <Card className="flex flex-col gap-4 md:p-7">
          <p className="text-muted">{t('We will send a 6 digit OTP by SMS.')}</p>
          <Field label={t('Mobile number')} error={error}>
            {(id) => (
              <div className="flex min-h-11 items-center rounded-2xl border border-line bg-night focus-within:border-marigold">
                <span className="border-r border-line px-4 text-muted">+91</span>
                <input
                  id={id}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={mobile}
                  onChange={(event) => {
                    setError('')
                    setMobileValue(event.target.value.replace(/\D/g, ''))
                  }}
                  placeholder={t('10 digit mobile number')}
                  className="min-h-11 w-full min-w-0 flex-1 rounded-r-2xl bg-transparent px-4 text-ink outline-none"
                />
              </div>
            )}
          </Field>
          <CheckRow
            checked={agreed}
            onChange={(value) => {
              setError('')
              setAgreed(value)
            }}
          >
            {t('I agree to the Terms and Privacy Notice.')}
          </CheckRow>
          <Button type="submit" full>
            {t('Send OTP')}
          </Button>
        </Card>
      </form>

      <Card>
        <p className="font-semibold">{t('No smartphone?')}</p>
        <p className="mt-1 text-muted">
          {t('Ask the temple operator to register you at the counter.')}
        </p>
      </Card>

      <InfoNote>
        {t(
          'Demo login: {devotee} opens Sunita, {admin} opens the Admin console, any other number starts a new signup. OTP is {otp}.',
          {
            devotee: DEMO_DEVOTEE_MOBILE,
            admin: DEMO_ADMIN_MOBILE,
            otp: DEMO_OTP,
          },
        )}
      </InfoNote>
    </div>
  )
}

export default MobileNumber
