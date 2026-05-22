import MiniCalendarPanel from './MiniCalendarPanel'
import { type ViewMode } from '@/lib/planningUtils'

interface PlanningMiniCalendarProps {
  showMiniCal: boolean
  setShowMiniCal: (show: boolean) => void
  viewMode: ViewMode
  monthStart: Date
  weekStart: Date
  selectedDate: Date
  today: Date
  setWeekStart: (d: Date) => void
  setMonthStart: (d: Date) => void
  setSelectedDate: (d: Date) => void
  setViewMode: (v: ViewMode) => void
  setSelectedDay: (d: string | null) => void
}

export default function PlanningMiniCalendar({
  showMiniCal,
  setShowMiniCal,
  viewMode,
  monthStart,
  weekStart,
  selectedDate,
  today,
  setWeekStart,
  setMonthStart,
  setSelectedDate,
  setViewMode,
  setSelectedDay,
}: PlanningMiniCalendarProps) {
  return (
    <>
      {/* ── Panneau mini-calendrier overlay (desktop) ── */}
      <div
        className="hidden md:flex flex-col absolute z-30 top-0 left-0 bottom-0 w-[220px]"
        style={{
          background: 'var(--color-bg-secondary)',
          boxShadow: showMiniCal ? 'var(--shadow-modal)' : 'none',
          borderRight: '1px solid var(--color-border-subtle)',
          transform: showMiniCal ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 200ms ease',
          pointerEvents: showMiniCal ? 'auto' : 'none',
        }}
      >
        <MiniCalendarPanel
          viewMode={viewMode}
          monthStart={monthStart}
          weekStart={weekStart}
          selectedDate={selectedDate}
          today={today}
          setWeekStart={setWeekStart}
          setMonthStart={setMonthStart}
          setSelectedDate={setSelectedDate}
          setViewMode={setViewMode}
          setSelectedDay={setSelectedDay}
          setShowMiniCal={setShowMiniCal}
        />
      </div>

      {/* Backdrop overlay (ferme au clic extérieur) */}
      {showMiniCal && (
        <div
          className="hidden md:block absolute inset-0 z-20"
          onClick={() => setShowMiniCal(false)}
        />
      )}
    </>
  )
}
