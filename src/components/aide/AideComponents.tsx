import { AlertTriangle, ChevronRight } from 'lucide-react'
import { COLORS } from '@/lib/constants'


export function Section({ icon: Icon, title, children }: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl p-6"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="size-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--color-accent-light)' }}>
          <Icon size={18} strokeWidth={1.8} style={{ color: COLORS.ACCENT }} />
        </div>
        <h2 className="text-base font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

export function Step({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="size-5 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5"
        style={{ background: COLORS.ACCENT, color: 'white' }}>
        {num}
      </span>
      <p className="text-sm leading-relaxed" style={{ color: COLORS.TEXT_PRIMARY }}>
        {children}
      </p>
    </div>
  )
}

export function StatusBadge({ bg, color, dot, label, desc }: {
  bg: string; color: string; dot: string; label: string; desc: string
}) {
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0"
        style={{ background: bg, color }}>
        <span className="size-1.5 rounded-full shrink-0" style={{ background: dot }} />
        {label}
      </span>
      <p className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>{desc}</p>
    </div>
  )
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 mt-4 px-3 py-2.5 rounded-lg"
      style={{ background: 'var(--color-warning-light)', border: '1px solid var(--color-warning)20' }}>
      <AlertTriangle size={15} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: COLORS.WARNING }} />
      <p className="text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>{children}</p>
    </div>
  )
}

export function Tip({ icon: Icon = ChevronRight, children }: { icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 px-3 py-2.5 rounded-lg" style={{ background: 'var(--color-accent-light)' }}>
      <Icon size={15} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: COLORS.ACCENT }} />
      <p className="text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>{children}</p>
    </div>
  )
}

export function Divider() {
  return <div style={{ borderTop: '1px solid var(--color-border-subtle)' }} />
}
