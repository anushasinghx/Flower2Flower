import { useState } from 'react'
import {
  AdminPage,
  DataTable,
  DetailRow,
  MasterDetail,
  NoteBar,
  PhotoTile,
  type Column,
} from './parts'
import {
  Button,
  Card,
  Field,
  Pill,
  Segmented,
  TextArea,
} from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'
import { resolveAlert } from '../../store/actions'
import type { Alert } from '../../store/types'
import { formatNumber } from '../../utils/points'

const SeverityPill = ({ severity }: { severity: Alert['severity'] }) => {
  const t = useT()

  if (severity === 'high') return <Pill tone="warning">{t('High')}</Pill>
  if (severity === 'medium') return <Pill tone="marigold">{t('Medium')}</Pill>
  return <Pill>{t('Low')}</Pill>
}

const Alerts = () => {
  const { state, run, toast } = useStore()
  const t = useT()
  const [tab, setTab] = useState<Alert['status']>('open')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')
  const alerts = state.alerts
  const open = alerts.filter((item) => item.status === 'open')
  const rows = alerts.filter((item) => item.status === tab)
  const selected = alerts.find((item) => item.id === selectedId) ?? null
  const countByKind = (kind: Alert['ruleKind']) =>
    open.filter((item) => item.ruleKind === kind).length
  const totalHeld = open.reduce((sum, item) => sum + item.heldPoints, 0)

  const stats = [
    { label: t('Over limit weight'), value: countByKind('weight') },
    { label: t('Rejection threshold'), value: countByKind('rejection') },
    { label: t('Rapid repeat deposits'), value: countByKind('rapid') },
    { label: t('Points held'), value: formatNumber(totalHeld), accent: true },
  ]

  const close = () => {
    setSelectedId(null)
    setNote('')
    setNoteError('')
  }

  const resolve = (action: 'release' | 'remove' | 'dismiss') => {
    if (!selected) return

    if (!note.trim()) {
      setNoteError(t('Add a resolution note first.'))
      return
    }

    run((current) => resolveAlert(current, selected.id, action, note.trim()))
    toast(
      action === 'release'
        ? t('Points released. A new ledger entry was added.')
        : action === 'remove'
          ? t('Points removed. A new ledger entry was added.')
          : t('Alert dismissed.'),
    )
    close()
  }

  const columns: Column<Alert>[] = [
    { key: 'subject', header: t('User or operator'), render: (row) => row.subject },
    {
      key: 'severity',
      header: t('Alert'),
      render: (row) => <SeverityPill severity={row.severity} />,
    },
    { key: 'rule', header: t('Rule'), render: (row) => t(row.rule) },
    { key: 'time', header: t('Time'), render: (row) => t(row.time) },
  ]

  return (
    <AdminPage title={t('Alerts and held points')}>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label}>
            <p className="text-sm text-muted">{item.label}</p>
            <p
              className={`mt-1 font-display text-4xl leading-tight ${
                item.accent ? 'text-marigold' : ''
              }`}
            >
              {item.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="sm:max-w-sm">
        <Segmented<Alert['status']>
          label={t('Filter by status')}
          value={tab}
          onChange={(value) => {
            setTab(value)
            close()
          }}
          options={[
            { value: 'open', label: `${t('Open')} (${open.length})` },
            { value: 'resolved', label: t('Resolved') },
          ]}
        />
      </div>

      <MasterDetail
        open={selected !== null}
        onClose={close}
        title={t('Alert detail')}
        placeholder={t('Select an alert to review')}
        list={
          <DataTable
            label={t('Alerts and held points')}
            rows={rows}
            columns={columns}
            rowKey={(row) => row.id}
            selectedKey={selectedId}
            onRowClick={(row) => {
              setSelectedId(row.id)
              setNote('')
              setNoteError('')
            }}
            emptyTitle={t('No alerts in this list')}
          />
        }
        detail={
          selected && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="font-semibold">{selected.subject}</p>
                <p className="text-muted">{t(selected.detail)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <PhotoTile label={t('Photo 1')} />
                <PhotoTile label={t('Photo 2')} />
              </div>
              <div>
                <DetailRow label={t('Severity')}>
                  <SeverityPill severity={selected.severity} />
                </DetailRow>
                <DetailRow label={t('Held points')}>
                  {formatNumber(selected.heldPoints)}
                </DetailRow>
                {selected.resolution && (
                  <DetailRow label={t('Resolution note')}>
                    {selected.resolution}
                  </DetailRow>
                )}
              </div>

              {selected.status === 'open' && (
                <>
                  <Field label={t('Resolution note')} error={noteError}>
                    {(id) => (
                      <TextArea
                        id={id}
                        value={note}
                        onChange={(event) => {
                          setNoteError('')
                          setNote(event.target.value)
                        }}
                      />
                    )}
                  </Field>
                  {selected.heldPoints > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      <Button full onClick={() => resolve('release')}>
                        {t('Release points')}
                      </Button>
                      <Button
                        variant="danger"
                        full
                        onClick={() => resolve('remove')}
                      >
                        {t('Remove points')}
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    full
                    onClick={() => resolve('dismiss')}
                  >
                    {t('Dismiss alert')}
                  </Button>
                </>
              )}
            </div>
          )
        }
      />

      <NoteBar>
        {t(
          'Simple threshold rules only in Phase 1. Each action adds a new ledger entry and an audit entry, and the devotee sees the held reason in the app.',
        )}
      </NoteBar>
    </AdminPage>
  )
}

export default Alerts
