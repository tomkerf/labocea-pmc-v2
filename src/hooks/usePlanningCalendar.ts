/**
 * usePlanningCalendar
 * ─────────────────────────────────────────────────────────────────
 * Calculs calendrier extraits de PlanningPage :
 * filtrage, bande bilan 24h, items all-day, liste période mobile.
 * Dépend de usePlanningData (eventsByDate) et des états de navigation.
 */

import { useMemo, useCallback } from 'react'
import {
  type PlanningEvent, type AllDayItem, type BilanGroup, type ViewMode,
  EVENEMENT_LABEL,
  toISO, getTechColor, normTech,
  sortEvts, groupByClient, filterEvents,
} from '@/lib/planningUtils'
import type { Client, Sampling, EvenementPersonnel } from '@/types'

interface UsePlanningCalendarParams {
  // Données
  eventsByDate:  Record<string, PlanningEvent[]>
  evenements:    EvenementPersonnel[]
  clients:       Client[]

  // Navigation
  viewMode:      ViewMode
  weekDays:      Date[]
  monthStart:    Date
  weekStart:     Date
  selectedDate:  Date

  // Filtres
  filterTech:    string
  allowedTechs:  string[]
  filterRetard:  boolean

  // Handler UI (pour allDayItems.onClick)
  handleSelectEvent: (event: PlanningEvent, dateStr: string) => void
}

export function usePlanningCalendar({
  eventsByDate, evenements, clients,
  viewMode, weekDays, monthStart, weekStart, selectedDate,
  filterTech, allowedTechs, filterRetard,
  handleSelectEvent,
}: UsePlanningCalendarParams) {

  // ── Filtrage avec regroupement par client (vue mois, DayModal) ──
  const filteredForDay = useCallback((dateStr: string): PlanningEvent[] =>
    groupByClient(
      filterEvents(eventsByDate[dateStr] ?? [], filterTech, filterRetard)
        .filter(e => e.evenementData?.type !== 'meteo')
    )
  , [eventsByDate, filterTech, filterRetard])

  // ── Filtrage sans regroupement (vue semaine, vue jour) ──────────
  const filteredForDayFlat = useCallback((dateStr: string): PlanningEvent[] =>
    sortEvts(
      filterEvents(eventsByDate[dateStr] ?? [], filterTech, filterRetard)
        .filter(e => e.evenementData?.type !== 'meteo')
    )
  , [eventsByDate, filterTech, filterRetard])

  // ── Nombre de samplings non faits dans le mois visible ─────────
  const monthPoolCount = useMemo(() => {
    const refDate = viewMode === 'mois' ? monthStart : viewMode === 'semaine' ? weekStart : selectedDate
    const month = refDate.getMonth()
    let count = 0
    clients.forEach((c: Client) => {
      c.plans.forEach(plan => {
        plan.samplings.forEach((s: Sampling) => {
          if (s.plannedMonth === month && s.status !== 'done') count++
        })
      })
    })
    return count
  }, [clients, viewMode, monthStart, weekStart, selectedDate])

  // ── Bande bilan 24h — paires J1/J2 spanning (vue semaine) ──────
  const bilanBand = useMemo((): BilanGroup[][] => {
    if (viewMode !== 'semaine') return []
    const wISOs = weekDays.map(toISO)
    const pairs: { j1Col: number; j2Col: number; j1: PlanningEvent; j2: PlanningEvent | null }[] = []

    wISOs.forEach((dateStr, colIdx) => {
      const dayJ1s = (eventsByDate[dateStr] ?? []).filter(e => e.type === 'prelevement' && !!e.dateFin && !e.isGhost)
      const filtered = filterTech
        ? dayJ1s.filter(e => normTech(e.technicien) === filterTech)
        : allowedTechs.length > 0
          ? dayJ1s.filter(e => allowedTechs.includes(normTech(e.technicien)))
          : dayJ1s

      filtered.forEach(j1 => {
        const j2DateStr = j1.dateFin!
        const j2Col     = wISOs.indexOf(j2DateStr)
        
        const j2: PlanningEvent | null = j2Col !== -1 ? {
          ...j1,
          id: j1.id + '_j2_proxy',
          isJ2Continuation: true,
        } : null

        pairs.push({ j1Col: colIdx, j2Col: j2 ? j2Col : -1, j1, j2 })
      })
    })

    const colRowNext = new Array(7).fill(0) as number[]
    const rows: BilanGroup[][] = []

    pairs.forEach(({ j1Col, j2Col, j1, j2 }) => {
      let rowIdx = colRowNext[j1Col]
      if (j2Col !== -1) rowIdx = Math.max(rowIdx, colRowNext[j2Col] || 0)
      if (!rows[rowIdx]) rows[rowIdx] = []

      const tc = j1.technicien && j1.technicien !== '—' ? getTechColor(j1.technicien).color : 'var(--color-accent)'
      const hasPair = j2Col !== -1 && j2 !== null

      rows[rowIdx].push({
        colStart:  j1Col,
        colEnd:    hasPair ? j2Col : j1Col,
        techColor: tc,
        items: hasPair
          ? [{ colIdx: j1Col, event: j1 }, { colIdx: j2Col, event: j2! }]
          : [{ colIdx: j1Col, event: j1 }],
      })
      colRowNext[j1Col] = rowIdx + 1
      if (hasPair) colRowNext[j2Col] = rowIdx + 1
    })

    return rows
  }, [viewMode, weekDays, eventsByDate, filterTech, allowedTechs])

  // ── Items "toute la journée" — événements multi-jours (vue semaine) ──
  const allDayItems = useMemo((): AllDayItem[] => {
    if (viewMode !== 'semaine') return []
    const weekDayISOs  = weekDays.map(toISO)
    const weekStartISO = weekDayISOs[0]
    const weekEndISO   = weekDayISOs[4]

    const rawItems: Omit<AllDayItem, 'row'>[] = []

    for (const ev of evenements) {
      if (!ev.dateFin || ev.dateFin <= ev.date) continue
      if (ev.type === 'conge') continue
      if (filterTech && normTech(ev.createdByInitiales || '') !== filterTech) continue
      if (!(ev.date <= weekEndISO && ev.dateFin >= weekStartISO)) continue
      const tc = getTechColor(ev.createdByInitiales || '')
      const startClamped = ev.date < weekStartISO ? weekStartISO : ev.date
      const endClamped   = ev.dateFin! > weekEndISO ? weekEndISO : ev.dateFin!
      const colStart = weekDayISOs.findIndex(d => d >= startClamped)
      let colEnd = -1
      for (let i = 4; i >= 0; i--) { if (weekDayISOs[i] <= endClamped) { colEnd = i; break } }
      if (colStart === -1 || colEnd === -1 || colStart > colEnd) continue
      const evObj: PlanningEvent = {
        id: ev.id, type: 'evenement', priority: 2,
        title: ev.titre,
        subtitle: EVENEMENT_LABEL[ev.type] ?? 'Autre',
        statusLabel: EVENEMENT_LABEL[ev.type] ?? 'Autre',
        statusBg: 'var(--color-bg-tertiary)', statusColor: 'var(--color-text-tertiary)',
        link: '', isDone: false,
        technicien: ev.createdByInitiales || '—',
        evenementData: ev,
      }
      rawItems.push({
        key: ev.id,
        colStart, colEnd,
        bg: tc.bg,
        label: ev.titre,
        badge: ev.createdByInitiales || undefined,
        onClick: () => handleSelectEvent(evObj, ev.date),
        tooltip: `${ev.titre} (${ev.date} → ${ev.dateFin})`,
      })
    }

    const rowEnds: number[] = []
    return rawItems.map(item => {
      let row = rowEnds.findIndex(end => end <= item.colStart)
      if (row === -1) row = rowEnds.length
      rowEnds[row] = item.colEnd + 1
      return { ...item, row }
    })
  }, [evenements, viewMode, weekDays, filterTech, handleSelectEvent])

  // ── Liste période (vue mobile) ──────────────────────────────────
  const periodList = useMemo(() => {
    const days: Date[] = viewMode === 'semaine'
      ? weekDays
      : Array.from(
          { length: new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate() },
          (_, i) => new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1)
        )
    return days.flatMap(date => {
      const dateStr = toISO(date)
      const events = filteredForDay(dateStr)
      return events.length > 0 ? [{ date, dateStr, events }] : []
    })
  }, [viewMode, weekDays, monthStart, filteredForDay])

  return {
    filteredForDay,
    filteredForDayFlat,
    monthPoolCount,
    bilanBand,
    allDayItems,
    periodList,
  }
}
