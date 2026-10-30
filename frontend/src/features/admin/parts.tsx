import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/ui/Icon'
import { Card, EmptyState, Sheet } from '../../components/ui/kit'
import useMediaQuery from '../../hooks/useMediaQuery'
import { useT } from '../../store/appStore'

export const AdminPage = ({
  title,
  actions,
  children,
  backTo,
  backLabel,
}: {
  title: string
  actions?: ReactNode
  children: ReactNode
  backTo?: string
  backLabel?: string
}) => (
  <div className="flex flex-col gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        {backTo && (
          <Link
            to={backTo}
            className="mb-1 inline-flex min-h-8 items-center gap-1 text-sm text-muted hover:text-ink"
          >
            <Icon name="back" size={16} />
            {backLabel}
          </Link>
        )}
        <h1 className="font-display text-3xl leading-tight md:text-4xl">
          {title}
        </h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
    {children}
  </div>
)

export type Column<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  align?: 'right'
}

type DataTableProps<T> = {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  selectedKey?: string | null
  emptyTitle: string
  label: string
}

export const DataTable = <T,>({
  rows,
  columns,
  rowKey,
  onRowClick,
  selectedKey,
  emptyTitle,
  label,
}: DataTableProps<T>) => {
  if (rows.length === 0) return <EmptyState title={emptyTitle} />

  const [primary, ...others] = columns

  return (
    <>
      <div className="relative hidden overflow-x-auto rounded-3xl border border-line bg-surface md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr className="border-b border-line">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`whitespace-nowrap px-4 py-3 text-sm font-medium text-muted ${
                    column.align === 'right' ? 'text-right' : ''
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = rowKey(row)
              const selected = key === selectedKey

              return (
                <tr
                  key={key}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-selected={onRowClick ? selected : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === 'Enter') onRowClick(row)
                        }
                      : undefined
                  }
                  className={`border-b border-line last:border-b-0 ${
                    onRowClick ? 'cursor-pointer hover:bg-raised' : ''
                  } ${selected ? 'bg-raised' : ''}`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 ${
                        column.align === 'right' ? 'text-right' : ''
                      }`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden" aria-label={label}>
        {rows.map((row) => {
          const key = rowKey(row)
          const body = (
            <>
              <div className="font-semibold">{primary.render(row)}</div>
              <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5">
                {others.map((column) => (
                  <div key={column.key} className="contents">
                    <dt className="text-sm text-muted">{column.header}</dt>
                    <dd className="flex justify-end text-right">
                      {column.render(row)}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )

          return (
            <li key={key}>
              {onRowClick ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onRowClick(row)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') onRowClick(row)
                  }}
                  className="w-full cursor-pointer rounded-3xl border border-line bg-surface p-4 text-left hover:border-muted"
                >
                  {body}
                </div>
              ) : (
                <div className="rounded-3xl border border-line bg-surface p-4">
                  {body}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

export const MasterDetail = ({
  list,
  detail,
  title,
  open,
  onClose,
  footer,
  placeholder,
}: {
  list: ReactNode
  detail: ReactNode
  title: string
  open: boolean
  onClose: () => void
  footer?: ReactNode
  placeholder: string
}) => {
  const wide = useMediaQuery('(min-width: 1280px)')

  if (!wide) {
    return (
      <>
        {list}
        <Sheet open={open} title={title} onClose={onClose} footer={footer}>
          {detail}
        </Sheet>
      </>
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_26rem] items-start gap-5">
      <div className="min-w-0">{list}</div>
      <div className="sticky top-24">
        {open ? (
          <Card className="flex max-h-[calc(100vh-7rem)] flex-col gap-4 overflow-y-auto">
            <h2 className="text-xl font-bold">{title}</h2>
            {detail}
            {footer}
          </Card>
        ) : (
          <EmptyState title={placeholder} />
        )}
      </div>
    </div>
  )
}

export const HistoryList = ({ items }: { items: string[] }) => {
  const t = useT()

  return (
    <ul className="text-sm text-muted">
      {items.map((item, index) => {
        const split = item.indexOf(', ')
        const text =
          split === -1
            ? t(item)
            : `${t(item.slice(0, split))}${item.slice(split)}`

        return (
          <li key={`${item}${index}`} className="py-0.5">
            {text}
          </li>
        )
      })}
    </ul>
  )
}

export const PhotoTile = ({ label }: { label: string }) => (
  <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-line bg-raised p-2 text-center text-sm text-muted">
    {label}
  </div>
)

export const DetailRow = ({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-b-0">
    <span className="text-sm text-muted">{label}</span>
    <span className="min-w-0 text-right">{children}</span>
  </div>
)

export const SearchBox = ({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) => (
  <label className="relative block w-full max-w-full sm:w-64">
    <span className="sr-only">{placeholder}</span>
    <Icon
      name="search"
      size={18}
      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
    />
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="min-h-11 w-full rounded-full border border-line bg-night pl-10 pr-4 text-ink outline-none focus:border-marigold"
    />
  </label>
)

export const NoteBar = ({ children }: { children: ReactNode }) => (
  <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">
    {children}
  </p>
)
