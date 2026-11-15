import { AdminPage, NoteBar } from './parts'
import { Button } from '../../components/ui/kit'
import DepositHistory from '../history/DepositHistory'
import { depositsCsv, downloadText } from '../history/historyHelpers'
import { useStore, useT } from '../../store/appStore'
import { logExport } from '../../store/actions'

const Deposits = () => {
  const { state, run, toast } = useStore()
  const t = useT()

  const download = () => {
    downloadText('deposits.csv', depositsCsv(state.deposits, state.temples))
    run((current) => logExport(current, 'Deposits', 'Deposit history download', true))
    toast(t('Export is ready. It was written to the audit log.'))
  }

  return (
    <AdminPage
      title={t('Deposit history')}
      actions={
        <Button variant="secondary" icon="download" onClick={download}>
          {t('Download CSV')}
        </Button>
      }
    >
      <DepositHistory
        deposits={state.deposits}
        temples={state.temples.filter((temple) =>
          state.deposits.some((deposit) => deposit.templeId === temple.id),
        )}
        maskMobiles
        initialPeriod="30"
        emptyText={t('No deposits yet')}
      />
      <NoteBar>
        {t('Every counter deposit across collection points. Downloads are masked and written to the audit log.')}
      </NoteBar>
    </AdminPage>
  )
}

export default Deposits
