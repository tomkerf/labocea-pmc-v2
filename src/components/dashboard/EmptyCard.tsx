import type { ReactNode } from 'react'
import { COLORS } from '@/lib/constants'

export function EmptyCard({ children, icon }: { children: React.ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-xl px-5 py-8 flex flex-col items-center gap-2 text-center"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
      {icon && (
        <div className="size-9 rounded-full flex items-center justify-center"
          style={{ background: 'var(--color-accent-light)' }}>
          {icon}
        </div>
      )}
      <p className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>{children}</p>
    </div>
  )
}
