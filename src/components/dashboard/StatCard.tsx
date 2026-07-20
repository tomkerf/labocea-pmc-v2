import { m } from 'framer-motion'

interface StatCardProps {
  value: string | number
  label: string
  sub?: string
  accent?: boolean
  warning?: boolean
  danger?: boolean
  onClick?: () => void
}

export function StatCard({ value, label, sub, accent, warning, danger, onClick }: StatCardProps) {
  const cardClass = "bg-[var(--color-bg-secondary)] border-[var(--color-border-subtle)]"
  let valueClass = "text-[var(--color-text-primary)]"

  if (danger) {
    valueClass = "text-[var(--color-danger)]"
  } else if (warning) {
    valueClass = "text-[var(--color-warning)]"
  } else if (accent) {
    valueClass = "text-[var(--color-accent)]"
  }

  return (
    <m.div
      whileHover={onClick ? { y: -2, scale: 1.01, boxShadow: '0 12px 28px -12px rgba(30,41,59,0.16), 0 2px 4px rgba(30,41,59,0.04)' } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onClick={onClick}
      className={`rounded-2xl p-4.5 select-none border shadow-[var(--shadow-card)] transition-all ${cardClass} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <p className="text-[10px] font-semibold uppercase mb-2 leading-tight tracking-wider text-[var(--color-text-secondary)]" style={{ letterSpacing: '0.08em' }}>{label}</p>
      <p className={`text-[28px] font-bold leading-none mb-1.5 ${valueClass}`} style={{ letterSpacing: '-0.03em' }}>{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-secondary)]">{sub}</p>}
    </m.div>
  )
}

export { SectionTitle } from './SectionTitle'
export { EmptyCard } from './EmptyCard'
