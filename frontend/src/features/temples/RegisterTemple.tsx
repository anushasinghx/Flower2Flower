import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import Icon from '../../components/ui/Icon'
import {
  Button,
  Card,
  CheckRow,
  Field,
  Segmented,
  TextInput,
} from '../../components/ui/kit'
import { TempleSteps } from './shared'
import { useMyTemple } from './useMyTemple'
import { useStore, useT } from '../../store/appStore'
import { saveTempleDetails } from '../../store/fieldActions'
import type { TempleType } from '../../store/types'

const RegisterTemple = () => {
  const { state, run } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const temple = useMyTemple()
  const [type, setType] = useState<TempleType>(temple?.type ?? 'registered')
  const [name, setName] = useState(temple?.name ?? '')
  const [regNo, setRegNo] = useState(temple?.regNo ?? '')
  const [address, setAddress] = useState(temple?.address ?? '')
  const [pinned, setPinned] = useState(false)
  const [contact, setContact] = useState(temple?.contact ?? '')
  const [mobile, setMobile] = useState(temple?.mobile ?? state.pendingMobile)
  const [authorised, setAuthorised] = useState(Boolean(temple))
  const [tried, setTried] = useState(false)

  const errors = {
    name: !name.trim() ? t('Enter the temple name.') : '',
    regNo:
      type === 'registered' && !regNo.trim()
        ? t('Enter the registration number.')
        : '',
    address: !address.trim() ? t('Enter the address.') : '',
    contact: !contact.trim() ? t('Enter the contact person.') : '',
    mobile: !/^[6-9]\d{9}$/.test(mobile) ? t('Enter a valid mobile number.') : '',
    authorised: !authorised ? t('Please confirm you are authorised.') : '',
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTried(true)
    if (Object.values(errors).some(Boolean)) return

    run((current) =>
      saveTempleDetails(current, {
        type,
        name: name.trim(),
        regNo: type === 'registered' ? regNo.trim() : '',
        address: address.trim(),
        contact: contact.trim(),
        mobile,
      }),
    )
    navigate('/temple/documents')
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <TempleSteps current={0} />
      <ScreenHeader
        title={t('Register your temple')}
        backTo={temple ? '/temple' : undefined}
      />

      <form onSubmit={handleSubmit}>
        <Card className="flex flex-col gap-4 md:p-7">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-muted">{t('Temple type')}</p>
            <Segmented<TempleType>
              label={t('Temple type')}
              value={type}
              onChange={setType}
              options={[
                { value: 'registered', label: t('Registered') },
                { value: 'unregistered', label: t('Unregistered') },
              ]}
            />
            <p className="text-sm text-muted">
              {type === 'registered'
                ? t('Trust or society')
                : t('Community run')}
            </p>
          </div>

          <Field label={t('Temple name')} error={tried ? errors.name : ''}>
            {(id) => (
              <TextInput id={id} value={name} onChange={(event) => setName(event.target.value)} />
            )}
          </Field>
          {type === 'registered' && (
            <Field label={t('Registration number')} error={tried ? errors.regNo : ''}>
              {(id) => (
                <TextInput id={id} value={regNo} onChange={(event) => setRegNo(event.target.value)} />
              )}
            </Field>
          )}
          <Field label={t('Address and location')} error={tried ? errors.address : ''}>
            {(id) => (
              <TextInput
                id={id}
                value={address}
                placeholder={t('Street, area, city, PIN')}
                onChange={(event) => setAddress(event.target.value)}
              />
            )}
          </Field>
          <Button
            variant="secondary"
            icon={pinned ? 'check' : 'temple'}
            onClick={() => setPinned(!pinned)}
          >
            {pinned ? t('Pinned on map') : t('Pin on map (optional)')}
          </Button>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('Contact person')} error={tried ? errors.contact : ''}>
              {(id) => (
                <TextInput id={id} value={contact} onChange={(event) => setContact(event.target.value)} />
              )}
            </Field>
            <Field label={t('Mobile number')} error={tried ? errors.mobile : ''}>
              {(id) => (
                <TextInput
                  id={id}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value.replace(/\D/g, ''))}
                />
              )}
            </Field>
          </div>

          <CheckRow checked={authorised} onChange={setAuthorised}>
            {t('I am authorised to register this temple and accept the collection terms.')}
          </CheckRow>
          {tried && errors.authorised && (
            <p role="alert" className="text-sm text-sindoor">
              {errors.authorised}
            </p>
          )}

          <Button type="submit" full>
            {t('Save and add documents')}
          </Button>
        </Card>
      </form>

      <p className="flex items-start gap-2 text-sm text-muted">
        <Icon name="user" size={18} />
        {t('The contact person logs in with OTP and becomes the temple admin.')}
      </p>
    </div>
  )
}

export default RegisterTemple
