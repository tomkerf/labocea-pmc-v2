import { useState } from 'react'
import { CheckCircle2, ChevronRight, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { type PlanningEvent, getTechColor } from '@/lib/planningUtils'

interface EventRowProps {
  event:    PlanningEvent
  isLast:   boolean
  onSelect?: (event: PlanningEvent) => void
}

export default function EventRow({ event, isLast, onSelect }: EventRowProps) {
  const navigate  = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)

  const isGrouped = !!(event.count && event.count > 1 && event.subEvents && event.subEvents.length > 1)
  const techColor = getTechColor(event.technicien).color
  const dotColor  = event.statusColor

  const handleParentClick = () => {
    if (isGrouped) {
      setIsExpanded(!isExpanded)
    } else {
      if (onSelect) {
        onSelect(event)
      } else if (event.link) {
        navigate(event.link)
      }
    }
  }

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)' }}>
      <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer transition-colors hover:bg-[var(--color-bg-tertiary)]"
        onClick={handleParentClick}>
        {isGrouped ? (
          isExpanded ? (
            <ChevronDown size={16} className="shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
          ) : (
            <ChevronRight size={16} className="shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
          )
        ) : (
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
        )}
        
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

        <div className="flex items-center gap-2 shrink-0">
          {isGrouped && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
              ×{event.count}
            </span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
            style={{ background: event.statusBg, color: event.statusColor }}>
            {event.statusLabel}
          </span>
          {!isGrouped && (
            event.isDone ? (
              <CheckCircle2 size={18} className="shrink-0" style={{ color: techColor }} />
            ) : (
              <ChevronRight size={15} className="shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
            )
          )}
        </div>
      </button>

      {isGrouped && isExpanded && event.subEvents && (
        <div className="pl-9 pr-4 pb-2 flex flex-col" style={{ background: 'var(--color-bg-primary)' }}>
          {event.subEvents.map((sub, idx) => {
            const subTechColor = getTechColor(sub.technicien).color
            return (
              <button
                key={sub.id}
                onClick={() => onSelect && onSelect(sub)}
                className="w-full flex items-center justify-between gap-3 py-2.5 text-left cursor-pointer transition-colors hover:bg-[rgba(0,0,0,0.03)]"
                style={{
                  borderBottom: idx === event.subEvents!.length - 1 ? 'none' : '1px solid var(--color-border-subtle)',
                  minHeight: 44,
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sub.statusColor }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {sub.subtitle}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {sub.frequence && (
                        <span className="text-[9px] px-1 rounded shrink-0 font-medium"
                          style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)' }}>
                          {sub.frequence}
                        </span>
                      )}
                      {sub.technicien && sub.technicien !== '—' && (
                        <span className="text-[9px] px-1 rounded shrink-0 font-medium"
                          style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)' }}>
                          {sub.technicien}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: sub.statusBg, color: sub.statusColor }}>
                    {sub.statusLabel}
                  </span>
                  {sub.isDone ? (
                    <CheckCircle2 size={16} className="shrink-0" style={{ color: subTechColor }} />
                  ) : (
                    <ChevronRight size={14} className="shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

