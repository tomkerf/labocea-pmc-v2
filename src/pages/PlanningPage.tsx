import { useState, useMemo, useReducer } from 'react'
import { useClientsListener } from '@/hooks/useClients'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useVerificationsListener } from '@/hooks/useVerifications'
import { useMaintenancesListener } from '@/hooks/useMaintenances'
import { useEvenementsListener } from '@/hooks/useEvenements'
import { useUsersListener } from '@/hooks/useUsers'
import { usePreleveursListener } from '@/hooks/usePreleveurs'
import { useMissionsStore } from '@/stores/missionsStore'
import { useEquipementsStore } from '@/stores/equipementsStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useEvenementsStore } from '@/stores/evenementsStore'
import { useUsersStore } from '@/stores/usersStore'
import { usePreleveursStore } from '@/stores/preleveursStore'
import { useTodosStore } from '@/stores/todosStore'
import { useTodosListener } from '@/hooks/useTodos'
import { useAuthStore, selectUid, selectInitiales } from '@/stores/authStore'
import {
  type PlanningEvent, type ViewMode,
  getFrenchHolidays,
  startOfWeek, startOfMonth, addDays,
  buildMonthGrid, getPeriodLabel,
} from '@/lib/planningUtils'
import { usePlanningData } from '@/hooks/usePlanningData'
import { usePlanningCalendar } from '@/hooks/usePlanningCalendar'
import { usePlanningDrag } from '@/hooks/usePlanningDrag'
import { usePlanningActions } from '@/hooks/usePlanningActions'
import { usePlanningNavigation } from '@/hooks/usePlanningNavigation'
import { usePlanningFilters } from '@/hooks/usePlanningFilters'
import { usePlanningExports } from '@/hooks/usePlanningExports'
import PlanningHeader       from '@/components/planning/PlanningHeader'
import PlanningMiniCalendar from '@/components/planning/PlanningMiniCalendar'
import PlanningViewRenderer from '@/components/planning/PlanningViewRenderer'
import PlanningModals       from '@/components/planning/PlanningModals'
import { uiReducer, navReducer } from '@/pages/planning/planningPageReducers'

export default function PlanningPage() {
  useClientsListener(); useEquipementsListener()
  useVerificationsListener(); useMaintenancesListener()
  useEvenementsListener(); useUsersListener()
  usePreleveursListener(); useTodosListener()

  const uid        = useAuthStore(selectUid)
  const initiales  = useAuthStore(selectInitiales)
  const { clients }       = useMissionsStore()
  const { equipements }   = useEquipementsStore()
  const { maintenances }  = useMaintenancesStore()
  const { evenements }    = useEvenementsStore()
  const users             = useUsersStore(s => s.users)
  const preleveurs        = usePreleveursStore(s => s.preleveurs)
  const { todos }         = useTodosStore()

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const todayYear = today.getFullYear()
  const holidays = useMemo(() => ({
    ...getFrenchHolidays(todayYear),
    ...getFrenchHolidays(todayYear + 1),
  }), [todayYear])

  // ── UI state ─────────────────────────────────────────────
  const [ui, dispatch] = useReducer(uiReducer, undefined, () => ({
    showDragHint:      !localStorage.getItem('planning_drag_hint_seen'),
    showRain:          localStorage.getItem('planning_show_rain') !== 'false',
    showMiniCal:       false,
    showBilanMois:     false,
    selectedDay:       null,
    dayModalInitialTab: 'pool' as const,
    ctxMenu:           null,
    eventDetail:       null,
    ghostDetail:       null,
    dragModal:         null,
  }))

  const { showDragHint, showRain, showMiniCal, showBilanMois,
          selectedDay, dayModalInitialTab, ctxMenu, eventDetail, ghostDetail, dragModal } = ui

  const setShowDragHint       = (value: boolean) => dispatch({ type: 'SET_SHOW_DRAG_HINT', value })
  const setShowRain           = (value: boolean) => dispatch({ type: 'SET_SHOW_RAIN', value })
  const setShowMiniCal        = (value: boolean) => dispatch({ type: 'SET_SHOW_MINI_CAL', value })
  const setShowBilanMois      = (value: boolean) => dispatch({ type: 'SET_SHOW_BILAN_MOIS', value })
  const setSelectedDay        = (value: string | null) => dispatch({ type: 'SET_SELECTED_DAY', value })
  const setDayModalInitialTab = (value: 'pool' | 'evt') => dispatch({ type: 'SET_DAY_MODAL_TAB', value })
  const setCtxMenu  = (value: { dateStr: string; x: number; y: number } | null) => dispatch({ type: 'SET_CTX_MENU', value })
  const setEventDetail = (value: { event: PlanningEvent; dateStr: string } | null) => dispatch({ type: 'SET_EVENT_DETAIL', value })
  const setGhostDetail = (value: { event: PlanningEvent; dateStr: string } | null) => dispatch({ type: 'SET_GHOST_DETAIL', value })
  const setDragModal   = (value: { dateDebut: string; dateFin: string } | null) => dispatch({ type: 'SET_DRAG_MODAL', value })

  // ── Nav state ─────────────────────────────────────────────
  const [nav, dispatchNav] = useReducer(navReducer, {
    viewMode: 'semaine' as ViewMode,
    weekStart: startOfWeek(today),
    monthStart: startOfMonth(today),
    selectedDate: today,
  })
  const { viewMode, weekStart, monthStart, selectedDate } = nav
  const setViewMode     = (value: ViewMode) => dispatchNav({ type: 'SET_VIEW_MODE', value })
  const setWeekStart    = (value: Date) => dispatchNav({ type: 'SET_WEEK_START', value })
  const setMonthStart   = (value: Date) => dispatchNav({ type: 'SET_MONTH_START', value })
  const setSelectedDate = (value: Date) => dispatchNav({ type: 'SET_SELECTED_DATE', value })

  const [filterTech, setFilterTech] = useState(() => {
    const saved = localStorage.getItem('planning_filter_tech')
    if (saved && saved !== 'ALL') return saved
    const ini = useAuthStore.getState().appUser?.initiales ?? ''
    if (ini) localStorage.setItem('planning_filter_tech', ini)
    return ini
  })
  const [filterSite, setFilterSite] = useState<string>(
    () => localStorage.getItem('planning_filter_site') ?? ''
  )
  const filterRetard = false

  function handleSelectEvent(event: PlanningEvent, dateStr: string) {
    if (event.isGhost) setGhostDetail({ event, dateStr })
    else setEventDetail({ event, dateStr })
  }

  // ── Hooks ──────────────────────────────────────────────────
  const { prev, next, goToday, goToDay, switchView } = usePlanningNavigation({
    viewMode, setViewMode, today,
    selectedDate, setSelectedDate,
    weekStart, setWeekStart,
    monthStart, setMonthStart,
    setSelectedDay,
  })

  const {
    handleTouchStart, handleTouchEnd,
    isDragging, dragStart, dragEnd,
    setIsDragging, setDragStart, setDragEnd,
    handleDragMouseDown, handleDragMouseEnter, handleDragMouseUp,
  } = usePlanningDrag({ selectedDate, setSelectedDate, goToDay, setDragModal })

  const weekDays  = useMemo(() => Array.from({length:7},(_,i) => addDays(weekStart,i)), [weekStart])
  const monthGrid = useMemo(() => buildMonthGrid(monthStart), [monthStart])

  const { eventsByDate, allTechs, techOptions, poolSamplings, overduePool } = usePlanningData({
    clients, maintenances, equipements, evenements, todos, users, preleveurs, selectedDay,
  })

  const { visibleTechs, allowedTechs, activeFilterTech } = usePlanningFilters({
    allTechs, preleveurs, filterTech, filterSite,
  })

  const {
    monthPoolCount, bilanBand, allDayItems, periodList, filteredForDayFlat,
  } = usePlanningCalendar({
    eventsByDate, evenements, clients,
    viewMode, weekDays, monthStart, weekStart, selectedDate,
    filterTech: activeFilterTech, allowedTechs, filterRetard,
    handleSelectEvent,
  })

  const {
    handleCancelSampling, handleMoveEvent, handleDeleteEvent,
    toggleRainDay, handleChangeTechnicien, handleChangeEquipements,
    handleSaveEvenement, handleValidatePool,
  } = usePlanningActions({ uid, initiales, clients, evenements, holidays })

  const periodLabel = getPeriodLabel(viewMode, selectedDate, weekStart, monthStart)

  const { handleExportPdf, handleExportExcel } = usePlanningExports({
    viewMode, selectedDate, weekDays, monthGrid,
    filteredForDayFlat, periodLabel, activeFilterTech, users,
  })

  const assignedEqIdsForDate = eventDetail
    ? (eventsByDate[eventDetail.dateStr] || [])
        .filter(e => e.id !== eventDetail.event.id && e.type === 'prelevement' && e.equipementsAssignes)
        .flatMap(e => e.equipementsAssignes || [])
    : []

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full relative">

      <PlanningHeader
        periodLabel={periodLabel} viewMode={viewMode}
        prev={prev} next={next} goToday={goToday} switchView={switchView}
        showMiniCal={showMiniCal} setShowMiniCal={setShowMiniCal}
        allTechs={visibleTechs} filterTech={activeFilterTech} setFilterTech={setFilterTech}
        filterSite={filterSite} setFilterSite={setFilterSite}
        showRain={showRain} setShowRain={setShowRain} preleveurs={preleveurs}
        monthPoolCount={monthPoolCount} showDragHint={showDragHint} setShowDragHint={setShowDragHint}
        onExportPdf={handleExportPdf} onExportExcel={handleExportExcel}
        onBilanMois={() => setShowBilanMois(true)}
      />

      <PlanningMiniCalendar
        showMiniCal={showMiniCal} setShowMiniCal={setShowMiniCal}
        viewMode={viewMode}
        monthStart={monthStart} weekStart={weekStart} selectedDate={selectedDate} today={today}
        setWeekStart={setWeekStart} setMonthStart={setMonthStart}
        setSelectedDate={setSelectedDate} setViewMode={setViewMode} setSelectedDay={setSelectedDay}
      />

      <PlanningViewRenderer
        viewMode={viewMode} selectedDate={selectedDate} today={today}
        eventsByDate={eventsByDate} filterTech={activeFilterTech} allowedTechs={allowedTechs}
        filterRetard={filterRetard} showRain={showRain} handleSelectEvent={handleSelectEvent}
        handleTouchStart={handleTouchStart} handleTouchEnd={handleTouchEnd} setSelectedDay={setSelectedDay}
        preleveurs={preleveurs} filterSite={filterSite} clients={clients}
        weekDays={weekDays} monthGrid={monthGrid} holidays={holidays}
        bilanBand={bilanBand} allDayItems={allDayItems}
        isDragging={isDragging} dragStart={dragStart} dragEnd={dragEnd}
        handleDragMouseDown={handleDragMouseDown} handleDragMouseEnter={handleDragMouseEnter}
        handleDragMouseUp={handleDragMouseUp} setIsDragging={setIsDragging}
        setDragStart={setDragStart} setDragEnd={setDragEnd}
        goToDay={goToDay} setCtxMenu={setCtxMenu} prev={prev} next={next}
        periodList={periodList} goToday={goToday}
      />

      <PlanningModals
        selectedDay={selectedDay} dayModalInitialTab={dayModalInitialTab}
        poolSamplings={poolSamplings} overduePool={overduePool}
        uid={uid} initiales={initiales} holidays={holidays}
        handleValidatePool={handleValidatePool} setSelectedDay={setSelectedDay}
        ctxMenu={ctxMenu} evenements={evenements} toggleRainDay={toggleRainDay}
        setDayModalInitialTab={setDayModalInitialTab} setCtxMenu={setCtxMenu}
        eventDetail={eventDetail} assignedEqIdsForDate={assignedEqIdsForDate}
        techOptions={techOptions} handleCancelSampling={handleCancelSampling}
        handleMoveEvent={handleMoveEvent} handleDeleteEvent={handleDeleteEvent}
        handleChangeTechnicien={handleChangeTechnicien}
        handleChangeEquipements={handleChangeEquipements} setEventDetail={setEventDetail}
        ghostDetail={ghostDetail} setGhostDetail={setGhostDetail}
        dragModal={dragModal} handleSaveEvenement={handleSaveEvenement} setDragModal={setDragModal}
        showBilanMois={showBilanMois} selectedDate={selectedDate}
        clients={clients} setShowBilanMois={setShowBilanMois}
      />
    </div>
  )
}
