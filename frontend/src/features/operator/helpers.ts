import { useStore } from '../../store/appStore'
import { findDevotee } from '../../store/fieldActions'

export const purityChecks = [
  'No plastic, metal or cloth',
  'No food or mixed waste',
  'Photo is clear and well lit',
]

// Flow screens need a devotee picked first.
export const useDraft = () => {
  const { state } = useStore()
  const draft = state.operator.draft
  const devotee = draft ? findDevotee(state, draft.mobile) : null

  return { draft, devotee }
}

export const formatKg = (kg: number) =>
  `${kg.toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg`

export const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
