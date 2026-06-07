import { useState } from 'react'
import { Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import {
  type PlanningEvent,
  toISO, sameDay,
  parseHHMM, assignColumns, sortEvts, filterEvents, getISOWeek, groupByClient,
} from '@/lib/planningUtils'
import WeatherBadge from '@/components/planning/WeatherBadge'

interface DayViewProps {
  selectedDate:      Date
  today:             Date
  eventsByDate:      Record<string, PlanningEvent[]>
  filterTech:        string
  allowedTechs:      string[]
  filterRetard:      boolean
  showRain:          boolean
  handleTouchStart:  (e: React.TouchEvent) => void
  handleTouchEnd:    (e: React.TouchEvent) => void
  handleSelectEvent: (event: PlanningEvent, dateStr: string) => void
  setSelectedDay:    (day: string | null) => void
}

export default function DayView({
  selectedDate, today, eventsByDate,
  filterTech, allowedTechs, filterRetard, showRain,
  handleTouchStart, handleTouchEnd,
  handleSelectEvent, setSelectedDay,
}: DayViewProps) {
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())
  const D_START = 7, D_END = 20, PX_H = 64, PX_M = PX_H / 60
  const dateStr = toISO(selectedDate)
  const allEvts = sortEvts(filterEvents(eventsByDate[dateStr] ?? [], filterTech, filterRetard, allowedTechs).filter(e => e.evenementData?.type !== 'meteo'))
  const allDayEvtsFlat = allEvts.filter(e => !e.plannedTime)
  const allDayEvts = groupByClient(allDayEvtsFlat)
  const timedEvts  = assignColumns(
    allEvts.flatMap(e => e.plannedTime ? [{ ...e, startMin: parseHHMM(e.plannedTime!), durationMin: 60 }] : [])
  )
  const now    = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const showNow = sameDay(selectedDate, today) && nowMin >= D_START * 60 && nowMin <= D_END * 60
  const weekNum = getISOWeek(selectedDate)
  const isRainyDay = eventsByDate[dateStr]?.some(e => e.evenementData?.type === 'meteo') ?? false


  return (
    <div className="flex-1 overflow-hidden flex flex-col relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>

      {/* Sous-titre : numéro de semaine + météo */}
      <div className="px-4 py-1.5 shrink-0 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--color-border-subtle)', background: COLORS.BG_SECONDARY }}>
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          Semaine {weekNum}
        </span>
        {allEvts.length > 0 && (
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            · {allEvts.length} intervention{allEvts.length > 1 ? 's' : ''}
          </span>
        )}
        {showRain && (
          <WeatherBadge events={allEvts} date={selectedDate} className="ml-auto" />
        )}
      </div>

      {/* Section "Toute la journée" */}
      <div className="shrink-0 relative" style={{ borderBottom: '1px solid var(--color-border-subtle)', background: COLORS.BG_SECONDARY }}>
        {showRain && isRainyDay && <div className="rain-overlay opacity-30" />}
        <div className="flex relative z-10">
          <div className="w-14 shrink-0 flex items-start justify-end pr-2 pt-2 pb-1">
            <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-tertiary)' }}>Jour</span>
          </div>
          <div className="flex-1 py-1.5 pr-3 flex flex-col gap-1" style={{ minHeight: 36 }}>
            {allDayEvts.length === 0 ? (
              <span className="text-xs py-1" style={{ color: 'var(--color-text-tertiary)' }}>Aucune intervention planifiée</span>
            ) : allDayEvts.map(evt => {
              const isGrouped = (evt.count ?? 0) > 1
              const isExpanded = isGrouped && expandedClients.has(evt.clientId ?? evt.id)
              const subEvts = isExpanded
                ? allDayEvtsFlat.filter(e => e.clientId === evt.clientId)
                : []
              return (
                <div key={evt.id}>
                  <button type="button"
                    onClick={() => {
                      if (isGrouped) {
                        setExpandedClients(prev => {
                          const next = new Set(prev)
                          const key = evt.clientId ?? evt.id
                          if (next.has(key)) next.delete(key); else next.add(key)
                          return next
                        })
                      } else {
                        handleSelectEvent(evt, dateStr)
                      }
                    }}
                    className="w-full flex items-center gap-1.5 px-2 py-1 rounded-[5px] text-left"
                    style={{ background: evt.statusBg }}>
                    {isGrouped
                      ? (isExpanded
                          ? <ChevronDown size={10} className="shrink-0" style={{ color: COLORS.TEXT_SECONDARY }} />
                          : <ChevronRight size={10} className="shrink-0" style={{ color: COLORS.TEXT_SECONDARY }} />)
                      : <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: evt.statusColor }} />
                    }
                    <span className="text-[11px] font-medium flex-1 truncate" style={{ color: COLORS.TEXT_PRIMARY }}>
                      {evt.title}
                    </span>
                    <span className="text-[10px] truncate max-w-[160px]" style={{ color: COLORS.TEXT_SECONDARY }}>
                      {evt.subtitle}
                    </span>
                    {isGrouped && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                        style={{ background: 'var(--color-accent-light)', color: COLORS.ACCENT }}>
                        ×{evt.count}
                      </span>
                    )}
                    {evt.technicien && evt.technicien !== '—' && (
                      <span className="text-[9px] px-1 rounded shrink-0"
                        style={{ background: COLORS.BG_TERTIARY, color: COLORS.TEXT_SECONDARY }}>
                        {evt.technicien}
                      </span>
                    )}
                    {!isGrouped && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                        style={{ background: evt.statusColor + '22', color: evt.statusColor }}>
                        {evt.statusLabel}
                      </span>
                    )}
                  </button>
                  {isExpanded && subEvts.map(sub => (
                    <button type="button" key={sub.id}
                      onClick={() => handleSelectEvent(sub, dateStr)}
                      className="w-full flex items-center gap-1.5 pl-6 pr-2 py-0.5 text-left"
                      style={{ background: 'transparent' }}>
                      <span className="w-[4px] h-[4px] rounded-full shrink-0" style={{ background: sub.statusColor }} />
                      <span className="text-[10px] flex-1 truncate" style={{ color: COLORS.TEXT_PRIMARY }}>{sub.subtitle}</span>
                      {sub.frequence && (
                        <span className="text-[9px] shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>{sub.frequence}</span>
                      )}
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                        style={{ background: sub.statusColor + '22', color: sub.statusColor }}>
                        {sub.statusLabel}
                      </span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Grille horaire */}
      <div className="flex-1 overflow-y-auto relative" style={{ background: COLORS.BG_PRIMARY }}>
        {showRain && isRainyDay && <div className="rain-overlay" />}
        <div className="relative z-10" style={{ height: (D_END - D_START) * PX_H }}>

          {/* Lignes horaires */}
          {Array.from({ length: D_END - D_START }, (_, i) => (
            <div key={D_START + i} className="absolute left-0 right-0"
              style={{ top: i * PX_H, height: PX_H, borderTop: '1px solid var(--color-border-subtle)' }}>
              <div className="absolute w-14 pr-2 text-right -top-2.5">
                <span className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                  {String(D_START + i).padStart(2, '0')}h
                </span>
              </div>
              {/* Demi-heure */}
              <div className="absolute right-0 border-t opacity-40"
                style={{ left: 56, top: PX_H / 2, borderColor: 'var(--color-border-subtle)', borderStyle: 'dashed' }} />
            </div>
          ))}

          {/* Indicateur heure actuelle */}
          {showNow && (
            <div className="absolute flex items-center z-10 pointer-events-none"
              style={{ top: (nowMin - D_START * 60) * PX_M, left: 56 - 5, right: 0 }}>
              <div className="size-2.5 rounded-full shrink-0" style={{ background: '#FF3B30' }} />
              <div className="flex-1" style={{ height: 2, background: '#FF3B30' }} />
            </div>
          )}

          {/* Événements horodatés */}
          <div className="absolute inset-0" style={{ left: 56 }}>
            {timedEvts.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-xs text-center px-4" style={{ color: 'var(--color-text-tertiary)' }}>
                  Aucun événement horodaté
                  <br />Utilisez "+ Événement" pour en ajouter
                </p>
              </div>
            ) : timedEvts.map(evt => {
              const top    = (evt.startMin - D_START * 60) * PX_M
              const height = Math.max(evt.durationMin * PX_M, 28)
              const W      = 1 / evt.totalCols
              return (
                <button type="button" key={evt.id}
                  onClick={() => handleSelectEvent(evt, dateStr)}
                  className="absolute text-left rounded-lg px-2 py-1 overflow-hidden"
                  style={{
                    top: top + 1, height: height - 2,
                    left: `calc(${evt.col * W * 100}% + 2px)`,
                    width: `calc(${W * 100}% - 4px)`,
                    background: evt.statusBg,
                    border: `1.5px solid ${evt.statusColor}50`,
                  }}>
                  <div className="flex items-center gap-1">
                    <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: evt.statusColor }} />
                    <span className="text-[11px] font-semibold truncate" style={{ color: COLORS.TEXT_PRIMARY }}>
                      {evt.title}
                    </span>
                  </div>
                  {height >= 38 && (
                    <p className="text-[10px] truncate pl-[13px] mt-0.5" style={{ color: COLORS.TEXT_SECONDARY }}>
                      {evt.plannedTime} · {evt.subtitle}
                    </p>
                  )}
                </button>
              )
            })}
          </div>

        </div>
      </div>

      {/* FAB Planifier — flottant bas droite */}
      <button type="button"
        onClick={() => setSelectedDay(dateStr)}
        className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-lg"
        style={{
          background: COLORS.ACCENT,
          color: 'white',
          boxShadow: '0 4px 16px rgba(0,113,227,0.35)',
          zIndex: 20,
        }}>
        <Plus size={16} strokeWidth={2.5} />
        Planifier
      </button>

    </div>
  )
}
