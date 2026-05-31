import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  type PlanningEvent, type BilanGroup, type AllDayItem,
  JOURS_COURT,
  toISO, sameDay,
  isMultiDay, sortEvts, filterEvents, groupByClient,
} from '@/lib/planningUtils'
import EventPill from '@/components/planning/EventPill'

interface WeekViewProps {
  weekDays:             Date[]
  today:                Date
  holidays:             Record<string, string>
  eventsByDate:         Record<string, PlanningEvent[]>
  bilanBand:            BilanGroup[][]
  allDayItems:          AllDayItem[]
  filterTech:           string
  filterRetard:         boolean
  showRain:             boolean
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

export default function WeekView({
  weekDays, today, holidays, eventsByDate,
  bilanBand, allDayItems,
  filterTech, filterRetard, showRain,
  isDragging, handleDragMouseDown, handleDragMouseEnter, handleDragMouseUp,
  setIsDragging, setDragStart, setDragEnd,
  handleSelectEvent, goToDay, setCtxMenu, isInDrag,
}: WeekViewProps) {

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  function toggleGroup(dateStr: string, clientId: string) {
    const key = `${dateStr}—${clientId}`
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function isGroupExpanded(dateStr: string, clientId: string) {
    return expandedGroups.has(`${dateStr}—${clientId}`)
  }

  function filteredForDayFlat(dateStr: string): PlanningEvent[] {
    return sortEvts(filterEvents(eventsByDate[dateStr] ?? [], filterTech, filterRetard).filter(e => e.evenementData?.type !== 'meteo'))
  }

  const allDayNumRows = allDayItems.length > 0
    ? Math.max(...allDayItems.map(s => s.row)) + 1
    : 0

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* En-têtes colonnes */}
      <div className="grid grid-cols-7 shrink-0"
        style={{ borderBottom:'1px solid var(--color-border-subtle)' }}>
        {weekDays.map((day,i) => {
          const isToday = sameDay(day,today)
          const dateStr = toISO(day)
          const holidayName = holidays[dateStr]
          const isRainyDay  = eventsByDate[dateStr]?.some(e => e.evenementData?.type === 'meteo') ?? false
          const isWeekend   = day.getDay() === 0 || day.getDay() === 6
          return (
            <div key={i} className="py-2 px-2 text-center relative overflow-hidden"
              style={{
                borderRight: i<6?'1px solid var(--color-border-subtle)':'none',
                background: holidayName ? 'rgba(255,59,48,0.04)' : isWeekend ? 'rgba(0,0,0,0.05)' : 'transparent',
              }}>
              {/* Overlay pluie dans l'en-tête */}
              {showRain && isRainyDay && <div className="rain-overlay opacity-30" />}
              <div className="text-[10px] font-medium uppercase mb-1"
                style={{ color:'var(--color-text-tertiary)', letterSpacing:'0.04em' }}>
                {JOURS_COURT[i]}
              </div>
              <div className="w-7 h-7 flex items-center justify-center rounded-full mx-auto text-sm font-semibold"
                style={{
                  background: isToday ? '#FF3B30' : holidayName ? 'rgba(255,59,48,0.12)' : 'transparent',
                  color: isToday ? 'white' : holidayName ? '#FF3B30' : 'var(--color-text-primary)',
                }}>
                {day.getDate()}
              </div>
              {holidayName && (
                <div className="text-[9px] mt-0.5 truncate px-0.5 font-medium"
                  style={{ color: '#FF3B30' }}>
                  {holidayName}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Bande bilan 24h — groupe J1+J2 avec bordure commune (colspan) ── */}
      {bilanBand.length > 0 && (
        <div className="shrink-0 animate-fade-in" style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-secondary)', padding: '3px 0', position: 'relative' }}>
          {/* Overlay weekend gris par colonne */}
          <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', pointerEvents: 'none' }}>
            {weekDays.map((day, i) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6
              return (
                <div key={i} style={{
                  height: '100%',
                  borderRight: i < 6 ? '1px solid var(--color-border-subtle)' : 'none',
                  background: isWeekend ? 'rgba(0,0,0,0.028)' : 'transparent',
                }} />
              )
            })}
          </div>
          <span style={{ position: 'absolute', top: '50%', left: 6, transform: 'translateY(-50%)', fontSize: 8, fontWeight: 600, letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', pointerEvents: 'none', userSelect: 'none', zIndex: 2 }}>Bilans 24h</span>
          {bilanBand.map((row, rowIdx) => {
            const wISOs = weekDays.map(toISO)
            return (
              <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 2px', position: 'relative', zIndex: 1 }}>
                {row.map((group, gIdx) => (
                  <div key={gIdx}
                    className="transition-all duration-200 hover:brightness-95"
                    style={{
                      gridColumn: `${group.colStart + 1} / ${group.colEnd + 2}`,
                      display: 'flex',
                      gap: 2,
                      border: `1px solid ${group.techColor}25`,
                      borderLeft: `3px solid ${group.techColor}`,
                      borderRadius: '5px',
                      padding: '2px 4px 2px 2px',
                      margin: '2px 4px',
                      background: `linear-gradient(90deg, ${group.techColor}12 0%, ${group.techColor}03 100%)`,
                    }}>
                    {group.items.map(item => (
                      <div key={item.event.id} style={{ flex: 1, minWidth: 0 }}>
                        <EventPill
                          event={item.event}
                          dateStr={wISOs[item.colIdx]}
                          onSelect={e => handleSelectEvent(e, wISOs[item.colIdx])}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Bande "toute la journée" — multi-jours (style Apple Calendar) ── */}
      {allDayItems.length > 0 && (
        <div className="shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-secondary)', padding: '3px 2px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gridTemplateRows: `repeat(${allDayNumRows}, 18px)`,
            gap: '2px 0',
          }}>
              {allDayItems.map(({ key, colStart, colEnd, row, bg, label, badge, onClick, tooltip }) => (
                <button type="button"
                  key={key}
                  onMouseDown={e => e.stopPropagation()}
                  onClick={onClick}
                  className="text-left px-2 rounded flex items-center gap-1 truncate"
                  style={{
                    gridColumn: `${colStart + 1} / ${colEnd + 2}`,
                    gridRow: row + 1,
                    background: bg,
                    marginLeft: 1,
                    marginRight: 1,
                  }}
                  title={tooltip}
                >
                  <span className="text-[11px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
                  {badge && (
                    <span className="shrink-0 text-[9px] opacity-60" style={{ color: 'var(--color-text-secondary)' }}>{badge}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
      )}

      {/* Colonnes événements */}
      <div className="grid grid-cols-7 flex-1 overflow-y-auto select-none"
        onMouseUp={handleDragMouseUp}
        onMouseLeave={() => { if (isDragging) { setIsDragging(false); setDragStart(null); setDragEnd(null) } }}>
        {weekDays.map((day,i) => {
          const dateStr  = toISO(day)
          const evts     = groupByClient(filteredForDayFlat(dateStr).filter(e => !isMultiDay(e)))
          const inDrag   = isInDrag(dateStr)
          const isHoliday = !!holidays[dateStr]
          const hasConge  = eventsByDate[dateStr]?.some(e => e.evenementData?.type === 'conge') ?? false
          const isRainyDay = eventsByDate[dateStr]?.some(e => e.evenementData?.type === 'meteo') ?? false
          const isWeekend  = day.getDay() === 0 || day.getDay() === 6
          return (
            <div key={i}
              className="p-1.5 flex flex-col gap-1 cursor-crosshair group"
              onMouseDown={e => handleDragMouseDown(e, dateStr)}
              onMouseEnter={() => handleDragMouseEnter(dateStr)}
              onContextMenu={e => { e.preventDefault(); setCtxMenu({ dateStr, x: e.clientX, y: e.clientY }) }}
              style={{
                position: 'relative',
                borderRight: i<6?'1px solid var(--color-border-subtle)':'none',
                background: inDrag ? 'rgba(0,113,227,0.1)' : isWeekend ? 'rgba(0,0,0,0.012)' : 'var(--color-bg-secondary)',
                outline: inDrag ? '2px solid rgba(0,113,227,0.3)' : 'none',
                outlineOffset: '-1px',
                minHeight: 120,
                userSelect: 'none',
              }}>
              {/* Overlay jour férié ou week-end */}
              {(isHoliday || isWeekend) && !inDrag && <div className="holiday-overlay" />}
              {/* Overlay congé/RTT */}
              {!isHoliday && hasConge && !inDrag && <div className="conge-overlay" />}
              {/* Overlay pluie */}
              {showRain && isRainyDay && !inDrag && <div className="rain-overlay" />}
              {evts.flatMap(evt => {
                const isGrouped = (evt.count ?? 0) > 1
                if (isGrouped && isGroupExpanded(dateStr, evt.clientId ?? evt.id)) {
                  const groupKey = evt.clientId ?? evt.id
                  return [
                    ...(evt.subEvents ?? []).map(sub => (
                      <EventPill key={sub.id} event={sub} dateStr={dateStr} onSelect={e => handleSelectEvent(e, dateStr)} />
                    )),
                    <button type="button"
                      key={`collapse-${groupKey}`}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); toggleGroup(dateStr, groupKey) }}
                      className="w-full text-center text-[9px] font-medium rounded py-[2px]"
                      style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-subtle)' }}
                    >
                      ▲ replier
                    </button>
                  ]
                }
                return [
                  <EventPill
                    key={evt.id}
                    event={evt}
                    dateStr={dateStr}
                    expanded={false}
                    onExpand={isGrouped ? () => toggleGroup(dateStr, evt.clientId ?? evt.id) : () => goToDay(dateStr)}
                    onSelect={e => handleSelectEvent(e, dateStr)}
                  />
                ]
              })}
              <div className="mt-auto pt-1 flex justify-end pr-0.5">
                <Plus size={10} className="opacity-20 group-hover:opacity-60 transition-opacity"
                  style={{ color: 'var(--color-text-tertiary)' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
