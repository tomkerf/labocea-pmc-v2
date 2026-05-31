export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] p-5"
      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      {children}
    </div>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide mb-4"
      style={{ color: 'var(--color-text-tertiary)' }}>
      {children}
    </p>
  )
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold mb-1"
      style={{ color: 'var(--color-text-secondary)' }}>
      {children}
    </label>
  )
}

export function TextInput({ value, onChange, placeholder, 'aria-label': ariaLabel }: { value: string; onChange: (v: string) => void; placeholder?: string; 'aria-label'?: string }) {
  return (
    <input
      type="text" value={value} placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder ?? 'Champ texte'}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg text-sm"
      style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', outline: 'none' }}
    />
  )
}

export function NumInput({ value, onChange, unit, placeholder, 'aria-label': ariaLabel }: { value: string; onChange: (v: string) => void; unit?: string; placeholder?: string; 'aria-label'?: string }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number" inputMode="decimal" value={value} placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder ?? 'Valeur numérique'}
        onChange={e => onChange(e.target.value)}
        className="flex-1 px-3 py-2.5 rounded-lg text-right text-base font-semibold"
        style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', outline: 'none' }}
      />
      {unit && <span className="text-sm w-8 shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>{unit}</span>}
    </div>
  )
}

export function StatusBadge({ conforme }: { conforme: boolean | null }) {
  if (conforme === null) return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
      ⏳ Non vérifié
    </span>
  )
  return conforme
    ? <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>✓ Conforme</span>
    : <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>✕ Non conforme</span>
}

export function ResultRow({ label, val, ok }: { label: string; val: string; ok?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2.5 px-4"
      style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
        {val}
        {ok !== undefined && <span>{ok ? '✅' : '❌'}</span>}
      </span>
    </div>
  )
}

export function ResultBox({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] overflow-hidden mt-4"
      style={{ border: `1px solid ${ok ? 'var(--color-success)' : 'var(--color-danger)'}`, background: ok ? 'var(--color-success-light)' : 'var(--color-danger-light)' }}>
      <div className="px-4 py-2.5 font-bold text-sm"
        style={{ color: ok ? 'var(--color-success)' : 'var(--color-danger)' }}>
        {ok ? '✅ CONFORME' : '❌ NON CONFORME'}
      </div>
      <div className="rounded-b-[var(--radius-md)] overflow-hidden"
        style={{ background: 'var(--color-bg-secondary)' }}>
        {children}
      </div>
    </div>
  )
}

export function NormInfo({ text }: { text: string }) {
  return (
    <p className="text-xs px-3 py-2 rounded-lg mb-4"
      style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
      {text}
    </p>
  )
}
