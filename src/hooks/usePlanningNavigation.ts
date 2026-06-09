import {
  type ViewMode,
  addDays, addMonths, startOfWeek, startOfMonth,
} from '@/lib/planningUtils'

interface UsePlanningNavigationProps {
  viewMode:        ViewMode
  setViewMode:     (v: ViewMode) => void
  today:           Date
  selectedDate:    Date
  setSelectedDate: (v: Date) => void
  weekStart:       Date
  setWeekStart:    (v: Date) => void
  monthStart:      Date
  setMonthStart:   (v: Date) => void
  setSelectedDay:  (v: string | null) => void
}

export function usePlanningNavigation({
  viewMode, setViewMode, today,
  selectedDate, setSelectedDate,
  weekStart, setWeekStart,
  monthStart, setMonthStart,
  setSelectedDay,
}: UsePlanningNavigationProps) {

  function prev() {
    if (viewMode === 'jour' || viewMode === 'carte') setSelectedDate(addDays(selectedDate, -1))
    else if (viewMode === 'semaine') setWeekStart(addDays(weekStart, -7))
    else setMonthStart(addMonths(monthStart, -1))
    setSelectedDay(null)
  }

  function next() {
    if (viewMode === 'jour' || viewMode === 'carte') setSelectedDate(addDays(selectedDate, 1))
    else if (viewMode === 'semaine') setWeekStart(addDays(weekStart, 7))
    else setMonthStart(addMonths(monthStart, 1))
    setSelectedDay(null)
  }

  function goToday() {
    setWeekStart(startOfWeek(today)); setMonthStart(startOfMonth(today))
    setSelectedDate(today); setSelectedDay(null)
  }

  // Naviguer vers la vue Jour pour une date donnée
  function goToDay(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00')
    setSelectedDate(d)
    setViewMode('jour')
    setSelectedDay(null)
  }

  function switchView(m: ViewMode) {
    setViewMode(m)
    if (m === 'mois') setMonthStart(startOfMonth(selectedDate))
    if (m === 'semaine') setWeekStart(startOfWeek(selectedDate))
    setSelectedDay(null)
  }

  return { prev, next, goToday, goToDay, switchView }
}
