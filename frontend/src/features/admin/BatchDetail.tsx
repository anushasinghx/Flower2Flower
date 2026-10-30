import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { AdminPage, HistoryList, NoteBar } from './parts'
import { BatchStatusPill } from './Batches'
import { batchInputKg, batchStages } from './batchStages'
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  Sheet,
  StatusList,
  TextInput,
} from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'
import { moveBatch, updateStock } from '../../store/actions'
import { formatNumber } from '../../utils/points'

const BatchDetail = () => {
  const { id } = useParams()
  const { state, run, toast } = useStore()
  const t = useT()
  const batch = state.batches.find((item) => item.id === id)
  const products = state.products.filter((item) => item.group === 'manure')
  const [outputKg, setOutputKg] = useState(String(batch?.outputKg ?? ''))
  const [units, setUnits] = useState<Record<string, string>>({})
  const [movingBack, setMovingBack] = useState(false)
  const [backReason, setBackReason] = useState('')

  if (!batch) {
    return (
      <EmptyState icon="layers" title={t('Batch not found')}>
        <ButtonLink to="/admin/batches">{t('Back to batches')}</ButtonLink>
      </EmptyState>
    )
  }

  const stageIndex = batchStages.findIndex(
    (item) => item.value === batch.status,
  )
  const nextStage = batchStages[stageIndex + 1]
  const previousStage = batchStages[stageIndex - 1]
  const totalInput = batchInputKg(batch)
  const outputNumber = Number(outputKg)
  const yieldPct =
    outputNumber > 0 ? Math.round((outputNumber / totalInput) * 100) : 0
  const lines = products
    .map((product) => ({
      productId: product.id,
      units: Number(units[product.id] ?? 0),
    }))
    .filter((line) => line.units > 0)
  const canUpdate =
    batch.status === 'ready' && outputNumber > 0 && lines.length > 0

  const update = () => {
    run((current) => updateStock(current, batch.id, outputNumber, lines))
    setUnits({})
    toast(t('Sellable stock updated. Catalogue and shop now show it.'))
  }

  return (
    <AdminPage
      title={`${t('Batch')} ${batch.id}`}
      backTo="/admin/batches"
      backLabel={t('Batches')}
      actions={
        <>
          <BatchStatusPill status={batch.status} />
          <Button
            variant="secondary"
            icon="print"
            onClick={() => toast(t('Label sent to printer.'))}
          >
            {t('Print label')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr] xl:items-start">
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-2 text-lg font-bold">{t('Status')}</h2>
            <StatusList
              steps={batchStages.map((stage) => t(stage.label))}
              current={batch.status === 'closed' ? 5 : stageIndex}
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {nextStage && (
                <Button
                  full
                  onClick={() => {
                    run((current) =>
                      moveBatch(
                        current,
                        batch.id,
                        nextStage.value,
                        nextStage.label,
                        '',
                      ),
                    )
                    toast(
                      t('Moved to {stage}.', { stage: t(nextStage.label) }),
                    )
                  }}
                >
                  {t('Move to {stage}', { stage: t(nextStage.label) })}
                </Button>
              )}
              {previousStage && (
                <Button
                  variant="secondary"
                  full
                  onClick={() => setMovingBack(true)}
                >
                  {t('Move back')}
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="mb-2 text-lg font-bold">{t('Input')}</h2>
            <ul>
              {batch.inputs.map((input) => (
                <li
                  key={`${input.source}${input.date}`}
                  className="flex items-center justify-between gap-3 border-b border-line py-2"
                >
                  <span className="min-w-0">
                    <span className="block">{input.source}</span>
                    <span className="text-sm text-muted">{input.date}</span>
                  </span>
                  <span className="shrink-0">{input.kg} kg</span>
                </li>
              ))}
            </ul>
            <p className="flex items-center justify-between gap-3 pt-3 text-lg font-bold">
              <span>{t('Total input')}</span>
              <span>{formatNumber(totalInput)} kg</span>
            </p>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4">
            <h2 className="text-lg font-bold">
              {t('Output and sellable stock')}
            </h2>
            {batch.status !== 'ready' && (
              <p className="text-sm text-muted">
                {t('Stock can be added when the batch is Ready.')}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('Output weight (kg)')}>
                {(fieldId) => (
                  <TextInput
                    id={fieldId}
                    inputMode="decimal"
                    disabled={batch.status !== 'ready'}
                    value={outputKg}
                    onChange={(event) =>
                      setOutputKg(event.target.value.replace(/[^\d.]/g, ''))
                    }
                  />
                )}
              </Field>
              <div>
                <p className="text-sm font-medium text-muted">{t('Yield')}</p>
                <p className="mt-1 font-display text-4xl leading-tight text-tulsi">
                  {yieldPct}%
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 font-semibold">{t('Create stock items')}</p>
              <div className="flex flex-col gap-2">
                {products.map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block">
                        {t(product.name)} · {product.pack}
                      </span>
                      <span className="text-sm text-muted">
                        {t('In stock now: {count}', { count: product.stock })}
                      </span>
                    </span>
                    <TextInput
                      aria-label={t('Units')}
                      inputMode="numeric"
                      placeholder={t('Units')}
                      disabled={batch.status !== 'ready'}
                      value={units[product.id] ?? ''}
                      onChange={(event) =>
                        setUnits({
                          ...units,
                          [product.id]: event.target.value.replace(/\D/g, ''),
                        })
                      }
                      className="!w-24 !px-3 !py-1.5"
                    />
                  </label>
                ))}
              </div>
            </div>

            <Button full disabled={!canUpdate} onClick={update}>
              {t('Update sellable stock')}
            </Button>
          </Card>

          <Card>
            <h2 className="mb-1 text-lg font-bold">{t('History')}</h2>
            <HistoryList items={batch.history} />
          </Card>
        </div>
      </div>

      <NoteBar>
        {t(
          'Updating stock adds units to the catalogue. The batch ID stays linked to each stock item for traceability.',
        )}
      </NoteBar>

      <Sheet
        open={movingBack}
        title={t('Move back')}
        onClose={() => setMovingBack(false)}
        footer={
          <Button
            full
            disabled={!backReason.trim()}
            onClick={() => {
              if (!previousStage) return
              run((current) =>
                moveBatch(
                  current,
                  batch.id,
                  previousStage.value,
                  previousStage.label,
                  backReason.trim(),
                ),
              )
              setMovingBack(false)
              setBackReason('')
              toast(
                t('Moved to {stage}.', { stage: t(previousStage.label) }),
              )
            }}
          >
            {t('Move to {stage}', { stage: t(previousStage?.label ?? '') })}
          </Button>
        }
      >
        <Field label={t('Reason (required)')}>
          {(fieldId) => (
            <TextInput
              id={fieldId}
              value={backReason}
              onChange={(event) => setBackReason(event.target.value)}
            />
          )}
        </Field>
      </Sheet>
    </AdminPage>
  )
}

export default BatchDetail
