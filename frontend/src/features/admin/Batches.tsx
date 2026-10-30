import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminPage, DataTable, NoteBar, type Column } from './parts'
import {
  Button,
  CheckRow,
  Chips,
  Field,
  Pill,
  Sheet,
  TextInput,
} from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'
import { createBatch } from '../../store/actions'
import type { Batch, BatchStatus } from '../../store/types'
import { closedCollections } from '../../services/mockData'
import { batchInputKg, batchStages } from './batchStages'

export const BatchStatusPill = ({ status }: { status: BatchStatus }) => {
  const t = useT()
  const stage = batchStages.find((item) => item.value === status)
  const tone =
    status === 'ready'
      ? 'green'
      : status === 'closed'
        ? 'neutral'
        : status === 'created'
          ? 'neutral'
          : 'marigold'

  return <Pill tone={tone}>{t(stage?.label ?? status)}</Pill>
}

type Tab = 'all' | BatchStatus

const Batches = () => {
  const { state, run, toast } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('all')
  const [creating, setCreating] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [totalOverride, setTotalOverride] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const rows = state.batches.filter(
    (batch) => tab === 'all' || batch.status === tab,
  )
  const pickedRows = closedCollections.filter((item) =>
    picked.includes(item.id),
  )
  const autoTotal = pickedRows.reduce((sum, item) => sum + item.kg, 0)
  const overridden = totalOverride !== '' && Number(totalOverride) !== autoTotal
  const canCreate =
    pickedRows.length > 0 && (!overridden || overrideReason.trim() !== '')

  const resetForm = () => {
    setCreating(false)
    setPicked([])
    setTotalOverride('')
    setOverrideReason('')
  }

  const create = () => {
    const inputs = pickedRows.map((item) => ({
      source: item.source,
      date: item.date,
      kg: item.kg,
    }))

    if (overridden) {
      inputs.push({
        source: `Weight correction: ${overrideReason.trim()}`,
        date: inputs[0].date,
        kg: Number(totalOverride) - autoTotal,
      })
    }

    run((current) => createBatch(current, { inputs }))
    resetForm()
    setTab('all')
    toast(t('Batch created.'))
  }

  const columns: Column<Batch>[] = [
    { key: 'id', header: t('Batch'), render: (row) => row.id },
    { key: 'created', header: t('Created'), render: (row) => row.created },
    {
      key: 'input',
      header: t('Input (kg)'),
      render: (row) => batchInputKg(row),
    },
    {
      key: 'sources',
      header: t('Sources'),
      render: (row) =>
        t('{count} temples', {
          count: new Set(row.inputs.map((input) => input.source)).size,
        }),
    },
    {
      key: 'status',
      header: t('Status'),
      render: (row) => <BatchStatusPill status={row.status} />,
    },
    {
      key: 'output',
      header: t('Output (kg)'),
      render: (row) =>
        row.outputKg ?? <span className="text-muted">{t('Not yet')}</span>,
    },
  ]

  return (
    <AdminPage
      title={t('Processing batches')}
      actions={
        <Button icon="plus" onClick={() => setCreating(true)}>
          {t('New batch')}
        </Button>
      }
    >
      <Chips<Tab>
        label={t('Filter by status')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'all', label: t('All') },
          ...batchStages.map((stage) => ({
            value: stage.value,
            label: t(stage.label),
          })),
        ]}
      />

      <DataTable
        label={t('Processing batches')}
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/admin/batches/${row.id}`)}
        emptyTitle={t('No batches in this list')}
      />

      <NoteBar>
        {t(
          'A batch is created when waste arrives at the processing unit. Status moves from Created to Composting, Curing, Ready and Closed. An admin can move it back with a reason.',
        )}
      </NoteBar>

      <Sheet
        open={creating}
        title={t('Create batch')}
        onClose={resetForm}
        footer={
          <Button full disabled={!canCreate} onClick={create}>
            {t('Create batch')}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <fieldset>
            <legend className="mb-1 font-semibold">
              {t('Source collections')}
            </legend>
            {closedCollections.map((item) => (
              <CheckRow
                key={item.id}
                checked={picked.includes(item.id)}
                onChange={(value) => {
                  setTotalOverride('')
                  setPicked(
                    value
                      ? [...picked, item.id]
                      : picked.filter((id) => id !== item.id),
                  )
                }}
              >
                <span className="block">{item.source}</span>
                <span className="text-sm text-muted">
                  {item.date} · {item.kg} kg
                </span>
              </CheckRow>
            ))}
          </fieldset>
          <Field
            label={t('Total input weight (kg)')}
            hint={t('Added up for you. Editing it needs a reason.')}
          >
            {(id) => (
              <TextInput
                id={id}
                inputMode="decimal"
                value={totalOverride === '' ? autoTotal : totalOverride}
                onChange={(event) =>
                  setTotalOverride(event.target.value.replace(/[^\d.]/g, ''))
                }
              />
            )}
          </Field>
          {overridden && (
            <Field label={t('Reason for the change')}>
              {(id) => (
                <TextInput
                  id={id}
                  value={overrideReason}
                  onChange={(event) => setOverrideReason(event.target.value)}
                />
              )}
            </Field>
          )}
        </div>
      </Sheet>
    </AdminPage>
  )
}

export default Batches
