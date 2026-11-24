import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import Icon from '../../components/ui/Icon'
import {
  Button,
  ButtonLink,
  Card,
  Field,
  InfoNote,
  Pill,
  Select,
  StatusList,
  Steps,
  TextInput,
} from '../../components/ui/kit'
import { useOnboardingSteps } from './steps'
import { useAction, useStore, useT } from '../../store/appStore'
import { devotee as devoteeApi } from '../../store/remote'

const docTypes = ['Aadhaar', 'Voter ID', 'Driving licence']

export const UploadTile = ({
  label,
  fileName,
  onPick,
}: {
  label: string
  fileName: string
  onPick: (name: string, file: File | null) => void
}) => {
  const t = useT()

  return (
    <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-night p-3 text-center transition-colors hover:border-marigold focus-within:border-marigold">
      <Icon
        name={fileName ? 'check' : 'camera'}
        size={24}
        className={fileName ? 'text-tulsi' : 'text-muted'}
      />
      <span className="font-medium">{label}</span>
      <span className="w-full truncate text-sm text-muted">
        {fileName || t('Upload or camera')}
      </span>
      <input
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          onPick(file?.name ?? '', file)
        }}
      />
    </label>
  )
}

const KycUpload = ({ inApp = false }: { inApp?: boolean }) => {
  const { state } = useStore()
  const { act, busy } = useAction()
  const t = useT()
  const navigate = useNavigate()
  const steps = useOnboardingSteps()
  const { kyc, kycReason, kycDocType } = state.devotee
  const nextPath = inApp ? '/app/profile' : '/onboarding/society'
  const [docType, setDocType] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [tried, setTried] = useState(false)
  const [reuploading, setReuploading] = useState(false)
  const showForm = kyc === 'notStarted' || reuploading

  if (state.session !== 'devotee') return <Navigate to="/login" replace />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTried(true)
    if (!docType || !docNumber.trim() || !frontFile || !backFile) return

    const sent = await act(
      () => devoteeApi.submitKyc(docType, docNumber.trim(), frontFile, backFile),
      t('Sent for review.'),
    )
    if (sent) setReuploading(false)
  }

  const statusIndex = kyc === 'inReview' ? 1 : 2

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      {!inApp && <Steps steps={steps} current={3} />}
      <ScreenHeader
        title={t('KYC verification')}
        backTo={inApp ? '/app/profile' : undefined}
      />

      {showForm ? (
        <form onSubmit={handleSubmit}>
          <Card className="flex flex-col gap-4 md:p-7">
            <Field
              label={t('ID document type')}
              error={tried && !docType ? t('Select a document type.') : ''}
            >
              {(id) => (
                <Select
                  id={id}
                  value={docType}
                  onChange={(event) => setDocType(event.target.value)}
                >
                  <option value="">{t('Select')}</option>
                  {docTypes.map((type) => (
                    <option key={type} value={type}>
                      {t(type)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field
              label={t('Document number')}
              error={
                tried && !docNumber.trim() ? t('Enter the document number.') : ''
              }
            >
              {(id) => (
                <TextInput
                  id={id}
                  value={docNumber}
                  onChange={(event) => setDocNumber(event.target.value)}
                  placeholder={t('Enter number')}
                />
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <UploadTile
                label={t('Front side')}
                fileName={front}
                onPick={(name, file) => {
                  setFront(name)
                  setFrontFile(file)
                }}
              />
              <UploadTile
                label={t('Back side')}
                fileName={back}
                onPick={(name, file) => {
                  setBack(name)
                  setBackFile(file)
                }}
              />
            </div>
            {tried && (!front || !back) && (
              <p role="alert" className="text-sm text-sindoor">
                {t('Add both sides of the document.')}
              </p>
            )}
            <Button type="submit" full disabled={busy}>
              {t('Submit for review')}
            </Button>
            {!inApp && (
              <Button
                variant="secondary"
                full
                onClick={() => navigate(nextPath)}
              >
                {t('Skip for now')}
              </Button>
            )}
          </Card>
        </form>
      ) : (
        <Card className="flex flex-col gap-4 md:p-7">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">{t('Review status')}</p>
            {kyc === 'verified' && <Pill tone="green">{t('KYC verified')}</Pill>}
            {kyc === 'inReview' && <Pill tone="marigold">{t('In review')}</Pill>}
            {kyc === 'rejected' && <Pill tone="warning">{t('Rejected')}</Pill>}
          </div>
          <StatusList
            steps={[
              t('Submitted'),
              t('In review'),
              kyc === 'rejected' ? t('Rejected') : t('Verified'),
            ]}
            current={kyc === 'verified' ? 3 : statusIndex}
            failed={kyc === 'rejected'}
          />
          {kycDocType && (
            <p className="text-sm text-muted">
              {t('Document')}: {t(kycDocType)}
            </p>
          )}
          {kyc === 'rejected' && (
            <>
              <p className="rounded-2xl border border-sindoor/50 p-3 text-sindoor">
                {t('Reason')}: {kycReason ? t(kycReason) : t('Not given')}
              </p>
              <Button full onClick={() => setReuploading(true)}>
                {t('Upload again')}
              </Button>
            </>
          )}
          <ButtonLink
            to={nextPath}
            variant={kyc === 'rejected' ? 'secondary' : 'primary'}
            full
          >
            {inApp ? t('Back to profile') : t('Continue')}
          </ButtonLink>
        </Card>
      )}

      <InfoNote>
        {t(
          'An admin reviews your documents. Earning works now, and redemption stays locked until you are verified.',
        )}
      </InfoNote>
    </div>
  )
}

export default KycUpload
