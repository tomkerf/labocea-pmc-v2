import type { RapportItem } from '@/hooks/useDashboardStats'

interface RapportClientGroupProps {
  clientNom: string
  siteEntries: [string, RapportItem[]][]
  renderRow: (r: RapportItem, isLast: boolean) => React.ReactNode
}

export default function RapportClientGroup({ clientNom, siteEntries, renderRow }: RapportClientGroupProps) {
  return (
    <div className="rounded-2xl overflow-hidden bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)]">
      <div className="px-4 py-3 bg-[var(--color-bg-primary)] border-b border-[var(--color-border-subtle)]">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">{clientNom}</p>
      </div>
      {siteEntries.map(([siteNom, rows], si) => (
        <div key={siteNom}>
          {siteEntries.length > 1 && (
            <div className="px-4 py-1.5 bg-[var(--color-bg-primary)]/45 border-b border-[var(--color-border-subtle)]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">{siteNom}</p>
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
