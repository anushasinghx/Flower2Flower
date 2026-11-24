import { AdminPage, NoteBar } from './parts'
import { Button } from '../../components/ui/kit'
import DepositHistory from '../history/DepositHistory'
import { useAction, useStore, useT } from '../../store/appStore'
import { adminApi } from '../../store/remote'
import { downloadBlob } from '../../services/api'

const Deposits = () => {
  const { state } = useStore()
  const { act, busy } = useAction()
  const t = useT()

  const download = () =>
    void act(async () => {
      const file = await adminApi.exportCsv('Deposits', 'Deposit history download', true)
      downloadBlob(file.filename, file.blob)
    }, t('Export is ready. It was written to the audit log.'))

  return (
    <AdminPage
      title={t('Deposit history')}
      actions={
        <Button variant="secondary" icon="download" disabled={busy} onClick={download}>
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
