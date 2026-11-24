import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreenHeader from '../../components/Layout/ScreenHeader'
import {
  Button,
  Card,
  CheckRow,
  Field,
  RadioRow,
  TextInput,
} from '../../components/ui/kit'
import { DepositSteps, NeedsDraft, PhotoPreview } from './common'
import { formatKg, purityChecks, useDraft } from './helpers'
import { useStore, useT } from '../../store/appStore'
import {
  depositQuote,
  pendingFromDraft,
  queueDeposit,
  savedDeposit,
  updateDraft,
} from '../../store/fieldActions'
import { operatorApi, type DepositQuote } from '../../store/remote'
import { errorMessage } from '../../services/api'
import { formatNumber, maskMobile } from '../../utils/points'

const reasons = [
  'Plastic or foreign material',
  'Mixed with food waste',
  'Not an eligible type',
]

const ReviewDeposit = () => {
  const { state, run, refresh } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const { draft } = useDraft()
  const notEligible = draft?.waste === 'Other'
  const [rejecting, setRejecting] = useState(notEligible)
  const [reason, setReason] = useState(notEligible ? reasons[2] : '')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [remote, setRemote] = useState<DepositQuote | null>(null)
  const offline = state.operator.offline
  const devoteeUserId = draft?.devoteeUserId ?? ''
  const waste = draft?.waste ?? ''
  const kg = draft?.kg ?? 0

  useEffect(() => {
    if (offline || !devoteeUserId || !waste || !(kg > 0) || waste === 'Other') return
    let alive = true
    operatorApi
      .quote(devoteeUserId, waste, kg)
      .then((value) => {
        if (alive) setRemote(value)
      })
      .catch(() => {
        if (alive) setRemote(null)
      })
    return () => {
      alive = false
    }
  }, [offline, devoteeUserId, waste, kg])

  // Saving clears the draft, so stop here instead of bouncing to Find devotee.
  if (saved) return null
  if (!draft) return <NeedsDraft />
  if (!draft.photo || !(draft.kg > 0)) {
    return <NeedsDraftStep path={draft.kg > 0 ? '/operator/photo' : '/operator/weight'} />
  }

  const local = depositQuote(state, draft)
  const quote = {
    points: remote?.points ?? local.points,
    base: remote?.basePoints ?? local.base,
    multiplier: remote?.multiplier ?? local.multiplier,
    charge: remote ? Number(remote.charge) : local.charge,
    overMax: remote?.overMax ?? local.overMax,
  }
  const checksDone = purityChecks.every((check) => draft.checks.includes(check))
  const rejections = remote?.rejectionsThisWeek ?? local.rejectionsThisWeek
  const limit = remote?.rejectionLimit ?? local.rejectionLimit
  const willFlag = rejecting && rejections + 1 >= limit
  const chargeNeeded = quote.charge > 0 && !draft.chargeCollected
  const canAccept = !notEligible && checksDone && !chargeNeeded

  const save = async (rejected: boolean) => {
    if (rejected && !reason) {
      setError(t('Choose a reason to reject.'))
      return
    }
    const pending = pendingFromDraft(state, {
      rejected,
      reason: rejected ? reason : '',
      note: note.trim(),
    })
    if (!pending) return

    if (offline) {
      setSaved(true)
      run((current) => queueDeposit(current, pending, quote))
      navigate('/operator/saved')
      return
    }

    setSaving(true)
    setError('')
    try {
      const deposit = await operatorApi.record(pending)
      setSaved(true)
      run((current) => savedDeposit(current, deposit))
      navigate('/operator/saved')
      void refresh()
    } catch (problem) {
      setError(t(errorMessage(problem)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <DepositSteps current={4} />
      <ScreenHeader title={t('Review deposit')} backTo="/operator/photo" />

      <Card className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-line">
            <PhotoPreview photo={draft.photo} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold">
              {t(draft.waste)} · {formatKg(draft.kg)}
            </p>
            <p className="text-muted">
              {draft.name} · +91 {maskMobile(draft.mobile)}
            </p>
          </div>
        </div>

        {quote.charge > 0 ? (
          <div className="rounded-2xl border border-line p-3">
            <p className="text-sm text-muted">{t('Charge to collect')}</p>
            <p className="text-2xl font-bold">₹{formatNumber(quote.charge)}</p>
            <CheckRow
              checked={draft.chargeCollected}
              onChange={(value) =>
                run((current) => updateDraft(current, { chargeCollected: value }))
              }
            >
              {t('INR charge collected')}
            </CheckRow>
          </div>
        ) : (
          !notEligible && (
            <div className="flex items-end justify-between gap-3 rounded-2xl border border-line p-3">
              <div>
                <p className="text-sm text-muted">{t('Points to credit')}</p>
                <p className="font-display text-4xl leading-tight text-marigold">
                  {formatNumber(quote.points)}
                </p>
              </div>
              <p className="text-sm text-muted">
                {quote.base} x {quote.multiplier}
              </p>
            </div>
          )
        )}

        {quote.overMax && (
          <p className="rounded-2xl border border-sindoor/50 p-3 text-sm text-sindoor">
            {t('Above the {max} kg limit. An alert is raised for the admin and points are held.', {
              max: state.rules.maxDepositKg,
            })}
          </p>
        )}
        {!checksDone && !notEligible && (
          <p className="text-sm text-sindoor">
            {t('The purity checklist is not complete. Go back to tick it, or reject the deposit.')}
          </p>
        )}
        {error && !rejecting && (
          <p role="alert" className="text-sm text-sindoor">
            {error}
          </p>
        )}
        {state.operator.offline && (
          <p className="text-sm text-marigold">
            {t('You are offline. This deposit is saved on the device and syncs later.')}
          </p>
        )}

        {!rejecting && (
          <>
            <Button full disabled={!canAccept || saving} onClick={() => save(false)} className="!min-h-14">
              {t('Accept deposit')}
            </Button>
            <Button variant="danger" full onClick={() => setRejecting(true)}>
              {t('Reject: contaminated')}
            </Button>
          </>
        )}
      </Card>

      {rejecting && (
        <Card className="flex flex-col gap-3">
          <fieldset>
            <legend className="mb-1 font-semibold">{t('Reason (required)')}</legend>
            {reasons.map((item) => (
              <RadioRow
                key={item}
                name="reason"
                checked={reason === item}
                onChange={() => {
                  setError('')
                  setReason(item)
                }}
              >
                {t(item)}
              </RadioRow>
            ))}
          </fieldset>
          <Field label={t('Note (optional)')}>
            {(id) => (
              <TextInput id={id} value={note} onChange={(event) => setNote(event.target.value)} />
            )}
          </Field>
          {willFlag && (
            <div className="rounded-2xl border border-sindoor/50 p-3">
              <p className="font-semibold text-sindoor">{t('Rejection threshold flag')}</p>
              <p className="text-sm text-muted">
                {t('This devotee has {count} rejections in 7 days (limit {limit}). A flag is raised for admin review.', {
                  count: rejections + 1,
                  limit,
                })}
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-sindoor">
              {error}
            </p>
          )}
          <Button variant="danger" full disabled={saving} onClick={() => save(true)} className="!min-h-14">
            {t('Confirm rejection')}
          </Button>
          {!notEligible && (
            <Button variant="ghost" full onClick={() => setRejecting(false)}>
              {t('Back to accept')}
            </Button>
          )}
          <p className="text-sm text-muted">
            {t('Rejected deposits earn no points. The photo and reason are saved and the devotee is told in the app.')}
          </p>
        </Card>
      )}
    </div>
  )
}

const NeedsDraftStep = ({ path }: { path: string }) => {
  const navigate = useNavigate()
  const t = useT()

  return (
    <Card className="mx-auto flex max-w-lg flex-col gap-3 text-center">
      <p>{t('A step is missing for this deposit.')}</p>
      <Button onClick={() => navigate(path)}>{t('Continue')}</Button>
    </Card>
  )
}

export default ReviewDeposit
