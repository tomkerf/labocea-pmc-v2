import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import {
  type ViewMode,
  MOIS_LONG,
  startOfWeek, startOfMonth, addDays, addMonths, toISO,
  buildMiniGrid,
} from '@/lib/planningUtils'

interface MiniCalendarPanelProps {
  viewMode:        ViewMode
  monthStart:      Date
  weekStart:       Date
  selectedDate:    Date
  today:           Date
  setWeekStart:    (d: Date) => void
  setMonthStart:   (d: Date) => void
  setSelectedDate: (d: Date) => void
  setViewMode:     (v: ViewMode) => void
  setSelectedDay:  (d: string | null) => void
  setShowMiniCal:  (v: boolean) => void
}

const DAYS = ['L','M','M','J','V','S','D']
const N_MONTHS = 3

interface MonthGridProps {
  offset:       number
  baseMonth:    Date
  viewMode:     ViewMode
  monthStart:   Date
  weekStart:    Date
  selectedDate: Date
  todayISO:     string
  weekEndISO:   string
  jumpToDate:   (d: Date) => void
}

function MonthGrid({ offset, baseMonth, viewMode, monthStart, weekStart, selectedDate, todayISO, weekEndISO, jumpToDate }: MonthGridProps) {
  const ms    = addMonths(baseMonth, offset)
  const cells = buildMiniGrid(ms)
  const label = MOIS_LONG[ms.getMonth()] + ' ' + ms.getFullYear()
  return (
    <div className="px-3 pt-3 pb-2">
      <p className="text-[11px] font-semibold mb-2 capitalize text-center"
        style={{ color: COLORS.TEXT_PRIMARY }}>{label}</p>
      {offset === 0 && (
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d, i) => (
            <span key={d + i} className="text-center text-[9px] font-semibold"
              style={{ color: 'var(--color-text-tertiary)' }}>{d}</span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />
          const iso = toISO(d)
          const isToday     = iso === todayISO
          const inWeek      = viewMode === 'semaine' && iso >= toISO(weekStart) && iso <= weekEndISO
          const inMonth     = viewMode === 'mois' && d.getMonth() === monthStart.getMonth() && d.getFullYear() === monthStart.getFullYear()
          const isSelected  = viewMode === 'jour' && iso === toISO(selectedDate)
          const highlighted = inWeek || inMonth || isSelected
          return (
            <button type="button" key={iso} onClick={() => jumpToDate(d)}
              className="flex items-center justify-center rounded-full mx-auto"
              style={{
                width: 22, height: 22,
                fontSize: 11,
                background: isToday ? COLORS.ACCENT : highlighted ? 'var(--color-accent-light)' : 'transparent',
                color: isToday ? 'white' : highlighted ? COLORS.ACCENT : COLORS.TEXT_PRIMARY,
                fontWeight: isToday || highlighted ? 600 : 400,
              }}>
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function MiniCalendarPanel({
  viewMode, monthStart, weekStart, selectedDate, today,
  setWeekStart, setMonthStart, setSelectedDate, setViewMode,
  setSelectedDay, setShowMiniCal,
}: MiniCalendarPanelProps) {
  const refDate = viewMode === 'mois' ? monthStart : viewMode === 'semaine' ? weekStart : selectedDate
  const [baseMonth, setBaseMonth] = useState(() => startOfMonth(refDate))
  const todayISO   = toISO(today)
  const weekEndISO = toISO(addDays(weekStart, 6))

  function jumpToDate(d: Date) {
    setWeekStart(startOfWeek(d))
    setMonthStart(startOfMonth(d))
    setSelectedDate(d)
    if (viewMode === 'jour') setViewMode('semaine')
    setSelectedDay(null)
    setShowMiniCal(false)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between px-3 pt-3 pb-1 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        <button type="button" onClick={() => setBaseMonth(m => addMonths(m, -1))}
          className="p-1.5 rounded-md"
          onMouseEnter={e => (e.currentTarget.style.background = COLORS.BG_TERTIARY)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          style={{ color: COLORS.TEXT_SECONDARY }}>
          <ChevronLeft size={13} />
        </button>
        <button type="button" onClick={() => setBaseMonth(startOfMonth(today))}
          className="text-[10px] font-medium px-2 py-0.5 rounded"
          onMouseEnter={e => (e.currentTarget.style.background = COLORS.BG_TERTIARY)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          style={{ color: COLORS.TEXT_SECONDARY }}>
          Aujourd'hui
        </button>
        <button type="button" onClick={() => setBaseMonth(m => addMonths(m, 1))}
          className="p-1.5 rounded-md"
          onMouseEnter={e => (e.currentTarget.style.background = COLORS.BG_TERTIARY)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          style={{ color: COLORS.TEXT_SECONDARY }}>
          <ChevronRight size={13} />
        </button>
      </div>
      {Array.from({ length: N_MONTHS }, (_, i) => (
        <div key={i}>
          {i > 0 && <div style={{ height: 1, background: 'var(--color-border-subtle)', margin: '0 12px' }} />}
          <MonthGrid
            offset={i}
            baseMonth={baseMonth}
            viewMode={viewMode}
            monthStart={monthStart}
            weekStart={weekStart}
            selectedDate={selectedDate}
            todayISO={todayISO}
            weekEndISO={weekEndISO}
            jumpToDate={jumpToDate}
          />
        </div>
      ))}
    </div>
  )
}
