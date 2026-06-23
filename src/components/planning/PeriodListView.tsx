import { Plus } from 'lucide-react'
import {
  type PlanningEvent,
  MOIS_LONG, sameDay,
} from '@/lib/planningUtils'
import EventRow from '@/components/planning/EventRow'
import { COLORS } from '@/lib/constants'


interface PeriodListViewProps {
  periodList:        { date: Date; dateStr: string; events: PlanningEvent[] }[]
  today:             Date
  filterRetard:      boolean
  goToday:           () => void
  goToDay:           (dateStr: string) => void
  handleSelectEvent: (event: PlanningEvent, dateStr: string) => void
}

export default function PeriodListView({
  periodList, today, filterRetard,
  goToday, goToDay, handleSelectEvent,
}: PeriodListViewProps) {
  return (
    <div className="px-4 py-4 space-y-4">
      {periodList.length===0 ? (
        <div className="rounded-xl px-5 py-12 text-center"
          style={{ background:COLORS.BG_SECONDARY, border:'1px solid var(--color-border-subtle)' }}>
          <p className="text-sm" style={{ color:'var(--color-text-tertiary)' }}>
            {filterRetard ? 'Aucun prélèvement en retard.' : 'Aucune intervention cette période.'}
          </p>
          <button type="button" onClick={goToday} className="mt-3 text-xs" style={{ color:COLORS.ACCENT }}>
            Revenir à aujourd'hui
          </button>
        </div>
      ) : (
        periodList.map(({date, dateStr, events}) => {
          const isToday = sameDay(date,today)
          const dayIdx = (date.getDay()+6)%7
          const JOURS_SHORT = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']
          const shortMonth = MOIS_LONG[date.getMonth()].slice(0, 4).toLowerCase().replace('.', '')
          
          return (
            <div key={dateStr}>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                {isToday ? (
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-danger)' }}>
                    {date.getDate()} {JOURS_SHORT[dayIdx]} · Aujourd'hui
                  </span>
                ) : (
                  <span className="text-sm font-semibold" style={{ color: COLORS.TEXT_SECONDARY }}>
                    {date.getDate()} {JOURS_SHORT[dayIdx]} {shortMonth}
                  </span>
                )}
                <button type="button" onClick={() => goToDay(dateStr)}
                  className="ml-auto flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ color:'var(--color-text-tertiary)', border:'1px solid var(--color-border-subtle)' }}>
                  <Plus size={9} /> Ajouter
                </button>
              </div>
              <div className="rounded-xl overflow-hidden"
                style={{ background:COLORS.BG_SECONDARY, border:'1px solid var(--color-border-subtle)', boxShadow:'var(--shadow-card)' }}>
                {events.map((evt,i) => <EventRow key={evt.id} event={evt} isLast={i===events.length-1} onSelect={e => handleSelectEvent(e, dateStr)} />)}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
