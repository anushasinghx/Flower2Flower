import type { Deposit, DepositStatus, Temple } from '../../store/types'
import { maskMobile } from '../../utils/points'

export type Period = 'today' | '7' | '30' | 'all'
export type StatusFilter = 'all' | DepositStatus | 'queued'

export type HistoryFilters = {
  period: Period
  status: StatusFilter
  query: string
  templeId: string
}

const DAY = 86400000

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

export const filterDeposits = (deposits: Deposit[], filters: HistoryFilters) => {
  const today = startOfDay(new Date())
  const since =
    filters.period === 'today'
      ? today
      : filters.period === '7'
        ? today - 6 * DAY
        : filters.period === '30'
          ? today - 29 * DAY
          : 0
  const query = filters.query.trim().toLowerCase()

  return deposits
    .filter((deposit) => new Date(deposit.at).getTime() >= since)
    .filter((deposit) => !filters.templeId || deposit.templeId === filters.templeId)
    .filter((deposit) => {
      if (filters.status === 'all') return true
      if (filters.status === 'queued') return !deposit.synced
      return deposit.synced && deposit.status === filters.status
    })
    .filter(
      (deposit) =>
        !query ||
        deposit.name.toLowerCase().includes(query) ||
        deposit.mobile.includes(query) ||
        deposit.id.toLowerCase().includes(query),
    )
    .sort((a, b) => b.at.localeCompare(a.at))
}

// English key for the day heading. Today and Yesterday are translated by the caller.
export const dayLabel = (iso: string) => {
  const day = startOfDay(new Date(iso))
  const today = startOfDay(new Date())
  if (day === today) return 'Today'
  if (day === today - DAY) return 'Yesterday'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })
}

export const dateTimeLabel = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

export const groupByDay = (deposits: Deposit[]) => {
  const groups: { label: string; items: Deposit[] }[] = []
  deposits.forEach((deposit) => {
    const label = dayLabel(deposit.at)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(deposit)
    else groups.push({ label, items: [deposit] })
  })
  return groups
}

export const historyTotals = (deposits: Deposit[]) => {
  const counted = deposits.filter((deposit) => deposit.status !== 'rejected')
  return {
    count: deposits.length,
    kg: counted.reduce((sum, deposit) => sum + deposit.kg, 0),
    points: deposits.reduce((sum, deposit) => sum + deposit.points, 0),
  }
}

const csvCell = (value: string | number) => {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const depositsCsv = (deposits: Deposit[], temples: Temple[]) => {
  const header = ['Deposit', 'Date', 'Devotee', 'Mobile', 'Temple', 'Waste', 'Kg', 'Points', 'Charge', 'Status', 'Reason']
  const rows = deposits.map((deposit) => [
    deposit.id,
    dateTimeLabel(deposit.at),
    deposit.name,
    maskMobile(deposit.mobile),
    temples.find((temple) => temple.id === deposit.templeId)?.name ?? '',
    deposit.waste,
    deposit.kg,
    deposit.points,
    deposit.charge,
    deposit.synced ? deposit.status : 'queued',
    deposit.reason,
  ])
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
}

export const downloadText = (filename: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
