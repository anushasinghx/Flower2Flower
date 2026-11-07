import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Card, Field, InfoNote, TextArea, TextInput } from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'

type Kind = 'privacy' | 'terms' | 'contact'

const content: Record<Exclude<Kind, 'contact'>, { title: string; points: string[] }> = {
  privacy: {
    title: 'Privacy Notice',
    points: [
      'We collect your mobile number, name, date of birth, area and KYC documents to run your account.',
      'Mobile numbers and KYC data are stored encrypted. Operators and temple staff only see masked numbers.',
      'Each consent you give is logged with the time and version. You can view or withdraw it from your profile.',
      'Deposit photos are kept as proof of purity with the time, operator and deposit ID.',
      'Data exports are limited to admins and every export is written to the audit log.',
    ],
  },
  terms: {
    title: 'Terms',
    points: [
      'Accounts are for adults 18 and above.',
      'Every 100 g of eligible nirmalya earns 10 points. Rules can change for new deposits only.',
      'Levels follow lifetime points. Using points never lowers your level.',
      'Points can be used only after your KYC is verified. Held points cannot be used until an admin reviews them.',
      'Offerings with plastic, foil, thread or food waste are returned without points.',
      'Checkout in Phase 1 is a mock payment. No real money is charged.',
    ],
  },
}

const InfoPage = ({ kind }: { kind: Kind }) => {
  const { toast } = useStore()
  const t = useT()
  const [params] = useSearchParams()
  const feedback = params.get('topic') === 'feedback'
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')

  if (kind === 'contact') {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-12 md:px-8">
        <h1 className="font-display text-4xl">
          {feedback ? t('Send feedback') : t('Contact')}
        </h1>
        <Card className="flex flex-col gap-2">
          <p className="font-semibold">Pushp Vatika · Flower2Flower</p>
          <p className="text-muted">{t('[Office address]')}</p>
          <p className="text-muted">{t('[Phone] · [Email]')}</p>
        </Card>
        <Card className="flex flex-col gap-4">
          <Field label={t('Name')}>
            {(id) => (
              <TextInput id={id} value={name} onChange={(event) => setName(event.target.value)} />
            )}
          </Field>
          <Field label={feedback ? t('What happened?') : t('Message')}>
            {(id) => (
              <TextArea
                id={id}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            )}
          </Field>
          <Button
            full
            disabled={!message.trim()}
            onClick={() => {
              setName('')
              setMessage('')
              toast(t('Thank you. Your message was sent.'))
            }}
          >
            {t('Send')}
          </Button>
        </Card>
        <InfoNote>{t('Contact details are placeholders until the final details are confirmed.')}</InfoNote>
      </div>
    )
  }

  const page = content[kind]

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-12 md:px-8">
      <h1 className="font-display text-4xl">{t(page.title)}</h1>
      <Card>
        <ul className="flex list-disc flex-col gap-3 pl-5">
          {page.points.map((point) => (
            <li key={point}>{t(point)}</li>
          ))}
        </ul>
      </Card>
      <InfoNote>{t('Draft summary for the pilot. The final legal text will replace this page.')}</InfoNote>
    </div>
  )
}

export default InfoPage
