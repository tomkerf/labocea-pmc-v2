import type { Dispatch, SetStateAction } from 'react'
import {
  type ViewMode,
  addDays, addMonths, startOfWeek, startOfMonth,
} from '@/lib/planningUtils'

interface UsePlanningNavigationProps {
  viewMode:       ViewMode
  setViewMode:    Dispatch<SetStateAction<ViewMode>>
  today:          Date
  selectedDate:   Date
  setSelectedDate: Dispatch<SetStateAction<Date>>
  weekStart:      Date
  setWeekStart:   Dispatch<SetStateAction<Date>>
  monthStart:     Date
  setMonthStart:  Dispatch<SetStateAction<Date>>
  setSelectedDay: Dispatch<SetStateAction<string | null>>
}

export function usePlanningNavigation({
  viewMode, setViewMode, today,
  selectedDate, setSelectedDate,
  weekStart, setWeekStart,
  monthStart, setMonthStart,
  setSelectedDay,
}: UsePlanningNavigationProps) {

  function prev() {
    if (viewMode === 'jour') setSelectedDate(addDays(selectedDate, -1))
    else if (viewMode === 'semaine') setWeekStart(addDays(weekStart, -7))
    else setMonthStart(addMonths(monthStart, -1))
    setSelectedDay(null)
  }

  function next() {
    if (viewMode === 'jour') setSelectedDate(addDays(selectedDate, 1))
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
