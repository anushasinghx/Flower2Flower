import ScreenHeader from '../../components/Layout/ScreenHeader'
import DepositHistory from '../history/DepositHistory'
import { useStore, useT } from '../../store/appStore'

const OperatorHistory = () => {
  const { state } = useStore()
  const t = useT()
  const { templeId } = state.operator
  const temple = state.temples.find((item) => item.id === templeId)
  const deposits = state.deposits.filter((deposit) => deposit.templeId === templeId)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <ScreenHeader title={t('Deposit history')} backTo="/operator" />
      <p className="-mt-3 mb-4 text-muted">{temple?.name}</p>
      <DepositHistory
        deposits={deposits}
        templeNames={state.temples}
        emptyText={t('No deposits at this collection point yet')}
      />
    </div>
  )
}

export default OperatorHistory
