import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import { Button, Card, Field, InfoNote, Pill, TextInput } from '../../components/ui/kit'
import { UploadTile } from '../onboarding/KycUpload'
import { TempleSteps } from './shared'
import { useMyTemple } from './useMyTemple'
import { useStore, useT } from '../../store/appStore'
import { submitTempleDocs } from '../../store/fieldActions'

const TempleDocuments = () => {
  const { run, toast } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const temple = useMyTemple()
  const [photo, setPhoto] = useState('')
  const [deity, setDeity] = useState(temple?.deity ?? '')
  const [files, setFiles] = useState<Record<string, string>>({})
  const [tried, setTried] = useState(false)

  if (!temple) return <Navigate to="/temple/register" replace />

  const required =
    temple.type === 'registered'
      ? ['Registration certificate', 'Admin ID proof']
      : ['Committee letter', 'Admin ID proof']
  const missing = required.filter((doc) => !files[doc])

  const submit = () => {
    setTried(true)
    if (missing.length) return
    run((current) => submitTempleDocs(current, deity.trim(), required))
    toast(t('Sent for verification.'))
    navigate('/temple')
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <TempleSteps current={1} />
      <ScreenHeader title={t('Profile and documents')} backTo="/temple/register" />

      <Card className="flex flex-col gap-4">
        <div className="grid grid-cols-[7rem_1fr] gap-3">
          <UploadTile label={t('Logo or photo')} fileName={photo} onPick={setPhoto} />
          <div className="flex flex-col gap-3">
            <p className="text-lg font-bold leading-snug">{temple.name}</p>
            <Field label={t('Deity or tradition')}>
              {(id) => (
                <TextInput id={id} value={deity} onChange={(event) => setDeity(event.target.value)} />
              )}
            </Field>
          </div>
        </div>
      </Card>

      <h2 className="text-lg font-bold">{t('KYC documents (manual review)')}</h2>
      {required.map((doc) => (
        <Card key={doc} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">{t(doc)}</p>
            <Pill tone={files[doc] ? 'green' : 'neutral'}>
              {files[doc] ? t('Added') : t('Required')}
            </Pill>
          </div>
          <UploadTile
            label={t('Upload PDF or photo')}
            fileName={files[doc] ?? ''}
            onPick={(name) => setFiles({ ...files, [doc]: name })}
          />
        </Card>
      ))}
      {tried && missing.length > 0 && (
        <p role="alert" className="text-sm text-sindoor">
          {t('Add every required document.')}
        </p>
      )}

      <Button full onClick={submit} className="!min-h-14">
        {t('Submit for verification')}
      </Button>
      <InfoNote>
        {t('Only the documents for your temple type are shown. Files are stored encrypted.')}
      </InfoNote>
    </div>
  )
}

export default TempleDocuments
