import { useState, useMemo, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react'
import { useClientsListener } from '@/hooks/useClients'
import { saveClient } from '@/services/clientService'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useVerificationsListener } from '@/hooks/useVerifications'
import { useMaintenancesListener } from '@/hooks/useMaintenances'
import { useEvenementsListener } from '@/hooks/useEvenements'
import { createEvenement, deleteEvenement } from '@/services/evenementService'
import { useUsersListener } from '@/hooks/useUsers'
import { usePreleveursListener } from '@/hooks/usePreleveurs'
import { useMissionsStore } from '@/stores/missionsStore'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useEvenementsStore } from '@/stores/evenementsStore'
import { useUsersStore } from '@/stores/usersStore'
import { usePreleveursStore } from '@/stores/preleveursStore'
import { useAuthStore, selectUid, selectInitiales } from '@/stores/authStore'
import type { Client, Sampling, TypeEvenement } from '@/types'
import {
  // Types
  type PlanningEvent, type PoolItem, type ViewMode,
  // Constantes
  JOURS_LONG, MOIS_LONG,
  // Fonctions pure
  getTechColor,
  getFrenchHolidays,
  startOfWeek, startOfMonth, addDays, addMonths, toISO, sameDay,
  buildMonthGrid,
  getPeriodLabel,
} from '@/lib/planningUtils'
import { usePlanningData } from '@/hooks/usePlanningData'
import { usePlanningCalendar } from '@/hooks/usePlanningCalendar'
import DayModal          from '@/components/planning/DayModal'
import CellContextMenu   from '@/components/planning/CellContextMenu'
import GhostDetailModal  from '@/components/planning/GhostDetailModal'
import EventDetailModal  from '@/components/planning/EventDetailModal'
import DragCreateModal   from '@/components/planning/DragCreateModal'
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

  // ── Swipe vue Jour (mobile) ─────────────────────────────
  const swipeStartX = useRef<number | null>(null)
  const swipeStartY = useRef<number | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX
    swipeStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return
    const dx = e.changedTouches[0].clientX - swipeStartX.current
    const dy = e.changedTouches[0].clientY - swipeStartY.current
    // Swipe horizontal uniquement (ignore si principalement vertical = scroll)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) setSelectedDate(d => addDays(d, 1))   // ← swipe gauche = jour suivant
      else        setSelectedDate(d => addDays(d, -1))  // → swipe droit = jour précédent
    }
    swipeStartX.current = null
    swipeStartY.current = null
  }, [])

  // ── Drag-to-create ──────────────────────────────────────
  const [dragStart,   setDragStart]   = useState<string|null>(null)
  const [dragEnd,     setDragEnd]     = useState<string|null>(null)
  const [isDragging,  setIsDragging]  = useState(false)
  const [dragModal,   setDragModal]   = useState<{ dateDebut: string; dateFin: string } | null>(null)

  function dragRangeMin() { return dragStart && dragEnd ? (dragStart < dragEnd ? dragStart : dragEnd) : null }
  function dragRangeMax() { return dragStart && dragEnd ? (dragStart > dragEnd ? dragStart : dragEnd) : null }
  function isInDrag(dateStr: string): boolean {
    const mn = dragRangeMin(); const mx = dragRangeMax()
    return !!(isDragging && mn && mx && dateStr >= mn && dateStr <= mx)
  }

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

  // ── Gestion des samplings ───────────────────────────────

  // Retire un sampling du calendrier → remet plannedDay à 0, log le motif dans reportHistory
  async function handleCancelSampling(event: PlanningEvent, reason: string) {
    if (!uid || !event.clientId || !event.planId || !event.samplingId) return
    const client = clients.find((c: Client) => c.id === event.clientId)
    if (!client) return
    await saveClient({
      ...client,
      plans: client.plans.map(plan => plan.id !== event.planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) => {
          if (s.id !== event.samplingId) return s
          const fromDate = toISO(new Date(new Date().getFullYear(), s.plannedMonth, s.plannedDay))
          const historyEntry = { from: fromDate, to: '', by: uid, reason, at: new Date().toISOString() }
          return { ...s, plannedDay: 0, motif: reason, reportHistory: [...(s.reportHistory ?? []), historyEntry] }
        })
      })
    }, uid)
  }

  // Déplace un sampling vers une nouvelle date, log le motif dans reportHistory
  async function handleMoveEvent(event: PlanningEvent, newDate: string, reason: string) {
    if (!uid || !event.clientId || !event.planId || !event.samplingId) return
    const client = clients.find((c: Client) => c.id === event.clientId)
    if (!client) return
    const newDateObj   = new Date(newDate + 'T12:00:00')
    const plannedDay   = newDateObj.getDate()
    const plannedMonth = newDateObj.getMonth()
    await saveClient({
      ...client,
      plans: client.plans.map(plan => plan.id !== event.planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) => {
          if (s.id !== event.samplingId) return s
          const fromDate = toISO(new Date(new Date().getFullYear(), s.plannedMonth, s.plannedDay))
          const historyEntry = { from: fromDate, to: newDate, by: uid, reason, at: new Date().toISOString() }
          return { ...s, plannedDay, plannedMonth, reportHistory: [...(s.reportHistory ?? []), historyEntry] }
        })
      })
    }, uid)
  }

  // Supprime un événement personnel
  function handleDeleteEvent(event: PlanningEvent) {
    if (event.evenementData) deleteEvenement(event.evenementData.id)
  }

  // Alterne l'état "pluie" (météo prévue) pour un jour donné
  async function toggleRainDay(dateStr: string) {
    if (!uid) return
    const existing = evenements.find(e => e.type === 'meteo' && e.date === dateStr)
    if (existing) {
      await deleteEvenement(existing.id)
    } else {
      await createEvenement('Pluie prévue', dateStr, 'meteo', '', '', uid, initiales)
    }
  }

  // Change le technicien assigné à UN seul prélèvement (sampling.assignedTo)
  // Ne modifie pas client.preleveur pour ne pas affecter les autres prélèvements
  async function handleChangeTechnicien(event: PlanningEvent, initiales_: string) {
    if (!uid || !event.clientId || !event.planId || !event.samplingId) return
    const client = clients.find((c: Client) => c.id === event.clientId)
    if (!client) return
    await saveClient({
      ...client,
      plans: client.plans.map(plan => plan.id !== event.planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) =>
          s.id !== event.samplingId ? s : { ...s, assignedTo: initiales_ }
        ),
      }),
    }, uid)
  }

  // Crée un événement personnel (avec dateFin optionnelle)
  async function handleSaveEvenement(
    titre: string, type: TypeEvenement,
    dateDebut: string, dateFin: string,
    heure: string, notes: string,
  ) {
    if (!uid) return
    await createEvenement(titre, dateDebut, type, heure, notes, uid, initiales, dateFin || undefined)
  }

  // ── Drag-to-create handlers ─────────────────────────────────
  function handleDragMouseDown(e: React.MouseEvent, dateStr: string) {
    // Seulement clic gauche
    if (e.button !== 0) return
    e.preventDefault()
    setDragStart(dateStr)
    setDragEnd(dateStr)
    setIsDragging(true)
  }
  function handleDragMouseEnter(dateStr: string) {
    if (isDragging) setDragEnd(dateStr)
  }
  function handleDragMouseUp(e: React.MouseEvent) {
    if (!isDragging || !dragStart || !dragEnd) return
    e.stopPropagation()
    const mn = dragRangeMin()!
    const mx = dragRangeMax()!
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
    // Si c'est un simple clic (même case), ouvrir la vue Jour
    if (mn === mx) {
      goToDay(mn)
      return
    }
    setDragModal({ dateDebut: mn, dateFin: mx })
  }

  // Planifie un sampling à un jour précis du mois (sans le marquer "fait")
  async function handleValidatePool(item: PoolItem, date: string) {
    if (!uid) return
    if (holidays[date]) return // jour férié — bloqué
    const client = clients.find((c: Client) => c.id === item.clientId)
    if (!client) return
    const poolDateObj  = new Date(date + 'T12:00:00')
    const plannedDay   = poolDateObj.getDate()
    const plannedMonth = poolDateObj.getMonth()
    await saveClient({
      ...client,
      plans: client.plans.map(plan => plan.id !== item.planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) =>
          s.id !== item.sampling.id ? s : { ...s, plannedDay, plannedMonth }
        )
      })
    }, uid)
  }

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

      {/* En-tête navigation */}
      <div className="flex flex-col shrink-0"
        style={{ borderBottom:'1px solid var(--color-border-subtle)', background:'var(--color-bg-secondary)' }}>

        {/* Ligne 1 : navigation période + toggle vue */}
        <div className="flex items-center justify-between px-4 md:px-6 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <button onClick={prev} className="p-1.5 rounded-lg" style={{ color:'var(--color-text-secondary)' }}
              onMouseEnter={e=>(e.currentTarget.style.background='var(--color-bg-tertiary)')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold min-w-[180px] text-center" style={{ color:'var(--color-text-primary)' }}>
              {periodLabel}
            </span>
            <button onClick={next} className="p-1.5 rounded-lg" style={{ color:'var(--color-text-secondary)' }}
              onMouseEnter={e=>(e.currentTarget.style.background='var(--color-bg-tertiary)')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <ChevronRight size={18} />
            </button>
            <button onClick={goToday}
              className="hidden md:block px-2.5 py-1 rounded-lg text-xs font-medium ml-1"
              style={{ background:'var(--color-bg-tertiary)', color:'var(--color-text-secondary)', border:'1px solid var(--color-border-subtle)' }}>
              Aujourd'hui
            </button>
            <button onClick={() => setShowMiniCal(v => !v)}
              className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg ml-1"
              style={{
                background: showMiniCal ? 'var(--color-accent-light)' : 'var(--color-bg-tertiary)',
                color: showMiniCal ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-subtle)',
              }}
              title="Mini-calendrier">
              <Calendar size={13} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle vue */}
            <div className="flex rounded-lg overflow-hidden"
              style={{ border:'1px solid var(--color-border-subtle)', background:'var(--color-bg-tertiary)' }}>
              {(['jour','semaine','mois'] as ViewMode[]).map(m => (
                <button key={m} onClick={() => switchView(m)}
                  className="px-3 py-1.5 text-xs font-medium capitalize"
                  style={{ background:viewMode===m?'var(--color-accent)':'transparent', color:viewMode===m?'white':'var(--color-text-secondary)' }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ligne 2 : filtres technicien + retard */}
        {(allTechs.length > 1 || totalOverdue > 0) && (
          <div className="flex items-center gap-2 px-4 md:px-6 pb-3 flex-wrap">
            {/* Filtre technicien */}
            {allTechs.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button onClick={() => { setFilterTech(''); localStorage.removeItem('planning_filter_tech') }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background:!filterTech?'var(--color-accent)':'var(--color-bg-secondary)', color:!filterTech?'white':'var(--color-text-secondary)', border:`1px solid ${!filterTech?'transparent':'var(--color-border-subtle)'}` }}>
                  Tous
                </button>
                {allTechs.map(t => {
                  const isActive = filterTech === t
                  const prel = preleveurs.find(p => p.code === t)
                  const label = prel?.nom
                    ? prel.nom.split(' ')[0] + ' · ' + t
                    : t
                  const tc = getTechColor(t)
                  return (
                    <button key={t} onClick={() => { const v=t===filterTech?'':t; setFilterTech(v); v ? localStorage.setItem('planning_filter_tech',v) : localStorage.removeItem('planning_filter_tech') }}
                      className="px-3 py-1.5 rounded-full text-xs font-medium"
                      style={{
                        background: isActive ? tc.color : tc.bg,
                        color: isActive ? 'white' : tc.color,
                        border: `1px solid ${isActive ? 'transparent' : tc.color + '55'}`,
                      }}>
                      {label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Filtre retard */}
            {totalOverdue > 0 && (
              <button onClick={() => setFilterRetard(v=>!v)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background:filterRetard?'var(--color-danger)':'var(--color-danger-light)', color:filterRetard?'white':'var(--color-danger)' }}>
                ⚠ {totalOverdue} en retard
              </button>
            )}

            {/* Toggle Temps de Pluie */}
            <button onClick={() => { const v = !showRain; setShowRain(v); localStorage.setItem('planning_show_rain', String(v)) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: showRain ? '#0071E3' : 'rgba(0,113,227,0.1)',
                color: showRain ? 'white' : '#0071E3',
                border: `1px solid ${showRain ? 'transparent' : 'rgba(0,113,227,0.2)'}`
              }}>
              <span className="text-sm">🌧</span>
              Temps de pluie {showRain ? 'activé' : 'off'}
            </button>
          </div>
        )}
      </div>

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
