import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { useStore, useT } from '../../store/appStore'
import { submitKyc } from '../../store/actions'

const docTypes = ['Aadhaar', 'Voter ID', 'Driving licence']

const UploadTile = ({
  label,
  fileName,
  onPick,
}: {
  label: string
  fileName: string
  onPick: (name: string) => void
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
        onChange={(event) => onPick(event.target.files?.[0]?.name ?? '')}
      />
    </label>
  )
}

const KycUpload = ({ inApp = false }: { inApp?: boolean }) => {
  const { state, run } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const steps = useOnboardingSteps()
  const { kyc, kycReason, kycDocType } = state.devotee
  const nextPath = inApp ? '/app/profile' : '/onboarding/society'
  const [docType, setDocType] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [tried, setTried] = useState(false)
  const [reuploading, setReuploading] = useState(false)
  const showForm = kyc === 'notStarted' || reuploading

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTried(true)
    if (!docType || !docNumber.trim() || !front || !back) return

    run((current) => submitKyc(current, { docType, docNumber }))
    setReuploading(false)
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
              <UploadTile label={t('Front side')} fileName={front} onPick={setFront} />
              <UploadTile label={t('Back side')} fileName={back} onPick={setBack} />
            </div>
            {tried && (!front || !back) && (
              <p role="alert" className="text-sm text-sindoor">
                {t('Add both sides of the document.')}
              </p>
            )}
            <Button type="submit" full>
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
