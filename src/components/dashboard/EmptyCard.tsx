import { COLORS } from '@/lib/constants'

export function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl px-5 py-8 text-center"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)' }}>
      <p className="text-sm" style={{ color: COLORS.TEXT_SECONDARY }}>{children}</p>
    </div>
  )
}
