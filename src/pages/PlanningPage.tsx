import { useState, useMemo } from 'react'
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

  const [showDragHint, setShowDragHint] = useState(() => !localStorage.getItem('planning_drag_hint_seen'))

  const [viewMode,    setViewMode]    = useState<ViewMode>('semaine')
  const [weekStart,   setWeekStart]   = useState(() => startOfWeek(today))
  const [monthStart,  setMonthStart]  = useState(() => startOfMonth(today))
  const [selectedDate,setSelectedDate]= useState(today)
  const [filterTech,  setFilterTech]  = useState(() => localStorage.getItem('planning_filter_tech') ?? '')
  const [filterRetard] = useState(false)
  const [selectedDay,         setSelectedDay]         = useState<string|null>(null)
  const [dayModalInitialTab,  setDayModalInitialTab]  = useState<'pool'|'evt'>('pool')
  const [showRain,            setShowRain]            = useState(() => localStorage.getItem('planning_show_rain') !== 'false')
  const [ctxMenu,             setCtxMenu]             = useState<{ dateStr: string; x: number; y: number } | null>(null)
  const [eventDetail,   setEventDetail]   = useState<{ event: PlanningEvent; dateStr: string } | null>(null)
  const [ghostDetail,   setGhostDetail]   = useState<{ event: PlanningEvent; dateStr: string } | null>(null)
  const [showMiniCal,   setShowMiniCal]   = useState(false)

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
  const [dragModal, setDragModal] = useState<{ dateDebut: string; dateFin: string } | null>(null)

  const {
    handleTouchStart, handleTouchEnd,
    isDragging,
    setIsDragging, setDragStart, setDragEnd,
    isInDrag, handleDragMouseDown, handleDragMouseEnter, handleDragMouseUp,
  } = usePlanningDrag({ setSelectedDate, goToDay, setDragModal })

  const weekDays  = useMemo(() => Array.from({length:7},(_,i) => addDays(weekStart,i)), [weekStart])
  const monthGrid = useMemo(() => buildMonthGrid(monthStart), [monthStart])

  // ── Calculs dérivés des données Firestore ───────────────
  const { eventsByDate, allTechs, techOptions, poolSamplings, overduePool } = usePlanningData({
    clients, maintenances, equipements, evenements, todos, users, preleveurs, selectedDay,
  })

  // ── Calculs calendrier (filtrage, bilanBand, allDayItems, periodList) ──
  const {
    monthPoolCount, bilanBand, allDayItems, periodList, filteredForDayFlat,
  } = usePlanningCalendar({
    eventsByDate, evenements, clients,
    viewMode, weekDays, monthStart, weekStart, selectedDate,
    filterTech, filterRetard,
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
      exportPlanningPdf(activePeriodEvents, periodLabel, filterTech, users)
    })
  }

  const handleExportExcel = () => {
    import('@/lib/exportPlanningExcel').then(({ exportPlanningExcel }) => {
      exportPlanningExcel(activePeriodEvents, periodLabel, filterTech)
    })
  }

  // ── Actions Firestore ──────────────────────────────────
  const {
    handleCancelSampling, handleMoveEvent, handleDeleteEvent,
    toggleRainDay, handleChangeTechnicien, handleSaveEvenement, handleValidatePool,
  } = usePlanningActions({ uid, initiales, clients, evenements, holidays })

  // ── Label période ───────────────────────────────────────

  const periodLabel = getPeriodLabel(viewMode, selectedDate, weekStart, monthStart)


  // ── Render ──────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full relative">

      <PlanningHeader
        periodLabel={periodLabel} viewMode={viewMode}
        prev={prev} next={next} goToday={goToday} switchView={switchView}
        showMiniCal={showMiniCal} setShowMiniCal={setShowMiniCal}
        allTechs={allTechs} filterTech={filterTech} setFilterTech={setFilterTech}
        showRain={showRain} setShowRain={setShowRain} preleveurs={preleveurs}
        monthPoolCount={monthPoolCount} showDragHint={showDragHint} setShowDragHint={setShowDragHint}
        onExportPdf={handleExportPdf} onExportExcel={handleExportExcel}
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
          filterTech={filterTech}
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
          filterTech={filterTech}
          filterRetard={filterRetard}
          preleveurs={preleveurs}
          handleSelectEvent={handleSelectEvent}
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
            filterTech={filterTech}
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
            filterTech={filterTech}
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
          onClose={() => setEventDetail(null)}
          onCancel={handleCancelSampling}
          onMove={handleMoveEvent}
          onDelete={handleDeleteEvent}
          onChangeTech={handleChangeTechnicien}
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

    </div>
  )
}
