import type { ReactNode } from 'react'
import { m } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

type Tone = 'accent' | 'success' | 'warning' | 'danger'

const TONE_CLASSES: Record<Tone, { icon: string; iconBg: string; value: string; pillBg: string; pillText: string }> = {
  accent:  { icon: 'text-[var(--color-accent)]',  iconBg: 'bg-[var(--color-accent-light)]',  value: 'text-[var(--color-accent)]',  pillBg: 'bg-[var(--color-accent-light)]',  pillText: 'text-[var(--color-accent)]' },
  success: { icon: 'text-[var(--color-success)]', iconBg: 'bg-[var(--color-success-light)]', value: 'text-[var(--color-success)]', pillBg: 'bg-[var(--color-success-light)]', pillText: 'text-[var(--color-success)]' },
  warning: { icon: 'text-[var(--color-warning)]', iconBg: 'bg-[var(--color-warning-light)]', value: 'text-[var(--color-warning)]', pillBg: 'bg-[var(--color-warning-light)]', pillText: 'text-[var(--color-warning)]' },
  danger:  { icon: 'text-[var(--color-danger)]',  iconBg: 'bg-[var(--color-danger-light)]',  value: 'text-[var(--color-danger)]',  pillBg: 'bg-[var(--color-danger-light)]',  pillText: 'text-[var(--color-danger)]' },
}

interface StatCardProps {
  value: string | number
  label: string
  sub?: string
  icon: ReactNode
  tone?: Tone
  pill?: string
  progressPct?: number
  onClick?: () => void
}

export function StatCard({ value, label, sub, icon, tone = 'accent', pill, progressPct, onClick }: StatCardProps) {
  const t = TONE_CLASSES[tone]

  return (
    <m.div
      whileHover={onClick ? { y: -2, scale: 1.01, boxShadow: '0 12px 28px -12px rgba(30,41,59,0.16), 0 2px 4px rgba(30,41,59,0.04)' } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onClick={onClick}
      className={`rounded-[var(--radius-md)] p-[15px] select-none border shadow-[var(--shadow-card)] transition-all bg-[var(--color-bg-secondary)] border-[var(--color-border-subtle)] ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`size-[30px] rounded-[9px] flex items-center justify-center shrink-0 ${t.iconBg} ${t.icon}`}>
          {icon}
        </div>
        {progressPct !== undefined ? (
          <svg width="46" height="14" viewBox="0 0 46 14" aria-hidden="true">
            <rect x="0" y="5" width="46" height="4" rx="2" className="fill-[var(--color-border)]" />
            <rect x="0" y="5" width={Math.max(0, Math.min(100, progressPct)) / 100 * 46} height="4" rx="2" className={tone === 'warning' ? 'fill-[var(--color-warning)]' : 'fill-[var(--color-success)]'} />
          </svg>
        ) : pill ? (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${t.pillBg} ${t.pillText}`}>
            {pill}
          </span>
        ) : onClick ? (
          <ChevronRight size={14} strokeWidth={2} className="text-[var(--color-text-tertiary)]" />
        ) : null}
      </div>
      <p className={`text-[28px] font-bold leading-none mb-1.5 ${t.value}`} style={{ letterSpacing: '-0.03em' }}>{value}</p>
      <p className="text-[12.5px] font-semibold leading-tight text-[var(--color-text-primary)]">{label}</p>
      {sub && <p className="text-[11.5px] mt-0.5 text-[var(--color-text-secondary)]">{sub}</p>}
    </m.div>
  )
}

export { SectionTitle } from './SectionTitle'
export { EmptyCard } from './EmptyCard'
