import { Edit2, Trash2 } from 'lucide-react'
import { COLORS } from '@/lib/constants'

export function FicheDeVieTimelineRow({ icon, iconBg, iconColor, date, title, subtitle, badge, isLast, onDelete, onEdit }: {
  icon: React.ReactNode
  iconBg: string; iconColor: string
  date: string
  title: string
  subtitle?: string
  badge: { label: string; bg: string; color: string } | null
  isLast: boolean
  onDelete?: () => void
  onEdit?: () => void
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 group"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)' }}>
      <div className="size-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: COLORS.TEXT_PRIMARY }}>{title}</p>
        {subtitle && (
          <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.TEXT_SECONDARY }}>{subtitle}</p>
        )}
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{date}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0 self-start mt-0.5">
        {badge && (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: badge.bg, color: badge.color }}>
            {badge.label}
          </span>
        )}
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button type="button" onClick={onEdit} aria-label="Modifier" className="p-1 rounded"
                style={{ color: COLORS.TEXT_SECONDARY }} title="Modifier">
                <Edit2 size={13} />
              </button>
            )}
            {onDelete && (
              <button type="button" onClick={onDelete} aria-label="Supprimer" className="p-1 rounded"
                style={{ color: COLORS.DANGER }} title="Supprimer">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
