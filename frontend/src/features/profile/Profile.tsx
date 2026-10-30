import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import Icon, { type IconName } from '../../components/ui/Icon'
import {
  Button,
  Card,
  Field,
  Pill,
  Sheet,
  TextInput,
  Toggle,
} from '../../components/ui/kit'
import {
  LanguagePicker,
  TextSizePicker,
} from '../onboarding/Welcome'
import { useStore, useT } from '../../store/appStore'
import { logout, resetDemo, saveProfile, setConsent } from '../../store/actions'
import { levelInfo, maskMobile } from '../../utils/points'

const rowClass =
  'flex min-h-14 w-full items-center gap-3 border-b border-line px-1 py-3 text-left last:border-b-0 hover:text-marigold'

const LinkRow = ({
  to,
  icon,
  label,
}: {
  to: string
  icon: IconName
  label: string
}) => (
  <Link to={to} className={rowClass}>
    <Icon name={icon} className="text-muted" />
    <span className="flex-1 font-medium">{label}</span>
    <Icon name="next" size={18} className="text-muted" />
  </Link>
)

const Profile = () => {
  const { state, run, toast } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const { devotee } = state
  const level = levelInfo(state)
  const [editing, setEditing] = useState(false)
  const [consentsOpen, setConsentsOpen] = useState(false)
  const [name, setName] = useState(devotee.name)
  const [address, setAddress] = useState(devotee.address)

  const saveEdit = () => {
    run((current) =>
      saveProfile(current, {
        name: name.trim(),
        address: address.trim(),
        dob: current.devotee.dob,
      }),
    )
    setEditing(false)
    toast(t('Profile saved.'))
  }

  return (
    <div>
      <ScreenHeader title={t('Profile')} />

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4">
          <Card className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-raised font-display text-3xl text-marigold">
              {(devotee.name || 'D').charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-bold">
                {devotee.name || t('Devotee')}
              </p>
              <p className="text-muted">
                +91 {maskMobile(devotee.mobile)} ·{' '}
                {t('Level {number}', { number: level.number })}
              </p>
            </div>
            <Pill tone={devotee.kyc === 'verified' ? 'green' : 'warning'}>
              {devotee.kyc === 'verified'
                ? t('KYC verified')
                : devotee.kyc === 'inReview'
                  ? t('KYC in review')
                  : devotee.kyc === 'rejected'
                    ? t('KYC rejected')
                    : t('KYC pending')}
            </Pill>
          </Card>

          <Card className="!py-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={rowClass}
            >
              <Icon name="edit" className="text-muted" />
              <span className="flex-1 font-medium">{t('Edit profile')}</span>
              <Icon name="next" size={18} className="text-muted" />
            </button>
            <LinkRow
              to="/app/kyc"
              icon="badge"
              label={t('KYC status and documents')}
            />
            <LinkRow
              to="/app/society"
              icon="users"
              label={t('My society pool')}
            />
            <LinkRow to="/app/orders" icon="box" label={t('My orders')} />
            <button
              type="button"
              onClick={() => setConsentsOpen(true)}
              className={rowClass}
            >
              <Icon name="file" className="text-muted" />
              <span className="flex-1 font-medium">
                {t('Consents (view or withdraw)')}
              </span>
              <Icon name="next" size={18} className="text-muted" />
            </button>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4">
            <h2 className="text-lg font-bold">
              {t('Language and accessibility')}
            </h2>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted">{t('Language')}</p>
              <LanguagePicker />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted">{t('Text size')}</p>
              <TextSizePicker />
            </div>
          </Card>

          <Button
            variant="danger"
            full
            icon="logout"
            onClick={() => {
              run(logout)
              navigate('/welcome')
            }}
          >
            {t('Log out')}
          </Button>
          <Button
            variant="ghost"
            full
            icon="reset"
            onClick={() => {
              run(resetDemo)
              toast(t('Demo data was reset.'))
            }}
          >
            {t('Reset demo data')}
          </Button>
        </div>
      </div>

      <Sheet
        open={editing}
        title={t('Edit profile')}
        onClose={() => setEditing(false)}
        footer={
          <Button full disabled={!name.trim()} onClick={saveEdit}>
            {t('Save')}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label={t('Full name')}>
            {(id) => (
              <TextInput
                id={id}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            )}
          </Field>
          <Field label={t('Address or area')}>
            {(id) => (
              <TextInput
                id={id}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
            )}
          </Field>
        </div>
      </Sheet>

      <Sheet
        open={consentsOpen}
        title={t('Consents')}
        onClose={() => setConsentsOpen(false)}
      >
        <div className="flex flex-col gap-3">
          {devotee.consents.length === 0 && (
            <p className="text-muted">{t('No consents logged yet.')}</p>
          )}
          {devotee.consents.map((consent) => (
            <div
              key={consent.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line p-4"
            >
              <div className="min-w-0">
                <p className="font-medium">{t(consent.label)}</p>
                <p className="text-sm text-muted">
                  {consent.active ? t('Given') : t('Withdrawn')} · {consent.at} ·{' '}
                  {consent.version}
                </p>
              </div>
              <Toggle
                checked={consent.active}
                label={t(consent.label)}
                onChange={(value) =>
                  run((current) => setConsent(current, consent.id, value))
                }
              />
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  )
}

export default Profile
