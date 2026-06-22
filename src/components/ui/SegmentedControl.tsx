import { COLORS } from '@/lib/constants'

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div className="flex items-center gap-1 rounded-lg p-1"
      style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border-subtle)' }}>
      {options.map((opt) => (
        <button type="button" key={opt.value}
          onClick={() => onChange(opt.value)}
          className="px-3 py-1 rounded-md text-sm font-medium transition-colors"
          style={{
            background: value === opt.value ? COLORS.BG_SECONDARY : 'transparent',
            color: value === opt.value ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY,
            boxShadow: value === opt.value ? 'var(--shadow-card)' : 'none',
          }}>
          {opt.label}
        </button>
      ))}
    </div>
  )
}
