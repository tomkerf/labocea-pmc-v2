import type { RapportItem } from '@/hooks/useDashboardStats'
import { COLORS } from '@/lib/constants'

interface RapportClientGroupProps {
  clientNom: string
  siteEntries: [string, RapportItem[]][]
  renderRow: (r: RapportItem, isLast: boolean) => React.ReactNode
}

export default function RapportClientGroup({ clientNom, siteEntries, renderRow }: RapportClientGroupProps) {
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--color-border-subtle)', background: COLORS.BG_TERTIARY }}>
        <p className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>{clientNom}</p>
      </div>
      {siteEntries.map(([siteNom, rows], si) => (
        <div key={siteNom}>
          {siteEntries.length > 1 && (
            <div className="px-4 py-1.5" style={{
              borderBottom: '1px solid var(--color-border-subtle)',
              borderTop: si > 0 ? '1px solid var(--color-border-subtle)' : 'none',
              background: COLORS.BG_PRIMARY,
            }}>
              <p className="text-[11px] font-medium uppercase" style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>{siteNom}</p>
            </div>
          )}
          {rows.map((r, i) => {
            const isLast = si === siteEntries.length - 1 && i === rows.length - 1
            return renderRow(r, isLast)
          })}
        </div>
      ))}
    </div>
  )
}
