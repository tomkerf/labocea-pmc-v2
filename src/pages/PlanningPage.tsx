import { useState, useMemo, useReducer } from 'react'
import { useClientsListener } from '@/hooks/useClients'
// saveClient, createEvenement, deleteEvenement → usePlanningActions
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
  // Types
  type PlanningEvent, type ViewMode,
  // Fonctions pure
  getFrenchHolidays,
  startOfWeek, startOfMonth, addDays,
  buildMonthGrid,
  getPeriodLabel,
  toISO,
} from '@/lib/planningUtils'
import { usePlanningData } from '@/hooks/usePlanningData'
import { usePlanningCalendar } from '@/hooks/usePlanningCalendar'
import { usePlanningDrag } from '@/hooks/usePlanningDrag'
import { usePlanningActions } from '@/hooks/usePlanningActions'
import { usePlanningNavigation } from '@/hooks/usePlanningNavigation'
import { usePlanningFilters } from '@/hooks/usePlanningFilters'
import DayModal          from '@/components/planning/DayModal'
import CellContextMenu   from '@/components/planning/CellContextMenu'
import GhostDetailModal  from '@/components/planning/GhostDetailModal'
import EventDetailModal  from '@/components/planning/EventDetailModal'
import DragCreateModal   from '@/components/planning/DragCreateModal'
import PlanningHeader     from '@/components/planning/PlanningHeader'
import DayView            from '@/components/planning/DayView'
import WeekView           from '@/components/planning/WeekView'
import MonthView          from '@/components/planning/MonthView'
import PeriodListView     from '@/components/planning/PeriodListView'
import PlanningMiniCalendar from '@/components/planning/PlanningMiniCalendar'
import MapView            from '@/components/planning/MapView'
import YearMatrixView     from '@/components/planning/YearMatrixView'
import BilanMoisModal     from '@/components/planning/BilanMoisModal'

// ── UI State ────────────────────────────────────────────────

type UIState = {
  showDragHint: boolean
  showRain: boolean
  showMiniCal: boolean
  showBilanMois: boolean
  selectedDay: string | null
  dayModalInitialTab: 'pool' | 'evt'
  ctxMenu: { dateStr: string; x: number; y: number } | null
  eventDetail: { event: PlanningEvent; dateStr: string } | null
  ghostDetail: { event: PlanningEvent; dateStr: string } | null
  dragModal: { dateDebut: string; dateFin: string } | null
}

type UIAction =
  | { type: 'SET_SHOW_DRAG_HINT'; value: boolean }
  | { type: 'SET_SHOW_RAIN'; value: boolean }
  | { type: 'SET_SHOW_MINI_CAL'; value: boolean }
  | { type: 'SET_SHOW_BILAN_MOIS'; value: boolean }
  | { type: 'SET_SELECTED_DAY'; value: string | null }
  | { type: 'SET_DAY_MODAL_TAB'; value: 'pool' | 'evt' }
  | { type: 'SET_CTX_MENU'; value: { dateStr: string; x: number; y: number } | null }
  | { type: 'SET_EVENT_DETAIL'; value: { event: PlanningEvent; dateStr: string } | null }
  | { type: 'SET_GHOST_DETAIL'; value: { event: PlanningEvent; dateStr: string } | null }
  | { type: 'SET_DRAG_MODAL'; value: { dateDebut: string; dateFin: string } | null }

type NavState = {
  viewMode: ViewMode
  weekStart: Date
  monthStart: Date
  selectedDate: Date
}
type NavAction =
  | { type: 'SET_VIEW_MODE'; value: ViewMode }
  | { type: 'SET_WEEK_START'; value: Date }
  | { type: 'SET_MONTH_START'; value: Date }
  | { type: 'SET_SELECTED_DATE'; value: Date }

function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case 'SET_VIEW_MODE':     return { ...state, viewMode: action.value }
    case 'SET_WEEK_START':    return { ...state, weekStart: action.value }
    case 'SET_MONTH_START':   return { ...state, monthStart: action.value }
    case 'SET_SELECTED_DATE': return { ...state, selectedDate: action.value }
  }
}

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_SHOW_DRAG_HINT':  return { ...state, showDragHint: action.value }
    case 'SET_SHOW_RAIN':       return { ...state, showRain: action.value }
    case 'SET_SHOW_MINI_CAL':   return { ...state, showMiniCal: action.value }
    case 'SET_SHOW_BILAN_MOIS': return { ...state, showBilanMois: action.value }
    case 'SET_SELECTED_DAY':    return { ...state, selectedDay: action.value }
    case 'SET_DAY_MODAL_TAB':   return { ...state, dayModalInitialTab: action.value }
    case 'SET_CTX_MENU':        return { ...state, ctxMenu: action.value }
    case 'SET_EVENT_DETAIL':    return { ...state, eventDetail: action.value }
    case 'SET_GHOST_DETAIL':    return { ...state, ghostDetail: action.value }
    case 'SET_DRAG_MODAL':      return { ...state, dragModal: action.value }
  }
}

// ── Composant principal ─────────────────────────────────────

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

  // Jours fériés — recalculés chaque année (couvre l'année courante + suivante)
  const todayYear = today.getFullYear()
  const holidays = useMemo(() => ({
    ...getFrenchHolidays(todayYear),
    ...getFrenchHolidays(todayYear + 1),
  }), [todayYear])

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

  const setShowDragHint  = (value: boolean) => dispatch({ type: 'SET_SHOW_DRAG_HINT', value })
  const setShowRain      = (value: boolean) => dispatch({ type: 'SET_SHOW_RAIN', value })
  const setShowMiniCal   = (value: boolean) => dispatch({ type: 'SET_SHOW_MINI_CAL', value })
  const setShowBilanMois = (value: boolean) => dispatch({ type: 'SET_SHOW_BILAN_MOIS', value })
  const setSelectedDay   = (value: string | null) => dispatch({ type: 'SET_SELECTED_DAY', value })
  const setDayModalInitialTab = (value: 'pool' | 'evt') => dispatch({ type: 'SET_DAY_MODAL_TAB', value })
  const setCtxMenu       = (value: { dateStr: string; x: number; y: number } | null) => dispatch({ type: 'SET_CTX_MENU', value })
  const setEventDetail   = (value: { event: PlanningEvent; dateStr: string } | null) => dispatch({ type: 'SET_EVENT_DETAIL', value })
  const setGhostDetail   = (value: { event: PlanningEvent; dateStr: string } | null) => dispatch({ type: 'SET_GHOST_DETAIL', value })
  const setDragModal     = (value: { dateDebut: string; dateFin: string } | null) => dispatch({ type: 'SET_DRAG_MODAL', value })

  const [nav, dispatchNav] = useReducer(navReducer, {
    viewMode: 'semaine' as ViewMode,
    weekStart: startOfWeek(today),
    monthStart: startOfMonth(today),
    selectedDate: today,
  })
  const { viewMode, weekStart, monthStart, selectedDate } = nav
  const setViewMode    = (value: ViewMode) => dispatchNav({ type: 'SET_VIEW_MODE', value })
  const setWeekStart   = (value: Date) => dispatchNav({ type: 'SET_WEEK_START', value })
  const setMonthStart  = (value: Date) => dispatchNav({ type: 'SET_MONTH_START', value })
  const setSelectedDate = (value: Date) => dispatchNav({ type: 'SET_SELECTED_DATE', value })

  const [filterTech,  setFilterTech]  = useState(() => {
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

  // ── Navigation ──────────────────────────────────────────
  const { prev, next, goToday, goToDay, switchView } = usePlanningNavigation({
    viewMode, setViewMode, today,
    selectedDate, setSelectedDate,
    weekStart, setWeekStart,
    monthStart, setMonthStart,
    setSelectedDay,
  })

  // ── Drag-to-create + swipe ──────────────────────────────
  const {
    handleTouchStart, handleTouchEnd,
    isDragging,
    setIsDragging, setDragStart, setDragEnd,
    isInDrag, handleDragMouseDown, handleDragMouseEnter, handleDragMouseUp,
  } = usePlanningDrag({ selectedDate, setSelectedDate, goToDay, setDragModal })

  const weekDays  = useMemo(() => Array.from({length:7},(_,i) => addDays(weekStart,i)), [weekStart])
  const monthGrid = useMemo(() => buildMonthGrid(monthStart), [monthStart])

  // ── Calculs dérivés des données Firestore ───────────────
  const { eventsByDate, allTechs, techOptions, poolSamplings, overduePool } = usePlanningData({
    clients, maintenances, equipements, evenements, todos, users, preleveurs, selectedDay,
  })

  const { visibleTechs, allowedTechs, activeFilterTech } = usePlanningFilters({
    allTechs, preleveurs, filterTech, filterSite,
  })

  // ── Calculs calendrier (filtrage, bilanBand, allDayItems, periodList) ──
  const {
    monthPoolCount, bilanBand, allDayItems, periodList, filteredForDayFlat,
  } = usePlanningCalendar({
    eventsByDate, evenements, clients,
    viewMode, weekDays, monthStart, weekStart, selectedDate,
    filterTech: activeFilterTech, allowedTechs, filterRetard,
    handleSelectEvent,
  })

  // ── Événements de la période active (pour exports) ──────────
  const activePeriodEvents = useMemo(() => {
    const dates: string[] = []
    if (viewMode === 'jour' || viewMode === 'carte') {
      dates.push(toISO(selectedDate))
    } else if (viewMode === 'semaine') {
      weekDays.forEach(d => dates.push(toISO(d)))
    } else if (viewMode === 'mois') {
      monthGrid.forEach(d => {
        if (d) {
          dates.push(toISO(d))
        }
      })
    }

    const list: PlanningEvent[] = []
    const seen = new Set<string>()
    dates.forEach(dateStr => {
      const dayEvts = filteredForDayFlat(dateStr)
      dayEvts.forEach(e => {
        if (!seen.has(e.id)) {
          seen.add(e.id)
          list.push(e)
        }
      })
    })
    return list
  }, [viewMode, selectedDate, weekDays, monthGrid, filteredForDayFlat])

  const handleExportPdf = () => {
    import('@/lib/exportPlanningPdf').then(({ exportPlanningPdf }) => {
      exportPlanningPdf(activePeriodEvents, periodLabel, activeFilterTech, users)
    })
  }

  const handleExportExcel = () => {
    import('@/lib/exportPlanningExcel').then(({ exportPlanningExcel }) => {
      exportPlanningExcel(activePeriodEvents, periodLabel, activeFilterTech)
    })
  }

  // ── Actions Firestore ──────────────────────────────────
  const {
    handleCancelSampling, handleMoveEvent, handleDeleteEvent,
    toggleRainDay, handleChangeTechnicien, handleChangeEquipements, handleSaveEvenement, handleValidatePool,
  } = usePlanningActions({ uid, initiales, clients, evenements, holidays })

  // ── Label période ───────────────────────────────────────

  const periodLabel = getPeriodLabel(viewMode, selectedDate, weekStart, monthStart)


  // ── Conflits matériel pour le modal ouvert ──────────────
  const assignedEqIdsForDate = eventDetail
    ? (eventsByDate[eventDetail.dateStr] || [])
        .filter(e => e.id !== eventDetail.event.id && e.type === 'prelevement' && e.equipementsAssignes)
        .flatMap(e => e.equipementsAssignes || [])
    : []

  // ── Render ──────────────────────────────────────────────

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

      {/* ── Panneau mini-calendrier overlay (desktop) ── */}
      <PlanningMiniCalendar
        showMiniCal={showMiniCal}
        setShowMiniCal={setShowMiniCal}
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
      />


      {/* ── VUE JOUR (toutes tailles) ── */}
      {viewMode === 'jour' && (
        <DayView
          selectedDate={selectedDate}
          today={today}
          eventsByDate={eventsByDate}
          filterTech={activeFilterTech}
          allowedTechs={allowedTechs}
          filterRetard={filterRetard}
          showRain={showRain}
          handleTouchStart={handleTouchStart}
          handleTouchEnd={handleTouchEnd}
          handleSelectEvent={handleSelectEvent}
          setSelectedDay={setSelectedDay}
        />
      )}

      {/* ── VUE CARTE (toutes tailles) ── */}
      {viewMode === 'carte' && (
        <MapView
          selectedDate={selectedDate}
          today={today}
          eventsByDate={eventsByDate}
          filterTech={activeFilterTech}
          allowedTechs={allowedTechs}
          filterRetard={filterRetard}
          preleveurs={preleveurs}
          handleSelectEvent={handleSelectEvent}
        />
      )}

      {/* ── VUE ANNÉE (toutes tailles) ── */}
      {viewMode === 'annee' && (
        <YearMatrixView
          clients={clients}
          year={selectedDate.getFullYear()}
          filterTech={activeFilterTech}
          filterSite={filterSite}
          preleveurs={preleveurs}
        />
      )}

      {/* ── DESKTOP : vue calendrier grille ── */}
      <div className={(viewMode === 'semaine' || viewMode === 'mois') ? 'hidden md:flex flex-col flex-1 overflow-hidden' : 'hidden'}>

        {viewMode==='semaine' && (
          <WeekView
            weekDays={weekDays}
            today={today}
            holidays={holidays}
            eventsByDate={eventsByDate}
            bilanBand={bilanBand}
            allDayItems={allDayItems}
            filterTech={activeFilterTech}
            allowedTechs={allowedTechs}
            filterRetard={filterRetard}
            showRain={showRain}
            isDragging={isDragging}
            handleDragMouseDown={handleDragMouseDown}
            handleDragMouseEnter={handleDragMouseEnter}
            handleDragMouseUp={handleDragMouseUp}
            setIsDragging={setIsDragging}
            setDragStart={setDragStart}
            setDragEnd={setDragEnd}
            handleSelectEvent={handleSelectEvent}
            goToDay={goToDay}
            setCtxMenu={setCtxMenu}
            isInDrag={isInDrag}
          />
        )}

        {viewMode==='mois' && (
          <MonthView
            monthGrid={monthGrid}
            today={today}
            holidays={holidays}
            eventsByDate={eventsByDate}
            filterTech={activeFilterTech}
            allowedTechs={allowedTechs}
            filterRetard={filterRetard}
            showRain={showRain}
            isDragging={isDragging}
            handleDragMouseDown={handleDragMouseDown}
            handleDragMouseEnter={handleDragMouseEnter}
            handleDragMouseUp={handleDragMouseUp}
            setIsDragging={setIsDragging}
            setDragStart={setDragStart}
            setDragEnd={setDragEnd}
            handleSelectEvent={handleSelectEvent}
            goToDay={goToDay}
            setCtxMenu={setCtxMenu}
            isInDrag={isInDrag}
            prev={prev}
            next={next}
          />
        )}
      </div>

      {/* ── MOBILE : scroll vertical liste ── */}
      <div className={(viewMode === 'semaine' || viewMode === 'mois') ? 'md:hidden flex-1 overflow-y-auto' : 'hidden'}>
        <PeriodListView
          periodList={periodList}
          today={today}
          filterRetard={filterRetard}
          goToday={goToday}
          goToDay={goToDay}
          handleSelectEvent={handleSelectEvent}
        />
      </div>

      {/* ── DayModal ── */}
      {selectedDay && (
        <DayModal
          key={selectedDay + dayModalInitialTab}
          dateStr={selectedDay}
          onClose={() => setSelectedDay(null)}
          pool={poolSamplings}
          overduePool={overduePool}
          uid={uid}
          initiales={initiales}
          onValidatePool={handleValidatePool}
          initialTab={dayModalInitialTab}
          holidays={holidays}
        />
      )}

      {/* ── CellContextMenu ── */}
      {ctxMenu && (
        <CellContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          holidayName={holidays[ctxMenu.dateStr]}
          hasRain={evenements.some(e => e.type === 'meteo' && e.date === ctxMenu.dateStr)}
          onToggleRain={() => toggleRainDay(ctxMenu.dateStr)}
          onPlanifier={() => {
            setDayModalInitialTab('pool')
            setSelectedDay(ctxMenu.dateStr)
          }}
          onEvenement={() => {
            setDayModalInitialTab('evt')
            setSelectedDay(ctxMenu.dateStr)
          }}
        />
      )}

      {/* ── EventDetailModal ── */}
      {eventDetail && (
        <EventDetailModal
          key={eventDetail.event.id}
          event={eventDetail.event}
          dateStr={eventDetail.dateStr}
          assignedEqIdsForDate={assignedEqIdsForDate}
          onClose={() => setEventDetail(null)}
          onCancel={handleCancelSampling}
          onMove={handleMoveEvent}
          onDelete={handleDeleteEvent}
          onChangeTech={handleChangeTechnicien}
          onChangeEquipements={handleChangeEquipements}
          techOptions={techOptions}
        />
      )}

      {/* ── GhostDetailModal ── */}
      {ghostDetail && (
        <GhostDetailModal
          event={ghostDetail.event}
          onClose={() => setGhostDetail(null)}
        />
      )}

      {/* ── DragCreateModal ── */}
      {dragModal && (
        <DragCreateModal
          dateDebut={dragModal.dateDebut}
          dateFin={dragModal.dateFin}
          onClose={() => setDragModal(null)}
          onSave={handleSaveEvenement}
        />
      )}

      {/* ── BilanMoisModal ── */}
      {showBilanMois && (
        <BilanMoisModal
          onClose={() => setShowBilanMois(false)}
          month={selectedDate.getMonth()}
          year={selectedDate.getFullYear()}
          clients={clients}
        />
      )}
    </div>
  )
}
