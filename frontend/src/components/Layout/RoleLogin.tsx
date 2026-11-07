import { useState, type FormEvent } from 'react'
import { Button, Card, Field, InfoNote, Steps } from '../ui/kit'
import { useStore, useT } from '../../store/appStore'
import type { Session } from '../../store/types'
import { DEMO_OTP } from '../../services/mockData'

type RoleLoginProps = {
  title: string
  role: Exclude<Session, null>
  steps?: string[]
  isAllowed: (mobile: string) => boolean
  notAllowedText: string
  demoNote: string
}

const RoleLogin = ({
  title,
  role,
  steps,
  isAllowed,
  notAllowedText,
  demoNote,
}: RoleLoginProps) => {
  const { run } = useStore()
  const t = useT()
  const [mobile, setMobile] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const sendOtp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError(t('Enter a valid 10 digit number starting with 6, 7, 8 or 9.'))
      return
    }
    if (!isAllowed(mobile)) {
      setError(notAllowedText)
      return
    }
    setError('')
    setSent(true)
  }

  const verify = () => {
    if (code !== DEMO_OTP) {
      setError(t('Incorrect code. Try again.'))
      setCode('')
      return
    }
    run((state) => ({ ...state, session: role, pendingMobile: mobile }))
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      {steps && <Steps steps={steps} current={0} />}
      <h1 className="font-display text-3xl leading-tight md:text-4xl">{title}</h1>

      <Card className="flex flex-col gap-4 md:p-7">
        <form onSubmit={sendOtp} className="flex flex-col gap-4">
          <Field label={t('Registered mobile number')} error={sent ? '' : error}>
            {(id) => (
              <div className="flex min-h-11 items-center rounded-2xl border border-line bg-night focus-within:border-marigold">
                <span className="border-r border-line px-4 text-muted">+91</span>
                <input
                  id={id}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  disabled={sent}
                  onChange={(event) => {
                    setError('')
                    setMobile(event.target.value.replace(/\D/g, ''))
                  }}
                  placeholder={t('10 digit mobile number')}
                  className="min-h-11 w-full min-w-0 flex-1 rounded-r-2xl bg-transparent px-4 text-ink outline-none"
                />
              </div>
            )}
          </Field>
          {!sent && (
            <Button type="submit" full>
              {t('Send OTP')}
            </Button>
          )}
        </form>

        {sent && (
          <>
            <Field label={t('Enter the 6 digit code')} error={error}>
              {(id) => (
                <input
                  id={id}
                  inputMode="numeric"
                  autoComplete="one-time-code"
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
            <Button full disabled={code.length < 6} onClick={verify}>
              {t('Verify and sign in')}
            </Button>
            <Button
              variant="ghost"
              full
              onClick={() => {
                setSent(false)
                setCode('')
              }}
            >
              {t('Change number')}
            </Button>
          </>
        )}
      </Card>

      <InfoNote>{demoNote}</InfoNote>
    </div>
  )
}

export default RoleLogin
