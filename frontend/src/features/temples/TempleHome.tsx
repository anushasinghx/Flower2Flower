import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import RoleLogin from '../../components/Layout/RoleLogin'
import Icon from '../../components/ui/Icon'
import {
  Button,
  ButtonLink,
  Card,
  Field,
  InfoNote,
  Pill,
  StatusList,
  TextInput,
} from '../../components/ui/kit'
import { TempleSteps } from './shared'
import { useMyTemple } from './useMyTemple'
import { useStore, useT } from '../../store/appStore'
import { isToday, setTempleTimings } from '../../store/fieldActions'
import { DEMO_TEMPLE_MOBILE } from '../../services/mockData'

const TempleHome = () => {
  const { state, run, toast } = useStore()
  const t = useT()
  const temple = useMyTemple()
  const [timings, setTimings] = useState(
    temple && temple.timings !== 'Not set yet' ? temple.timings : '',
  )

  if (state.session !== 'templeAdmin') {
    return (
      <RoleLogin
        title={t('Temple admin login')}
        role="templeAdmin"
        isAllowed={() => true}
        notAllowedText=""
        demoNote={t('Demo: use {mobile} with OTP 123456. The contact person of a temple signs in here.', {
          mobile: DEMO_TEMPLE_MOBILE,
        })}
      />
    )
  }

  if (!temple) return <Navigate to="/temple/register" replace />
  if (temple.status === 'draft') return <Navigate to="/temple/documents" replace />

  const verified = temple.status === 'verified'
  const needsChanges = temple.status === 'needsChanges'
  const deposits = state.deposits.filter((deposit) => deposit.templeId === temple.id)
  const todayKg = deposits
    .filter((deposit) => isToday(deposit.at) && deposit.status !== 'rejected')
    .reduce((sum, deposit) => sum + deposit.kg, 0)

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      {!verified && <TempleSteps current={2} />}
      <h1 className="font-display text-3xl leading-tight md:text-4xl">
        {temple.name}
      </h1>

      <Card className="flex flex-col items-center gap-3 py-7 text-center">
        <span
          className={`flex h-20 w-20 items-center justify-center rounded-full border-2 ${
            verified
              ? 'border-tulsi text-tulsi'
              : needsChanges
                ? 'border-sindoor text-sindoor'
                : 'border-marigold text-marigold'
          }`}
        >
          <Icon name="badge" size={36} />
        </span>
        <h2 className="text-2xl font-bold">
          {verified
            ? t('Verified temple')
            : needsChanges
              ? t('Changes needed')
              : t('Verification in review')}
        </h2>
        {verified ? (
          <Pill tone="green">{t(temple.badge || 'Verified')}</Pill>
        ) : (
          <p className="text-muted">
            {t('Submitted {date} · usually 2 to 3 working days', {
              date: temple.submitted ?? '',
            })}
          </p>
        )}
      </Card>

      {needsChanges && (
        <Card className="flex flex-col gap-3">
          <p className="font-semibold">{t('What the admin asked for')}</p>
          <p className="rounded-2xl border border-sindoor/50 p-3 text-sindoor">
            {t(temple.note)}
          </p>
          <ButtonLink to="/temple/documents" full>
            {t('Upload again')}
          </ButtonLink>
          <ButtonLink to="/temple/register" variant="secondary" full>
            {t('Edit details')}
          </ButtonLink>
        </Card>
      )}

      {!verified && (
        <Card>
          <StatusList
            current={2}
            failed={needsChanges}
            steps={[
              t('Details submitted'),
              t('Documents uploaded'),
              t('Admin review'),
              t('Verified and badge issued'),
            ]}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill>
              {t(temple.type === 'registered' ? 'Registered' : 'Unregistered')}
            </Pill>
            <Pill tone={needsChanges ? 'warning' : 'marigold'}>
              {needsChanges ? t('Needs changes') : t('Pending')}
            </Pill>
          </div>
        </Card>
      )}

      {verified && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <p className="text-sm text-muted">{t('Deposits today')}</p>
              <p className="font-display text-4xl leading-tight">
                {deposits.filter((deposit) => isToday(deposit.at)).length}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-muted">{t('Collected today')}</p>
              <p className="font-display text-4xl leading-tight text-tulsi">
                {Math.round(todayKg * 100) / 100} kg
              </p>
            </Card>
          </div>

          <ButtonLink to="/temple/history" variant="secondary" icon="list" full>
            {t('Deposit history')}
          </ButtonLink>

          <Card className="flex flex-col gap-3">
            <p className="font-semibold">{t('Temple profile')}</p>
            <p className="text-muted">{temple.address}</p>
            <p className="text-muted">
              {t('Contact')}: {temple.contact}
            </p>
            <Field label={t('Counter timings')}>
              {(id) => (
                <TextInput
                  id={id}
                  value={timings}
                  placeholder="7:00 am to 11:00 am"
                  onChange={(event) => setTimings(event.target.value)}
                />
              )}
            </Field>
            <Button
              variant="secondary"
              disabled={!timings.trim()}
              onClick={() => {
                run((current) => setTempleTimings(current, timings.trim()))
                toast(t('Counter timings saved.'))
              }}
            >
              {t('Save timings')}
            </Button>
          </Card>
        </>
      )}

      <InfoNote>
        {t('Verified temples appear in the temple list for devotees and as pickup points at checkout.')}
      </InfoNote>
    </div>
  )
}

export default TempleHome
