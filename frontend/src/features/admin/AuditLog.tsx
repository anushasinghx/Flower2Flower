import { useState } from 'react'
import {
  AdminPage,
  DataTable,
  DetailRow,
  NoteBar,
  SearchBox,
  type Column,
} from './parts'
import {
  Button,
  Card,
  CheckRow,
  Field,
  Select,
  Sheet,
  TextArea,
  TextInput,
} from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'
import { logExport } from '../../store/actions'
import type { AuditEntry } from '../../store/types'

const datasets = ['Deposits', 'Users', 'Orders', 'Points ledger']

const entryDate = (time: string) => {
  const [day, month, clock] = time.split(' ')
  return new Date(`${day} ${month} ${new Date().getFullYear()} ${clock}`)
}

const AuditLog = () => {
  const { state, run, toast } = useStore()
  const t = useT()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [actor, setActor] = useState('')
  const [action, setAction] = useState('')
  const [query, setQuery] = useState('')
  const [viewing, setViewing] = useState<AuditEntry | null>(null)
  const [dataset, setDataset] = useState(datasets[0])
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [reason, setReason] = useState('')
  const [masked, setMasked] = useState(true)
  const [reasonError, setReasonError] = useState('')

  const actors = [...new Set(state.audit.map((entry) => entry.actor))]
  const actions = [...new Set(state.audit.map((entry) => entry.action))]
  const rows = state.audit.filter((entry) => {
    const date = entryDate(entry.time)
    return (
      (!from || date >= new Date(`${from}T00:00`)) &&
      (!to || date <= new Date(`${to}T23:59`)) &&
      (!actor || entry.actor === actor) &&
      (!action || entry.action === action) &&
      entry.record.toLowerCase().includes(query.trim().toLowerCase())
    )
  })

  const recordLabel = (record: string) =>
    t(record)
      .replace(/^User /, `${t('User')} `)
      .replace(/^Order /, `${t('Order')} `)

  const runExport = () => {
    if (!reason.trim()) {
      setReasonError(t('A reason is required for every export.'))
      return
    }

    run((current) => logExport(current, dataset, reason.trim(), masked))
    setReason('')
    toast(t('Export is ready. It was written to the audit log.'))
  }

  const columns: Column<AuditEntry>[] = [
    { key: 'action', header: t('Action'), render: (row) => t(row.action) },
    { key: 'time', header: t('Time'), render: (row) => row.time },
    { key: 'actor', header: t('Actor'), render: (row) => row.actor },
    { key: 'role', header: t('Role'), render: (row) => t(row.role) },
    { key: 'record', header: t('Record'), render: (row) => recordLabel(row.record) },
  ]

  return (
    <AdminPage title={t('Audit log')}>
      <div className="grid gap-3 min-[420px]:grid-cols-2 lg:grid-cols-5">
        <Field label={t('From')}>
          {(id) => (
            <TextInput
              id={id}
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          )}
        </Field>
        <Field label={t('To')}>
          {(id) => (
            <TextInput
              id={id}
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          )}
        </Field>
        <Field label={t('Actor')}>
          {(id) => (
            <Select
              id={id}
              value={actor}
              onChange={(event) => setActor(event.target.value)}
            >
              <option value="">{t('All')}</option>
              {actors.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('Action')}>
          {(id) => (
            <Select
              id={id}
              value={action}
              onChange={(event) => setAction(event.target.value)}
            >
              <option value="">{t('All')}</option>
              {actions.map((item) => (
                <option key={item} value={item}>
                  {t(item)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="flex flex-col justify-end">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder={t('Search record ID')}
          />
        </div>
      </div>

      <DataTable
        label={t('Audit log')}
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        selectedKey={viewing?.id}
        onRowClick={(row) => setViewing(row)}
        emptyTitle={t('No entries match these filters')}
      />

      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">{t('Restricted data export')}</h2>
          <Field label={t('Dataset')}>
            {(id) => (
              <Select
                id={id}
                value={dataset}
                onChange={(event) => setDataset(event.target.value)}
              >
                {datasets.map((item) => (
                  <option key={item} value={item}>
                    {t(item)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="grid gap-4 min-[420px]:grid-cols-2">
            <Field label={t('From')}>
              {(id) => (
                <TextInput
                  id={id}
                  type="date"
                  value={exportFrom}
                  onChange={(event) => setExportFrom(event.target.value)}
                />
              )}
            </Field>
            <Field label={t('To')}>
              {(id) => (
                <TextInput
                  id={id}
                  type="date"
                  value={exportTo}
                  onChange={(event) => setExportTo(event.target.value)}
                />
              )}
            </Field>
          </div>
          <Field label={t('Reason (required)')} error={reasonError}>
            {(id) => (
              <TextArea
                id={id}
                value={reason}
                placeholder={t('Why is this export needed?')}
                onChange={(event) => {
                  setReasonError('')
                  setReason(event.target.value)
                }}
              />
            )}
          </Field>
          <CheckRow checked={masked} onChange={setMasked}>
            {t('Mask mobile numbers and ID data')}
          </CheckRow>
          <Button icon="download" full onClick={runExport}>
            {t('Export')}
          </Button>
        </Card>

        <Card>
          <h2 className="mb-2 text-lg font-bold">{t('Recent exports')}</h2>
          <ul>
            {state.exports.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-x-3 border-b border-line py-2 last:border-b-0"
              >
                <span className="font-medium">{t(item.dataset)}</span>
                <span className="text-sm text-muted">
                  {item.by} · {item.time} ·{' '}
                  {item.masked ? t('Masked') : t('Unmasked')}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <NoteBar>
              {t(
                'Export is restricted to the Admin role, and every export is written to the audit log.',
              )}
            </NoteBar>
          </div>
        </Card>
      </div>

      <Sheet
        open={viewing !== null}
        title={t('Log detail')}
        onClose={() => setViewing(null)}
      >
        {viewing && (
          <div>
            <DetailRow label={t('Action')}>{t(viewing.action)}</DetailRow>
            <DetailRow label={t('Time')}>{viewing.time}</DetailRow>
            <DetailRow label={t('Actor')}>
              {viewing.actor} · {t(viewing.role)}
            </DetailRow>
            <DetailRow label={t('Record')}>
              {recordLabel(viewing.record)}
            </DetailRow>
            <DetailRow label={t('Old value')}>{t(viewing.oldValue)}</DetailRow>
            <DetailRow label={t('New value')}>{t(viewing.newValue)}</DetailRow>
            <DetailRow label={t('Reason')}>{t(viewing.reason)}</DetailRow>
          </div>
        )}
      </Sheet>
    </AdminPage>
  )
}

export default AuditLog
