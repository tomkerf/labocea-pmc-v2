import { Calendar } from 'lucide-react'
import { COLORS } from '@/lib/constants'

export function CompteCalendarSection({ feedUrl, copied, onCopy }: {
  feedUrl: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="rounded-xl overflow-hidden mb-4"
      style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} style={{ color: COLORS.ACCENT }} />
          <span className="text-sm font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>Synchronisation agenda</span>
        </div>
        <p className="text-xs mb-3" style={{ color: COLORS.TEXT_SECONDARY }}>
          Abonnez-vous à votre planning depuis Google Agenda → Autres agendas → Via une URL.
        </p>
        <div className="flex items-center gap-2">
          <input readOnly value={feedUrl}
            aria-label="URL de synchronisation agenda"
            className="flex-1 text-xs px-3 py-2 rounded-lg truncate"
            style={{ background: COLORS.BG_TERTIARY, border: '1px solid var(--color-border)', color: COLORS.TEXT_SECONDARY }} />
          <button type="button" onClick={onCopy}
            className="text-xs px-3 py-2 rounded-lg font-medium"
            style={{ background: copied ? 'var(--color-success-light)' : 'var(--color-accent-light)', color: copied ? COLORS.SUCCESS : COLORS.ACCENT, whiteSpace: 'nowrap' }}>
            {copied ? 'Copié !' : 'Copier'}
          </button>
        </div>
      </div>
    </div>
  )
}
