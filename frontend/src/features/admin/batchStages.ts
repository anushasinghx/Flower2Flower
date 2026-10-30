import type { Batch, BatchStatus } from '../../store/types'

export const batchStages: { value: BatchStatus; label: string }[] = [
  { value: 'created', label: 'Created' },
  { value: 'composting', label: 'Composting' },
  { value: 'curing', label: 'Curing' },
  { value: 'ready', label: 'Ready' },
  { value: 'closed', label: 'Closed' },
]

export const batchInputKg = (batch: Batch) =>
  batch.inputs.reduce((sum, input) => sum + input.kg, 0)
