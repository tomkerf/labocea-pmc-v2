import { useMemo } from 'react'
import { type PlanningEvent, type ViewMode, toISO } from '@/lib/planningUtils'
import type { AppUser } from '@/types/index'

interface UsePlanningExportsProps {
  viewMode:            ViewMode
  selectedDate:        Date
  weekDays:            Date[]
  monthGrid:           (Date | null)[]
  filteredForDayFlat:  (dateStr: string) => PlanningEvent[]
  periodLabel:         string
  activeFilterTech:    string
  users:               AppUser[]
}

export function usePlanningExports({
  viewMode, selectedDate, weekDays, monthGrid,
  filteredForDayFlat, periodLabel, activeFilterTech, users,
}: UsePlanningExportsProps) {
  const activePeriodEvents = useMemo(() => {
    const dates: string[] = []
    if (viewMode === 'jour' || viewMode === 'carte') {
      dates.push(toISO(selectedDate))
    } else if (viewMode === 'semaine') {
      weekDays.forEach(d => dates.push(toISO(d)))
    } else if (viewMode === 'mois') {
      monthGrid.forEach(d => { if (d) dates.push(toISO(d)) })
    }
    const list: PlanningEvent[] = []
    const seen = new Set<string>()
    dates.forEach(dateStr => {
      filteredForDayFlat(dateStr).forEach(e => {
        if (!seen.has(e.id)) { seen.add(e.id); list.push(e) }
      })
    })
    return list
  }, [viewMode, selectedDate, weekDays, monthGrid, filteredForDayFlat])

  function handleExportPdf() {
    import('@/lib/exportPlanningPdf').then(({ exportPlanningPdf }) => {
      exportPlanningPdf(activePeriodEvents, periodLabel, activeFilterTech, users)
    })
  }

  function handleExportExcel() {
    import('@/lib/exportPlanningExcel').then(({ exportPlanningExcel }) => {
      exportPlanningExcel(activePeriodEvents, periodLabel, activeFilterTech)
    })
  }

  return { handleExportPdf, handleExportExcel }
}
