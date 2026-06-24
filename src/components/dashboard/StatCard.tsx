import { m } from 'framer-motion'
import { COLORS } from '@/lib/constants'


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
  const color = danger
    ? COLORS.DANGER
    : warning
    ? COLORS.WARNING
    : accent
    ? COLORS.ACCENT
    : COLORS.TEXT_PRIMARY

  const gradient = COLORS.BG_SECONDARY

  return (
    <m.div
      whileHover={onClick ? { y: -2, scale: 1.01, boxShadow: '0 8px 24px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)' } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onClick={onClick}
      className={`rounded-xl p-5 select-none ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        background: gradient,
        border: '1px solid var(--color-border-subtle)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>{label}</p>
      <p className="text-2xl font-bold leading-none mb-1.5" style={{ color, letterSpacing: '-0.5px' }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{sub}</p>}
    </m.div>
  )
}

export { SectionTitle } from './SectionTitle'
export { EmptyCard } from './EmptyCard'
