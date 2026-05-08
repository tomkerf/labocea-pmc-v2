import { Plus } from 'lucide-react'
import {
  type PlanningEvent,
  JOURS_COURT, MOIS_LONG,
  toISO, sameDay,
  groupByClient, filterEvents,
} from '@/lib/planningUtils'
import EventPill from '@/components/planning/EventPill'

interface MonthViewProps {
  monthGrid:            (Date | null)[]
  today:                Date
  holidays:             Record<string, string>
  eventsByDate:         Record<string, PlanningEvent[]>
  filterTech:           string
  filterRetard:         boolean
  isDragging:           boolean
  handleDragMouseDown:  (e: React.MouseEvent, dateStr: string) => void
  handleDragMouseEnter: (dateStr: string) => void
  handleDragMouseUp:    (e: React.MouseEvent) => void
  setIsDragging:        (v: boolean) => void
  setDragStart:         (v: string | null) => void
  setDragEnd:           (v: string | null) => void
  handleSelectEvent:    (event: PlanningEvent, dateStr: string) => void
  goToDay:              (dateStr: string) => void
  setCtxMenu:           (v: { dateStr: string; x: number; y: number } | null) => void
  isInDrag:             (dateStr: string) => boolean
}

export default function MonthView({
  monthGrid, today, holidays, eventsByDate,
  filterTech, filterRetard,
  isDragging, handleDragMouseDown, handleDragMouseEnter, handleDragMouseUp,
  setIsDragging, setDragStart, setDragEnd,
  handleSelectEvent, goToDay, setCtxMenu, isInDrag,
}: MonthViewProps) {

  function filteredForDay(dateStr: string): PlanningEvent[] {
    return groupByClient(filterEvents(eventsByDate[dateStr] ?? [], filterTech, filterRetard))
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* En-têtes jours */}
      <div className="grid grid-cols-5 shrink-0"
        style={{ borderBottom:'1px solid var(--color-border-subtle)' }}>
        {JOURS_COURT.map((j,i) => (
          <div key={j} className="py-2 text-center text-[10px] font-medium uppercase"
            style={{ color:'var(--color-text-tertiary)', letterSpacing:'0.04em',
              borderRight:i<4?'1px solid var(--color-border-subtle)':'none' }}>
            {j}
          </div>
        ))}
      </div>
      {/* Grille */}
      <div className="grid grid-cols-5 flex-1 overflow-y-auto select-none"
        style={{ gridAutoRows:'1fr' }}
        onMouseUp={handleDragMouseUp}
        onMouseLeave={() => { if (isDragging) { setIsDragging(false); setDragStart(null); setDragEnd(null) } }}>
        {monthGrid.map((day,i) => {
          if (!day) return (
            <div key={i} style={{
              borderRight:(i%5)<4?'1px solid var(--color-border-subtle)':'none',
              borderBottom:'1px solid var(--color-border-subtle)',
              background:'rgba(0,0,0,0.015)',
            }} />
          )
          const dateStr = toISO(day)
          const evts = filteredForDay(dateStr)
          const isToday = sameDay(day,today)
          const inDrag = isInDrag(dateStr)
          const holidayName = holidays[dateStr]
          const hasCongeM   = eventsByDate[dateStr]?.some(e => e.evenementData?.type === 'conge') ?? false
          const MAX = 3
          return (
            <div key={i}
              className="p-1 flex flex-col gap-0.5 cursor-crosshair group"
              onMouseDown={e => handleDragMouseDown(e, dateStr)}
              onMouseEnter={() => handleDragMouseEnter(dateStr)}
              onContextMenu={e => { e.preventDefault(); setCtxMenu({ dateStr, x: e.clientX, y: e.clientY }) }}
              style={{
                position: 'relative',
                borderRight:(i%5)<4?'1px solid var(--color-border-subtle)':'none',
                borderBottom:'1px solid var(--color-border-subtle)',
                background: inDrag ? 'rgba(0,113,227,0.1)' : 'var(--color-bg-secondary)',
                outline: inDrag ? '2px solid rgba(0,113,227,0.3)' : 'none',
                outlineOffset: '-1px',
                minHeight: 90,
                userSelect: 'none',
              }}>
              {/* Overlay jour férié */}
              {holidayName && !inDrag && <div className="holiday-overlay" />}
              {/* Overlay congé/RTT */}
              {!holidayName && hasCongeM && !inDrag && <div className="conge-overlay" />}
              <div className="flex items-center justify-between mb-0.5 px-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-[22px] h-[22px] flex items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{
                      background: isToday ? '#FF3B30' : holidayName ? 'rgba(255,59,48,0.12)' : 'transparent',
                      color: isToday ? 'white' : holidayName ? '#FF3B30' : 'var(--color-text-secondary)',
                    }}>
                    {day.getDate()}
                  </span>
                  {day.getDate()===1 && !holidayName && (
                    <span className="text-[10px] font-normal" style={{ color:'var(--color-text-tertiary)' }}>
                      {MOIS_LONG[day.getMonth()].slice(0,3).toLowerCase()}.
                    </span>
                  )}
                  {holidayName && (
                    <span className="text-[9px] font-medium truncate max-w-[70px]"
                      style={{ color: '#FF3B30' }}>
                      {holidayName}
                    </span>
                  )}
                </span>
                <Plus size={10} className="opacity-25 group-hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--color-text-tertiary)' }} />
              </div>
              {evts.slice(0,MAX).map(evt => <EventPill key={evt.id} event={evt} compact dateStr={dateStr} onExpand={() => goToDay(dateStr)} onSelect={e => handleSelectEvent(e, dateStr)} />)}
              {evts.length>MAX && (
                <span className="text-[10px] pl-1 mt-0.5" style={{ color:'var(--color-text-tertiary)' }}>
                  +{evts.length-MAX} autres
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
