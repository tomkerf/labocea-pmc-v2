interface StatCardProps {
  value: string | number
  label: string
  sub?: string
  accent?: boolean
  warning?: boolean
  danger?: boolean
}

export function StatCard({ value, label, sub, accent, warning, danger }: StatCardProps) {
  const color = danger
    ? 'var(--color-danger)'
    : warning
    ? 'var(--color-warning)'
    : accent
    ? 'var(--color-accent)'
    : 'var(--color-text-primary)'

  return (
    <div className="rounded-xl p-5"
      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      <p className="text-2xl font-bold mb-1" style={{ color, letterSpacing: '-0.5px' }}>{value}</p>
      <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{sub}</p>}
    </div>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase mb-3"
      style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
      {children}
    </h2>
  )
}

export function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl px-5 py-8 text-center"
      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>
      <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{children}</p>
    </div>
  )
}
