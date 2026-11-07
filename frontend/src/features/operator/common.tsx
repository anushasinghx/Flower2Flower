import { Navigate } from 'react-router-dom'
import { Pill, Steps } from '../../components/ui/kit'
import { useT } from '../../store/appStore'
import type { DepositStatus } from '../../store/types'

export const DepositSteps = ({ current }: { current: number }) => {
  const t = useT()

  return (
    <Steps
      current={current}
      steps={[t('Devotee'), t('Waste'), t('Weight'), t('Photo'), t('Save')]}
    />
  )
}

export const NeedsDraft = () => <Navigate to="/operator/find" replace />

export const DepositStatusPill = ({
  status,
  synced,
}: {
  status: DepositStatus
  synced: boolean
}) => {
  const t = useT()

  if (!synced) return <Pill tone="marigold">{t('Queued')}</Pill>
  if (status === 'rejected') return <Pill tone="warning">{t('Rejected')}</Pill>
  if (status === 'held') return <Pill tone="warning">{t('Held')}</Pill>
  return <Pill tone="green">{t('Accepted')}</Pill>
}

export const PhotoPreview = ({ photo }: { photo: string }) => {
  const t = useT()

  if (photo && photo !== 'sample') {
    return (
      <img
        src={photo}
        alt={t('Deposit photo')}
        className="h-full w-full object-cover"
      />
    )
  }

  return (
    <span className="flex h-full w-full items-center justify-center bg-raised p-3 text-center text-sm text-muted">
      {photo === 'sample' ? t('Sample photo') : t('No photo yet')}
    </span>
  )
}
