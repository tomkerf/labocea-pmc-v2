import { COLORS } from '@/lib/constants'

export function EditRow({ label, value, placeholder, onChange, hint }: {
  label: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
      <div className="flex items-center gap-4">
        <label className="text-sm shrink-0" style={{ color: COLORS.TEXT_SECONDARY, minWidth: 80 }}>
          {label}
        </label>
        <input
          type="text"
          aria-label={label}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-sm bg-transparent outline-none"
          style={{ color: COLORS.TEXT_PRIMARY }}
        />
      </div>
      {hint && (
        <p className="text-xs mt-1 ml-[88px]" style={{ color: 'var(--color-text-tertiary)' }}>{hint}</p>
      )}
    </div>
  )
}
