import { useState } from 'react'
import { AdminPage, NoteBar } from './parts'
import {
  Button,
  Card,
  Pill,
  TextInput,
  Toggle,
} from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'
import { publishRules } from '../../store/actions'
import type { EarningRule, Level, Rules as RulesType } from '../../store/types'

const toNumber = (value: string) => {
  const parsed = Number(value.replace(/[^\d.]/g, ''))
  return Number.isNaN(parsed) ? 0 : parsed
}

const NumberCell = ({
  label,
  value,
  onChange,
  suffix,
  hideLabel,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  suffix?: string
  hideLabel?: boolean
}) => (
  <label className="flex items-center justify-between gap-2 md:justify-start">
    <span
      className={
        hideLabel ? 'sr-only' : 'text-sm text-muted md:sr-only'
      }
    >
      {label}
    </span>
    <span className="flex items-center gap-1.5">
      <TextInput
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(toNumber(event.target.value))}
        className="!w-24 !px-3 !py-1.5"
      />
      {suffix && <span className="text-sm text-muted">{suffix}</span>}
    </span>
  </label>
)

const SettingRow = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <div className="flex min-h-14 items-center justify-between gap-4 border-b border-line py-2 last:border-b-0">
    <span>{label}</span>
    {children}
  </div>
)

const Rules = () => {
  const { state, run, toast } = useStore()
  const t = useT()
  const [draft, setDraft] = useState<RulesType>(state.rules)
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.rules)

  const updateRule = (id: string, change: Partial<EarningRule>) =>
    setDraft({
      ...draft,
      earning: draft.earning.map((rule) =>
        rule.id === id ? { ...rule, ...change } : rule,
      ),
    })

  const updateLevel = (id: string, change: Partial<Level>) =>
    setDraft({
      ...draft,
      levels: draft.levels.map((level) =>
        level.id === id ? { ...level, ...change } : level,
      ),
    })

  const addRule = () =>
    setDraft({
      ...draft,
      earning: [
        ...draft.earning,
        {
          id: `r${draft.earning.length + 1}${Date.now()}`,
          waste: '',
          ptsPerKg: 0,
          maxPerDay: 0,
          active: false,
          charge: null,
        },
      ],
    })

  const addLevel = () => {
    const highest = Math.max(...draft.levels.map((level) => level.minPoints))
    setDraft({
      ...draft,
      levels: [
        ...draft.levels,
        {
          id: `v${draft.levels.length + 1}${Date.now()}`,
          name: '',
          minPoints: highest + 1000,
          multiplier: 1,
        },
      ],
    })
  }

  const publish = () => {
    const cleaned = {
      ...draft,
      earning: draft.earning.filter((rule) => rule.waste.trim()),
      levels: draft.levels.filter((level) => level.name.trim()),
    }
    setDraft({ ...cleaned, version: draft.version + 1 })
    run((current) => publishRules(current, cleaned))
    toast(t('Rules published. They apply to new deposits only.'))
  }

  return (
    <AdminPage
      title={t('Points rules and levels')}
      actions={
        <>
          <Pill tone={dirty ? 'marigold' : 'neutral'}>
            {dirty
              ? t('Draft')
              : t('Published, version {version}', {
                  version: state.rules.version,
                })}
          </Pill>
          {dirty && (
            <Button variant="secondary" onClick={() => setDraft(state.rules)}>
              {t('Discard')}
            </Button>
          )}
          <Button disabled={!dirty} onClick={publish}>
            {t('Publish changes')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t('Earning rules')}</h2>
          <div className="hidden grid-cols-[minmax(0,1.4fr)_7.5rem_8rem_3.5rem] gap-3 border-b border-line pb-2 text-sm text-muted md:grid">
            <span>{t('Waste type')}</span>
            <span>{t('Pts per kg')}</span>
            <span>{t('Max per day')}</span>
            <span>{t('Active')}</span>
          </div>
          {draft.earning.map((rule) => (
            <div
              key={rule.id}
              className="flex flex-col gap-2 border-b border-line pb-3 last:border-b-0 md:grid md:grid-cols-[minmax(0,1.4fr)_7.5rem_8rem_3.5rem] md:items-center md:gap-3"
            >
              <TextInput
                aria-label={t('Waste type')}
                value={t(rule.waste)}
                placeholder={t('Waste type')}
                onChange={(event) =>
                  updateRule(rule.id, { waste: event.target.value })
                }
                className="!px-3 !py-1.5"
              />
              {rule.charge !== null ? (
                <NumberCell
                  label={t('Charge in ₹')}
                  value={rule.charge}
                  suffix="₹"
                  onChange={(value) => updateRule(rule.id, { charge: value })}
                />
              ) : (
                <NumberCell
                  label={t('Pts per kg')}
                  value={rule.ptsPerKg}
                  onChange={(value) => updateRule(rule.id, { ptsPerKg: value })}
                />
              )}
              {rule.charge !== null ? (
                <span className="text-sm text-muted">{t('Charge applies')}</span>
              ) : (
                <NumberCell
                  label={t('Max per day')}
                  value={rule.maxPerDay}
                  suffix="kg"
                  onChange={(value) => updateRule(rule.id, { maxPerDay: value })}
                />
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted md:sr-only">{t('Active')}</span>
                <Toggle
                  checked={rule.active}
                  label={t('Active')}
                  onChange={(value) => updateRule(rule.id, { active: value })}
                />
              </div>
            </div>
          ))}
          <Button
            variant="secondary"
            icon="plus"
            className="w-fit"
            onClick={addRule}
          >
            {t('Add rule')}
          </Button>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t('Levels and multipliers')}</h2>
          <div className="hidden grid-cols-[minmax(0,1.4fr)_7.5rem_7.5rem] gap-3 border-b border-line pb-2 text-sm text-muted md:grid">
            <span>{t('Level')}</span>
            <span>{t('Min points')}</span>
            <span>{t('Multiplier')}</span>
          </div>
          {draft.levels.map((level, index) => (
            <div
              key={level.id}
              className="flex flex-col gap-2 border-b border-line pb-3 last:border-b-0 md:grid md:grid-cols-[minmax(0,1.4fr)_7.5rem_7.5rem] md:items-center md:gap-3"
            >
              <span className="flex items-center gap-2">
                <span className="text-muted">{index + 1}</span>
                <TextInput
                  aria-label={t('Level')}
                  value={t(level.name)}
                  placeholder={t('Level name')}
                  onChange={(event) =>
                    updateLevel(level.id, { name: event.target.value })
                  }
                  className="!px-3 !py-1.5"
                />
              </span>
              <NumberCell
                label={t('Min points')}
                value={level.minPoints}
                onChange={(value) => updateLevel(level.id, { minPoints: value })}
              />
              <NumberCell
                label={t('Multiplier')}
                value={level.multiplier}
                suffix="x"
                onChange={(value) => updateLevel(level.id, { multiplier: value })}
              />
            </div>
          ))}
          <Button
            variant="secondary"
            icon="plus"
            className="w-fit"
            onClick={addLevel}
          >
            {t('Add level')}
          </Button>
        </Card>

        <Card>
          <h2 className="mb-1 text-lg font-bold">{t('Redemption')}</h2>
          <SettingRow label={t('Points per ₹1')}>
            <NumberCell
              hideLabel
              label={t('Points per ₹1')}
              value={draft.pointsPerRupee}
              onChange={(value) => setDraft({ ...draft, pointsPerRupee: value })}
            />
          </SettingRow>
          <SettingRow label={t('Requires verified KYC')}>
            <Toggle
              checked={draft.requiresKyc}
              label={t('Requires verified KYC')}
              onChange={(value) => setDraft({ ...draft, requiresKyc: value })}
            />
          </SettingRow>
          <SettingRow label={t('Max % of order payable in points')}>
            <NumberCell
              hideLabel
              label={t('Max % of order payable in points')}
              value={draft.maxPctInPoints}
              suffix="%"
              onChange={(value) =>
                setDraft({ ...draft, maxPctInPoints: Math.min(100, value) })
              }
            />
          </SettingRow>
        </Card>

        <Card>
          <h2 className="mb-1 text-lg font-bold">{t('Safeguards')}</h2>
          <SettingRow label={t('Rejection threshold (per 7 days)')}>
            <NumberCell
              hideLabel
              label={t('Rejection threshold (per 7 days)')}
              value={draft.rejectionLimit}
              onChange={(value) => setDraft({ ...draft, rejectionLimit: value })}
            />
          </SettingRow>
          <SettingRow label={t('Max deposit weight (kg)')}>
            <NumberCell
              hideLabel
              label={t('Max deposit weight (kg)')}
              value={draft.maxDepositKg}
              onChange={(value) => setDraft({ ...draft, maxDepositKg: value })}
            />
          </SettingRow>
          <SettingRow label={t('Hold points on flag')}>
            <Toggle
              checked={draft.holdOnFlag}
              label={t('Hold points on flag')}
              onChange={(value) => setDraft({ ...draft, holdOnFlag: value })}
            />
          </SettingRow>
        </Card>
      </div>

      <NoteBar>
        {t(
          'Rule changes apply to new deposits only and are versioned. Past ledger entries never change. Every edit is written to the audit log.',
        )}
      </NoteBar>
    </AdminPage>
  )
}

export default Rules
