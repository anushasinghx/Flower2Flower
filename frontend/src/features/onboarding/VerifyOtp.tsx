import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import { Button, Card, Steps } from '../../components/ui/kit'
import { useOnboardingSteps } from './steps'
import { useStore, useT } from '../../store/appStore'
import { completeLogin, isReturningMobile } from '../../store/actions'
import { DEMO_ADMIN_MOBILE, DEMO_OTP } from '../../services/mockData'
import { maskMobile } from '../../utils/points'

const MAX_ATTEMPTS = 3

const VerifyOtp = () => {
  const { state, run, toast } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const steps = useOnboardingSteps()
  const [code, setCode] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [seconds, setSeconds] = useState(28)
  const mobile = state.pendingMobile
  const locked = attempts >= MAX_ATTEMPTS

  useEffect(() => {
    if (seconds <= 0) return
    const timer = window.setTimeout(() => setSeconds(seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [seconds])

  if (!mobile) return <Navigate to="/login" replace />

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (code !== DEMO_OTP) {
      setAttempts(attempts + 1)
      setCode('')
      return
    }

    const returning =
      isReturningMobile(mobile) || mobile === state.devotee.mobile
    run(completeLogin)

    if (mobile === DEMO_ADMIN_MOBILE) navigate('/admin')
    else navigate(returning ? '/app' : '/onboarding/profile')
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <Steps steps={steps} current={1} />
      <ScreenHeader title={t('Enter the 6 digit code')} backTo="/login" />

      <form onSubmit={handleSubmit}>
        <Card className="flex flex-col gap-4 md:p-7">
          <p className="text-muted">
            {t('Sent to +91 {number}', { number: maskMobile(mobile) })}{' '}
            <Link
              to="/login"
              className="font-medium text-marigold underline underline-offset-4"
            >
              {t('Change')}
            </Link>
          </p>

          <div className="relative">
            <input
              aria-label={t('Enter the 6 digit code')}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              disabled={locked}
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ''))
              }
              className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
            />
            <div className="grid grid-cols-6 gap-2" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <span
                  key={index}
                  className={`flex aspect-square max-h-16 items-center justify-center rounded-2xl border bg-night text-2xl font-semibold ${
                    index === code.length
                      ? 'border-marigold'
                      : 'border-line'
                  }`}
                >
                  {code[index] ?? ''}
                </span>
              ))}
            </div>
          </div>

          {attempts > 0 && !locked && (
            <p role="alert" className="text-sm text-sindoor">
              {t('Incorrect code. {count} attempts left.', {
                count: MAX_ATTEMPTS - attempts,
              })}
            </p>
          )}
          {locked && (
            <p role="alert" className="text-sm text-sindoor">
              {t('This number is locked for 15 minutes.')}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">
              {seconds > 0
                ? t('Resend in 00:{seconds}', {
                    seconds: String(seconds).padStart(2, '0'),
                  })
                : t('Did not get the code?')}
            </span>
            <button
              type="button"
              disabled={seconds > 0 || locked}
              onClick={() => {
                setSeconds(28)
                toast(t('A new OTP was sent.'))
              }}
              className="min-h-11 font-medium text-marigold disabled:text-muted"
            >
              {t('Resend OTP')}
            </button>
          </div>

          <Button type="submit" full disabled={code.length < 6 || locked}>
            {t('Verify')}
          </Button>
        </Card>
      </form>
    </div>
  )
}

export default VerifyOtp
