import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useClientsListener } from '@/hooks/useClients'
// saveClient, createEvenement, deleteEvenement → usePlanningActions
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useVerificationsListener } from '@/hooks/useVerifications'
import { useMaintenancesListener } from '@/hooks/useMaintenances'
import { useEvenementsListener } from '@/hooks/useEvenements'
import { useUsersListener } from '@/hooks/useUsers'
import { usePreleveursListener } from '@/hooks/usePreleveurs'
import { useMissionsStore } from '@/stores/missionsStore'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useEvenementsStore } from '@/stores/evenementsStore'
import { useUsersStore } from '@/stores/usersStore'
import { usePreleveursStore } from '@/stores/preleveursStore'
import { useAuthStore, selectUid, selectInitiales } from '@/stores/authStore'
import {
  // Types
  type PlanningEvent, type ViewMode,
  // Constantes
  JOURS_LONG, MOIS_LONG,
  // Fonctions pure
  getFrenchHolidays,
  startOfWeek, startOfMonth, addDays, addMonths, sameDay,
  buildMonthGrid,
  getPeriodLabel,
} from '@/lib/planningUtils'
import { usePlanningData } from '@/hooks/usePlanningData'
import { usePlanningCalendar } from '@/hooks/usePlanningCalendar'
import { usePlanningDrag } from '@/hooks/usePlanningDrag'
import { usePlanningActions } from '@/hooks/usePlanningActions'
import DayModal          from '@/components/planning/DayModal'
import CellContextMenu   from '@/components/planning/CellContextMenu'
import GhostDetailModal  from '@/components/planning/GhostDetailModal'
import EventDetailModal  from '@/components/planning/EventDetailModal'
import DragCreateModal   from '@/components/planning/DragCreateModal'
import PlanningHeader     from '@/components/planning/PlanningHeader'
import DayView            from '@/components/planning/DayView'
import WeekView           from '@/components/planning/WeekView'
import MonthView          from '@/components/planning/MonthView'
import EventRow           from '@/components/planning/EventRow'
import MiniCalendarPanel  from '@/components/planning/MiniCalendarPanel'

// ── Composant principal ─────────────────────────────────────

export default function PlanningPage() {
  useClientsListener(); useEquipementsListener()
  useVerificationsListener(); useMaintenancesListener()
  useEvenementsListener(); useUsersListener()
  usePreleveursListener()

const uid        = useAuthStore(selectUid)
  const initiales  = useAuthStore(selectInitiales)
  const { clients }       = useMissionsStore()
  const { verifications } = useMetrologieStore()
  const { maintenances }  = useMaintenancesStore()
  const { evenements }    = useEvenementsStore()
  const users             = useUsersStore(s => s.users)
  const preleveurs        = usePreleveursStore(s => s.preleveurs)

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  // Jours fériés — recalculés chaque année (couvre l'année courante + suivante)
  const holidays = useMemo(() => ({
    ...getFrenchHolidays(today.getFullYear()),
    ...getFrenchHolidays(today.getFullYear() + 1),
  }), [today.getFullYear()])

  const [showDragHint, setShowDragHint] = useState(() => !localStorage.getItem('planning_drag_hint_seen'))

  const [viewMode,    setViewMode]    = useState<ViewMode>('semaine')
  const [weekStart,   setWeekStart]   = useState(() => startOfWeek(today))
  const [monthStart,  setMonthStart]  = useState(() => startOfMonth(today))
  const [selectedDate,setSelectedDate]= useState(today)
  const [filterTech,  setFilterTech]  = useState(() => localStorage.getItem('planning_filter_tech') ?? '')
  const [filterRetard,setFilterRetard]= useState(false)
  const [selectedDay,         setSelectedDay]         = useState<string|null>(null)
  const [dayModalInitialTab,  setDayModalInitialTab]  = useState<'pool'|'evt'>('pool')
  const [showRain,            setShowRain]            = useState(() => localStorage.getItem('planning_show_rain') === 'true')
  const [ctxMenu,             setCtxMenu]             = useState<{ dateStr: string; x: number; y: number } | null>(null)
  const [eventDetail,   setEventDetail]   = useState<{ event: PlanningEvent; dateStr: string } | null>(null)
  const [ghostDetail,   setGhostDetail]   = useState<{ event: PlanningEvent; dateStr: string } | null>(null)
  const [showMiniCal,   setShowMiniCal]   = useState(false)

  function handleSelectEvent(event: PlanningEvent, dateStr: string) {
    if (event.isGhost) setGhostDetail({ event, dateStr })
    else setEventDetail({ event, dateStr })
  }

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
  const { eventsByDate, allTechs, totalOverdue, techOptions, poolSamplings, overduePool } = usePlanningData({
    clients, maintenances, verifications, evenements, users, preleveurs, selectedDay,
  })

  // ── Calculs calendrier (filtrage, bilanBand, allDayItems, periodList) ──
  const {
    monthPoolCount, bilanBand, allDayItems, periodList,
  } = usePlanningCalendar({
    eventsByDate, evenements, clients,
    viewMode, weekDays, monthStart, weekStart, selectedDate,
    filterTech, filterRetard,
    handleSelectEvent,
  })

  // ── Actions Firestore ──────────────────────────────────
  const {
    handleCancelSampling, handleMoveEvent, handleDeleteEvent,
    toggleRainDay, handleChangeTechnicien, handleSaveEvenement, handleValidatePool,
  } = usePlanningActions({ uid, initiales, clients, evenements, holidays })

  // ── Navigation ──────────────────────────────────────────

  function prev() {
    if (viewMode==='jour') setSelectedDate(addDays(selectedDate,-1))
    else if (viewMode==='semaine') setWeekStart(addDays(weekStart,-7))
    else setMonthStart(addMonths(monthStart,-1))
    setSelectedDay(null)
  }
  function next() {
    if (viewMode==='jour') setSelectedDate(addDays(selectedDate,1))
    else if (viewMode==='semaine') setWeekStart(addDays(weekStart,7))
    else setMonthStart(addMonths(monthStart,1))
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
  function switchView(m:ViewMode) {
    setViewMode(m)
    if (m==='mois') setMonthStart(startOfMonth(selectedDate))
    if (m==='semaine') setWeekStart(startOfWeek(selectedDate))
    setSelectedDay(null)
  }

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
        totalOverdue={totalOverdue} filterRetard={filterRetard} setFilterRetard={setFilterRetard}
        showRain={showRain} setShowRain={setShowRain} preleveurs={preleveurs}
        monthPoolCount={monthPoolCount} showDragHint={showDragHint} setShowDragHint={setShowDragHint}
      />

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
        }}>
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
        <div className="hidden md:block absolute inset-0 z-20"
          onClick={() => setShowMiniCal(false)} />
      )}

      {/* ── Bandeau "à planifier" — visible en vue mois/semaine quand le pool n'est pas vide ── */}
      {viewMode !== 'jour' && monthPoolCount > 0 && (
        <div className="flex items-center gap-2 px-4 md:px-6 py-2 shrink-0"
          style={{ background: 'var(--color-accent-light)', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--color-accent)' }} />
          <p className="text-xs" style={{ color: 'var(--color-accent)' }}>
            <span className="font-semibold">
              {monthPoolCount} prélèvement{monthPoolCount > 1 ? 's' : ''} à planifier ce mois
            </span>
            <span className="font-normal" style={{ opacity: 0.75 }}>
              {' '}— clic droit sur un jour pour les assigner
            </span>
          </p>
        </div>
      )}

      {/* ── Hint premier drag (affiché une seule fois) ── */}
      {showDragHint && viewMode !== 'jour' && (
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2 shrink-0"
          style={{ background: 'var(--color-success-light)', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <p className="text-xs" style={{ color: 'var(--color-success)' }}>
            <span className="font-semibold">Astuce —</span> glisse sur plusieurs jours pour créer rapidement un événement (congé, rappel, réunion…)
          </p>
          <button
            onClick={() => { setShowDragHint(false); localStorage.setItem('planning_drag_hint_seen', '1') }}
            className="text-xs font-medium shrink-0 px-2 py-0.5 rounded"
            style={{ color: 'var(--color-success)', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,199,89,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            OK
          </button>
        </div>
      )}

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

      {/* ── DESKTOP : vue calendrier grille ── */}
      <div className={viewMode === 'jour' ? 'hidden' : 'hidden md:flex flex-col flex-1 overflow-hidden'}>

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
          />
        )}
      </div>

      {/* ── MOBILE : scroll vertical liste ── */}
      <div className={viewMode === 'jour' ? 'hidden' : 'md:hidden flex-1 overflow-y-auto'}>
        <div className="px-4 py-4 space-y-4">
          {periodList.length===0 ? (
            <div className="rounded-xl px-5 py-12 text-center"
              style={{ background:'var(--color-bg-secondary)', border:'1px solid var(--color-border-subtle)' }}>
              <p className="text-sm" style={{ color:'var(--color-text-tertiary)' }}>
                {filterRetard ? 'Aucun prélèvement en retard.' : 'Aucune intervention cette période.'}
              </p>
              <button onClick={goToday} className="mt-3 text-xs" style={{ color:'var(--color-accent)' }}>
                Revenir à aujourd'hui
              </button>
            </div>
          ) : (
            periodList.map(({date, dateStr, events}) => {
              const isToday = sameDay(date,today)
              const dayIdx = (date.getDay()+6)%7
              return (
                <div key={dateStr}>
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <span className="text-xs font-semibold capitalize"
                      style={{ color:isToday?'#FF3B30':'var(--color-text-secondary)' }}>
                      {JOURS_LONG[dayIdx]} {date.getDate()} {MOIS_LONG[date.getMonth()]}
                    </span>
                    {isToday && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background:'rgba(255,59,48,0.1)', color:'#FF3B30' }}>
                        Aujourd'hui
                      </span>
                    )}
                    <button onClick={() => goToDay(dateStr)}
                      className="ml-auto flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ color:'var(--color-text-tertiary)', border:'1px solid var(--color-border-subtle)' }}>
                      <Plus size={9} /> Ajouter
                    </button>
                  </div>
                  <div className="rounded-xl overflow-hidden"
                    style={{ background:'var(--color-bg-secondary)', border:'1px solid var(--color-border-subtle)', boxShadow:'var(--shadow-card)' }}>
                    {events.map((evt,i) => <EventRow key={evt.id} event={evt} isLast={i===events.length-1} onSelect={e => handleSelectEvent(e, dateStr)} />)}
                  </div>
                </div>
              )
            })
          )}
        </div>
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
