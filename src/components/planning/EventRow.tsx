import { CheckCircle2, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { type PlanningEvent, getTechColor } from '@/lib/planningUtils'

interface EventRowProps {
  event:    PlanningEvent
  isLast:   boolean
  onSelect?: (event: PlanningEvent) => void
}

export default function EventRow({ event, isLast, onSelect }: EventRowProps) {
  const navigate  = useNavigate()
  const techColor = getTechColor(event.technicien).color
  const dotColor  = event.statusColor

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)' }}>
      <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => onSelect ? onSelect(event) : (event.link && navigate(event.link))}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{event.title}</p>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>{event.subtitle}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {event.plannedTime && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                {event.plannedTime}
              </span>
            )}
            {event.technicien && event.technicien !== '—' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                {event.technicien}
              </span>
            )}
            {event.meteo === 'pluie' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: '#EFF6FF', color: '#3B82F6' }}>
                🌧 Pluie
              </span>
            )}
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
          style={{ background: event.statusBg, color: event.statusColor }}>
          {event.statusLabel}
        </span>
        {event.isDone
          ? <CheckCircle2 size={18} className="shrink-0" style={{ color: techColor }} />
          : <ChevronRight size={15} className="shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
        }
      </button>
    </div>
  )
}
