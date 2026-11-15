import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminPage } from './parts'
import { Button, Card, Chips } from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'
import { logExport } from '../../store/actions'
import {
  collectionByDay,
  kpisByRange,
  retentionCohorts,
} from '../../services/mockData'
import { formatNumber } from '../../utils/points'

type Range = keyof typeof kpisByRange

const CollectionChart = () => {
  const t = useT()
  const [active, setActive] = useState<string | null>(null)
  const scaleMax = 160
  const ticks = [0, 40, 80, 120, 160]

  return (
    <div>
      <div className="relative h-56 pl-8">
        {ticks.map((tick) => (
          <div
            key={tick}
            className="absolute inset-x-0 flex items-center gap-2"
            style={{ bottom: `${(tick / scaleMax) * 100}%` }}
          >
            <span className="w-6 translate-y-1/2 text-right text-xs text-muted">
              {tick}
            </span>
            <span
              className={`flex-1 translate-y-1/2 border-t ${
                tick === 0 ? 'border-muted/50' : 'border-line/60'
              }`}
            />
          </div>
        ))}

        <div className="relative z-10 flex h-full items-end">
          {collectionByDay.map((item) => (
            <button
              key={item.day}
              type="button"
              aria-label={`${t(item.day)}: ${item.kg} kg`}
              onMouseEnter={() => setActive(item.day)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(item.day)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === item.day ? null : item.day)}
              className="group relative flex h-full flex-1 items-end justify-center rounded-t-md hover:bg-white/5"
            >
              {active === item.day && (
                <span
                  role="tooltip"
                  className="absolute z-20 whitespace-nowrap rounded-xl border border-line bg-night px-2.5 py-1 text-sm text-ink shadow-xl"
                  style={{ bottom: `calc(${(item.kg / scaleMax) * 100}% + 0.5rem)` }}
                >
                  {t(item.day)} · {item.kg} kg
                </span>
              )}
              <span
                className="w-3/5 max-w-12 rounded-t bg-marigold"
                style={{ height: `${(item.kg / scaleMax) * 100}%` }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex pl-8">
        {collectionByDay.map((item) => (
          <span
            key={item.day}
            className="flex-1 text-center text-sm text-muted"
          >
            {t(item.day)}
          </span>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">
        {t('Busiest day: {day}, {kg} kg', { day: t('Sat'), kg: 154 })}
      </p>
    </div>
  )
}

const Dashboard = () => {
  const { state, run, toast } = useStore()
  const t = useT()
  const [range, setRange] = useState<Range>('30')
  const kpi = kpisByRange[range]

  const kpis = [
    {
      label: t('Registered devotees'),
      value: formatNumber(kpi.devotees),
      note: t('+{count} this week', { count: kpi.devoteesDelta }),
    },
    {
      label: t('Nirmalya collected'),
      value: `${formatNumber(kpi.kg)} kg`,
      note: t('{count} deposits', { count: formatNumber(kpi.deposits) }),
    },
    {
      label: t('Carbon offset'),
      value: `${kpi.carbon} t CO₂e`,
      note: t('formula: kg x factor'),
      green: true,
    },
    {
      label: t('Retention (30 day)'),
      value: `${kpi.retention}%`,
      note: t('repeat depositors'),
    },
  ]

  const queues = [
    {
      label: t('KYC pending'),
      value: state.kycRequests.filter((item) => item.status === 'pending').length,
      to: '/admin/kyc',
      action: t('Review'),
    },
    {
      label: t('Open alerts'),
      value: state.alerts.filter((item) => item.status === 'open').length,
      to: '/admin/alerts',
      action: t('Review'),
    },
    {
      label: t('Active batches'),
      value: state.batches.filter((item) => item.status !== 'closed').length,
      to: '/admin/batches',
      action: t('View'),
    },
    {
      label: t('Orders to fulfil'),
      value: state.orders.filter(
        (item) => !['completed', 'cancelled'].includes(item.status),
      ).length,
      to: '/admin/orders',
      action: t('View'),
    },
  ]

  return (
    <AdminPage
      title={t('Pilot KPIs')}
      actions={
        <>
          <Chips<Range>
            label={t('Date range')}
            value={range}
            onChange={setRange}
            options={[
              { value: '30', label: t('Last 30 days') },
              { value: '7', label: t('7 days') },
              { value: 'all', label: t('All') },
            ]}
          />
          <Button
            variant="secondary"
            icon="download"
            onClick={() => {
              run((current) =>
                logExport(current, 'Pilot KPIs', 'Dashboard export', true),
              )
              toast(t('Export is ready. It was written to the audit log.'))
            }}
          >
            {t('Export')}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <Card key={item.label}>
            <p className="text-sm text-muted">{item.label}</p>
            <p
              className={`mt-1 font-display text-3xl leading-tight md:text-4xl ${
                item.green ? 'text-tulsi' : ''
              }`}
            >
              {item.value}
            </p>
            <p className="mt-1 text-sm text-muted">{item.note}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-bold">{t('Collection by day (kg)')}</h2>
          <CollectionChart />
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-bold">
            {t('Retention by signup week')}
          </h2>
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-80 text-left">
              <thead>
                <tr className="border-b border-line text-sm text-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t('Cohort')}
                  </th>
                  {['W1', 'W2', 'W3', 'W4'].map((week) => (
                    <th key={week} scope="col" className="px-2 py-2 font-medium">
                      {week}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {retentionCohorts.map((row) => (
                  <tr
                    key={row.cohort}
                    className="border-b border-line last:border-b-0"
                  >
                    <th scope="row" className="py-3 pr-3 font-medium">
                      {t(row.cohort)}
                    </th>
                    {row.values.map((value, index) => (
                      <td key={index} className="px-2 py-3">
                        {value === null ? (
                          <span className="text-muted" aria-label={t('No data yet')}>
                            ·
                          </span>
                        ) : (
                          `${value}%`
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {queues.map((item) => (
          <Card key={item.label}>
            <p className="text-sm text-muted">{item.label}</p>
            <p className="mt-1 font-display text-4xl leading-tight">
              {item.value}
            </p>
            <Link
              to={item.to}
              className="mt-1 inline-flex min-h-8 items-center text-marigold underline underline-offset-4"
            >
              {item.action}
            </Link>
          </Card>
        ))}
      </div>
    </AdminPage>
  )
}

export default Dashboard
