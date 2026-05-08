import { Plus } from 'lucide-react'
import {
  type PlanningEvent,
  normTech, toISO, sameDay,
  parseHHMM, assignColumns, sortEvts,
} from '@/lib/planningUtils'

interface DayViewProps {
  selectedDate:      Date
  today:             Date
  eventsByDate:      Record<string, PlanningEvent[]>
  filterTech:        string
  filterRetard:      boolean
  handleTouchStart:  (e: React.TouchEvent) => void
  handleTouchEnd:    (e: React.TouchEvent) => void
  handleSelectEvent: (event: PlanningEvent, dateStr: string) => void
  setSelectedDay:    (day: string | null) => void
}

export default function DayView({
  selectedDate, today, eventsByDate,
  filterTech, filterRetard,
  handleTouchStart, handleTouchEnd,
  handleSelectEvent, setSelectedDay,
}: DayViewProps) {
  const D_START = 7, D_END = 20, PX_H = 64, PX_M = PX_H / 60
  const dateStr = toISO(selectedDate)
  const allEvts = sortEvts((() => {
    let evts = eventsByDate[dateStr] ?? []
    if (filterTech)   evts = evts.filter(e => normTech(e.technicien) === filterTech)
    if (filterRetard) evts = evts.filter(e => e.statusColor === 'var(--color-danger)' || e.statusLabel === 'En retard')
    return evts
  })())
  const allDayEvts = allEvts.filter(e => !e.plannedTime)
  const timedEvts  = assignColumns(
    allEvts.filter(e => !!e.plannedTime)
      .map(e => ({ ...e, startMin: parseHHMM(e.plannedTime!), durationMin: 60 }))
  )
  const now    = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const showNow = sameDay(selectedDate, today) && nowMin >= D_START * 60 && nowMin <= D_END * 60
  const weekNum = (() => {
    const d = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - y.getTime()) / 86400000) + 1) / 7)
  })()

  return (
    <div className="flex-1 overflow-hidden flex flex-col relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>

      {/* Sous-titre : numéro de semaine */}
      <div className="px-4 py-1.5 shrink-0 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-secondary)' }}>
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          Semaine {weekNum}
        </span>
        {allEvts.length > 0 && (
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            · {allEvts.length} intervention{allEvts.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Section "Toute la journée" */}
      <div className="shrink-0" style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-secondary)' }}>
        <div className="flex">
          <div className="w-14 shrink-0 flex items-start justify-end pr-2 pt-2 pb-1">
            <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-tertiary)' }}>Jour</span>
          </div>
          <div className="flex-1 py-1.5 pr-3 flex flex-col gap-1" style={{ minHeight: 36 }}>
            {allDayEvts.length === 0 ? (
              <span className="text-xs py-1" style={{ color: 'var(--color-text-tertiary)' }}>Aucune intervention planifiée</span>
            ) : allDayEvts.map(evt => (
              <button key={evt.id}
                onClick={() => handleSelectEvent(evt, dateStr)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-[5px] text-left"
                style={{ background: evt.statusBg }}>
                <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: evt.statusColor }} />
                <span className="text-[11px] font-medium flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {evt.title}
                </span>
                <span className="text-[10px] truncate max-w-[160px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {evt.subtitle}
                </span>
                {evt.technicien && evt.technicien !== '—' && (
                  <span className="text-[9px] px-1 rounded shrink-0"
                    style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                    {evt.technicien}
                  </span>
                )}
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                  style={{ background: evt.statusColor + '22', color: evt.statusColor }}>
                  {evt.statusLabel}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grille horaire */}
      <div className="flex-1 overflow-y-auto" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="relative" style={{ height: (D_END - D_START) * PX_H }}>

          {/* Lignes horaires */}
          {Array.from({ length: D_END - D_START }, (_, i) => (
            <div key={i} className="absolute left-0 right-0"
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
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#FF3B30' }} />
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
                <button key={evt.id}
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
                    <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {evt.title}
                    </span>
                  </div>
                  {height >= 38 && (
                    <p className="text-[10px] truncate pl-[13px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
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
      <button
        onClick={() => setSelectedDay(dateStr)}
        className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-lg"
        style={{
          background: 'var(--color-accent)',
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
