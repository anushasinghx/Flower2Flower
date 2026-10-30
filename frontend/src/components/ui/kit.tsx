import {
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { Link } from 'react-router-dom'
import Icon, { type IconName } from './Icon'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-marigold text-marigold-ink hover:bg-[#f7b555]',
  secondary: 'border border-line bg-transparent text-ink hover:bg-surface',
  outline:
    'border border-marigold/70 bg-transparent text-marigold hover:bg-marigold/10',
  danger:
    'border border-sindoor/60 bg-transparent text-sindoor hover:bg-sindoor/10',
  ghost: 'bg-transparent text-muted hover:text-ink',
}

const buttonBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 text-center font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  full?: boolean
  icon?: IconName
}

export const Button = ({
  variant = 'primary',
  full,
  icon,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    className={`${buttonBase} ${buttonVariants[variant]} ${
      full ? 'w-full' : ''
    } ${className}`}
    {...rest}
  >
    {icon && <Icon name={icon} size={20} />}
    {children}
  </button>
)

type ButtonLinkProps = {
  to: string
  variant?: ButtonVariant
  full?: boolean
  icon?: IconName
  className?: string
  children: ReactNode
}

export const ButtonLink = ({
  to,
  variant = 'primary',
  full,
  icon,
  className = '',
  children,
}: ButtonLinkProps) => (
  <Link
    to={to}
    className={`${buttonBase} ${buttonVariants[variant]} ${
      full ? 'w-full' : ''
    } ${className}`}
  >
    {icon && <Icon name={icon} size={20} />}
    {children}
  </Link>
)

export const TextLink = ({
  to,
  children,
  className = '',
}: {
  to: string
  children: ReactNode
  className?: string
}) => (
  <Link
    to={to}
    className={`font-medium text-marigold underline underline-offset-4 hover:text-[#f7b555] ${className}`}
  >
    {children}
  </Link>
)

export const Card = ({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) => (
  <div
    className={`rounded-3xl border border-line bg-surface p-5 ${className}`}
  >
    {children}
  </div>
)

type Tone = 'neutral' | 'green' | 'marigold' | 'warning'

const toneClasses: Record<Tone, string> = {
  neutral: 'border-line text-muted',
  green: 'border-tulsi/40 text-tulsi',
  marigold: 'border-marigold/50 text-marigold',
  warning: 'border-sindoor/50 text-sindoor',
}

export const Pill = ({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) => (
  <span
    className={`inline-flex w-fit shrink-0 items-center rounded-full border px-3 py-0.5 text-sm font-medium ${toneClasses[tone]} ${className}`}
  >
    {children}
  </span>
)

type FieldProps = {
  label: string
  hint?: string
  error?: string
  children: (id: string) => ReactNode
}

export const Field = ({ label, hint, error, children }: FieldProps) => {
  const id = useId()

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      {children(id)}
      {error && (
        <p role="alert" className="text-sm text-sindoor">
          {error}
        </p>
      )}
      {hint && !error && <p className="text-sm text-muted">{hint}</p>}
    </div>
  )
}

const inputClass =
  'min-h-11 w-full rounded-2xl border border-line bg-night px-4 py-2.5 text-ink outline-none transition-colors focus:border-marigold'

export const TextInput = ({
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={`${inputClass} ${className}`} {...rest} />
)

export const Select = ({
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={`${inputClass} ${className}`} {...rest}>
    {children}
  </select>
)

export const TextArea = ({
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={`${inputClass} ${className}`} rows={3} {...rest} />
)

export const Toggle = ({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  disabled?: boolean
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-50 ${
      checked ? 'border-marigold bg-marigold' : 'border-line bg-raised'
    }`}
  >
    <span
      className={`absolute top-0.5 h-[1.375rem] w-[1.375rem] rounded-full transition-all ${
        checked ? 'left-[1.45rem] bg-marigold-ink' : 'left-0.5 bg-muted'
      }`}
    />
  </button>
)

export const CheckRow = ({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  children: ReactNode
}) => (
  <label className="flex cursor-pointer items-start gap-3 py-1">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-1 h-5 w-5 shrink-0 accent-[#f2a33a]"
    />
    <span>{children}</span>
  </label>
)

export const RadioRow = ({
  name,
  checked,
  onChange,
  children,
}: {
  name: string
  checked: boolean
  onChange: () => void
  children: ReactNode
}) => (
  <label className="flex min-h-11 cursor-pointer items-center gap-3">
    <input
      type="radio"
      name={name}
      checked={checked}
      onChange={onChange}
      className="h-5 w-5 shrink-0 accent-[#f2a33a]"
    />
    <span className="min-w-0 flex-1">{children}</span>
  </label>
)

export type TabOption<T extends string> = { value: T; label: string }

export const Segmented = <T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: TabOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
}) => (
  <div
    role="group"
    aria-label={label}
    className="grid auto-cols-fr grid-flow-col rounded-full border border-line bg-surface p-1"
  >
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        aria-pressed={value === option.value}
        onClick={() => onChange(option.value)}
        className={`min-h-11 rounded-full px-3 font-semibold transition-colors ${
          value === option.value
            ? 'bg-marigold text-marigold-ink'
            : 'text-muted hover:text-ink'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
)

export const Chips = <T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: TabOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
}) => (
  <div
    role="group"
    aria-label={label}
    className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1"
  >
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        aria-pressed={value === option.value}
        onClick={() => onChange(option.value)}
        className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${
          value === option.value
            ? 'border-marigold bg-marigold text-marigold-ink'
            : 'border-line text-muted hover:text-ink'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
)

export const Progress = ({
  value,
  label,
}: {
  value: number
  label: string
}) => (
  <div
    role="progressbar"
    aria-label={label}
    aria-valuenow={Math.round(value)}
    aria-valuemin={0}
    aria-valuemax={100}
    className="h-2.5 w-full overflow-hidden rounded-full bg-raised"
  >
    <div
      className="h-full rounded-full bg-marigold"
      style={{ width: `${value}%` }}
    />
  </div>
)

export const Steps = ({
  steps,
  current,
}: {
  steps: string[]
  current: number
}) => (
  <ol className="flex items-center gap-1.5 text-sm" aria-label="Progress">
    {steps.map((step, index) => {
      const done = index < current
      const active = index === current

      return (
        <li key={step} className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span
            className={`h-1 rounded-full ${
              done || active ? 'bg-marigold' : 'bg-raised'
            }`}
          />
          <span
            aria-current={active ? 'step' : undefined}
            className={`truncate ${active ? 'text-ink' : 'text-muted'}`}
          >
            {index + 1} {step}
          </span>
        </li>
      )
    })}
  </ol>
)

export const StatusList = ({
  steps,
  current,
  failed,
}: {
  steps: string[]
  current: number
  failed?: boolean
}) => (
  <ol className="flex flex-col">
    {steps.map((step, index) => {
      const done = index < current
      const active = index === current

      return (
        <li key={step} className="flex items-center gap-3 py-1.5">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
              done
                ? 'border-tulsi bg-tulsi text-marigold-ink'
                : active && failed
                  ? 'border-sindoor text-sindoor'
                  : active
                    ? 'border-marigold text-marigold'
                    : 'border-line text-muted'
            }`}
          >
            {done ? <Icon name="check" size={16} /> : index + 1}
          </span>
          <span className={done || active ? 'text-ink' : 'text-muted'}>
            {step}
          </span>
        </li>
      )
    })}
  </ol>
)

export const Sheet = ({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) => {
  useEffect(() => {
    if (!open) return

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previous = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-end justify-end md:items-stretch"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60"
      />
      <div className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border-t border-line bg-night md:max-h-none md:w-[30rem] md:rounded-none md:border-l md:border-t-0">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 className="min-w-0 truncate text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-muted hover:text-ink"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="safe-bottom border-t border-line p-4">{footer}</div>
        )}
      </div>
    </div>
  )
}

export const EmptyState = ({
  icon = 'leaf',
  title,
  children,
}: {
  icon?: IconName
  title: string
  children?: ReactNode
}) => (
  <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line px-6 py-10 text-center">
    <Icon name={icon} size={32} className="text-muted" />
    <p className="font-semibold">{title}</p>
    {children}
  </div>
)

export const InfoNote = ({ children }: { children: ReactNode }) => (
  <p className="rounded-2xl border border-line px-4 py-3 text-sm text-muted">
    {children}
  </p>
)
