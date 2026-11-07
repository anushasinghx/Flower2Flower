import { Navigate } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import { InfoNote } from '../../components/ui/kit'
import DepositHistory from '../history/DepositHistory'
import { useMyTemple } from './useMyTemple'
import { useStore, useT } from '../../store/appStore'

const TempleHistory = () => {
  const { state } = useStore()
  const t = useT()
  const temple = useMyTemple()

  if (!temple || temple.status !== 'verified') return <Navigate to="/temple" replace />

  const deposits = state.deposits.filter((deposit) => deposit.templeId === temple.id)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <ScreenHeader title={t('Deposit history')} backTo="/temple" />
      <p className="-mt-3 mb-4 text-muted">{temple.name}</p>
      <DepositHistory
        deposits={deposits}
        templeNames={state.temples}
        maskMobiles
        initialPeriod="30"
        emptyText={t('No deposits yet. They appear here once the counter starts collecting.')}
      />
      <div className="mt-4">
        <InfoNote>{t('Devotee mobile numbers are masked for temple admins.')}</InfoNote>
      </div>
    </div>
  )
}

export default TempleHistory
