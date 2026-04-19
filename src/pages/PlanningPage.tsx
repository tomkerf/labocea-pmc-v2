import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useClientsListener, saveClient } from '@/hooks/useClients'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useVerificationsListener } from '@/hooks/useVerifications'
import { useMaintenancesListener, saveMaintenance } from '@/hooks/useMaintenances'
import { useMissionsStore } from '@/stores/missionsStore'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useAuthStore } from '@/stores/authStore'
import type { Sampling, Verification, Maintenance } from '@/types'

// ── Types ───────────────────────────────────────────────────

interface PlanningEvent {
  id: string
  type: 'prelevement' | 'maintenance' | 'verification'
  title: string
  subtitle: string
  detail?: string
  statusLabel: string
  statusBg: string
  statusColor: string
  link: string
  isDone: boolean
  technicien: string
  plannedTime?: string
  clientId?: string
  planId?: string
  samplingId?: string
  maintenanceData?: Maintenance
}

type ViewMode = 'semaine' | 'mois'

// ── Helpers ─────────────────────────────────────────────────

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS_LONG = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                   'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1)
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b)
}

// Génère les cellules de la grille mensuelle (lundi en premier)
function buildMonthGrid(monthStart: Date): (Date | null)[] {
  const year = monthStart.getFullYear()
  const month = monthStart.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = monthStart.getDay() // 0=dim, 1=lun...
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // décalage lundi
  const cells: (Date | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const SAMPLING_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  planned:      { label: 'Planifié',     bg: 'var(--color-bg-tertiary)',   color: 'var(--color-text-secondary)' },
  done:         { label: 'Réalisé',      bg: 'var(--color-success-light)', color: 'var(--color-success)' },
  overdue:      { label: 'En retard',    bg: 'var(--color-danger-light)',  color: 'var(--color-danger)' },
  non_effectue: { label: 'Non effectué', bg: 'var(--color-warning-light)', color: 'var(--color-warning)' },
}

const MAINTENANCE_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  planifiee:  { label: 'Planifiée',  bg: 'var(--color-bg-tertiary)',   color: 'var(--color-text-secondary)' },
  en_cours:   { label: 'En cours',   bg: 'var(--color-warning-light)', color: 'var(--color-warning)' },
  realisee:   { label: 'Réalisée',   bg: 'var(--color-success-light)', color: 'var(--color-success)' },
  abandonnee: { label: 'Abandonnée', bg: 'var(--color-danger-light)',  color: 'var(--color-danger)' },
}

// ── Page principale ─────────────────────────────────────────

export default function PlanningPage() {
  useClientsListener()
  useEquipementsListener()
  useVerificationsListener()
  useMaintenancesListener()

  const navigate = useNavigate()
  const uid = useAuthStore((s) => s.uid())
  const { clients } = useMissionsStore()
  const { verifications } = useMetrologieStore()
  const { maintenances } = useMaintenancesStore()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewMode, setViewMode] = useState<ViewMode>('semaine')
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(today))
  const [monthStart, setMonthStart] = useState<Date>(() => startOfMonth(today))
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [filterTechnicien, setFilterTechnicien] = useState<string>('')
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [validationDate, setValidationDate] = useState<string>(toISODate(today))
  const [saving, setSaving] = useState(false)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const monthGrid = useMemo(() => buildMonthGrid(monthStart), [monthStart])

  const isValidationWeekend = useMemo(() => {
    if (!validationDate) return false
    const d = new Date(validationDate + 'T12:00:00')
    return d.getDay() === 0 || d.getDay() === 6
  }, [validationDate])

  // ── Construction de l'index date → events ──────────────────

  const eventsByDate = useMemo(() => {
    const map: Record<string, PlanningEvent[]> = {}
    const year = new Date().getFullYear()

    function add(dateStr: string, event: PlanningEvent) {
      if (!dateStr) return
      if (!map[dateStr]) map[dateStr] = []
      map[dateStr].push(event)
    }

    clients.forEach((client) => {
      client.plans.forEach((plan) => {
        plan.samplings.forEach((s: Sampling) => {
          const dateStr = s.doneDate
            || toISODate(new Date(year, s.plannedMonth, s.plannedDay || 1))
          const cfg = SAMPLING_STATUS[s.status] ?? SAMPLING_STATUS.planned
          add(dateStr, {
            id: s.id,
            type: 'prelevement',
            title: client.nom,
            subtitle: plan.siteNom || '—',
            detail: plan.nom || undefined,
            statusLabel: cfg.label,
            statusBg: cfg.bg,
            statusColor: cfg.color,
            link: `/missions/${client.id}/plan/${plan.id}/sampling/${s.id}`,
            isDone: s.status === 'done',
            technicien: client.preleveur || '—',
            plannedTime: s.plannedTime,
            clientId: client.id,
            planId: plan.id,
            samplingId: s.id,
          })
        })
      })
    })

    maintenances.forEach((m: Maintenance) => {
      const dateStr = m.dateRealisee || m.datePrevue
      const cfg = MAINTENANCE_STATUS[m.statut] ?? MAINTENANCE_STATUS.planifiee
      add(dateStr, {
        id: m.id,
        type: 'maintenance',
        title: m.equipementNom || 'Équipement',
        subtitle: m.type === 'preventive' ? 'Maintenance préventive'
          : m.type === 'corrective' ? 'Maintenance corrective' : 'Panne',
        statusLabel: cfg.label,
        statusBg: cfg.bg,
        statusColor: cfg.color,
        link: `/maintenances/${m.id}`,
        isDone: m.statut === 'realisee',
        technicien: m.technicienNom || '—',
        maintenanceData: m,
      })
    })

    verifications.forEach((v: Verification) => {
      if (!v.prochainControle) return
      add(v.prochainControle, {
        id: v.id,
        type: 'verification',
        title: v.equipementNom || 'Équipement',
        subtitle: v.type === 'etalonnage_interne' ? 'Étalonnage interne'
          : v.type === 'verification_externe' ? 'Vérification externe' : 'Contrôle terrain',
        statusLabel: 'Métrologie',
        statusBg: 'var(--color-accent-light)',
        statusColor: 'var(--color-accent)',
        link: `/metrologie/${v.id}`,
        isDone: false,
        technicien: v.technicienNom || '—',
      })
    })

    return map
  }, [clients, maintenances, verifications])

  const allTechniciens = useMemo(() => {
    const set = new Set<string>()
    Object.values(eventsByDate).forEach((events) =>
      events.forEach((e) => { if (e.technicien && e.technicien !== '—') set.add(e.technicien) })
    )
    return Array.from(set).sort()
  }, [eventsByDate])

  const allEventsForDay = eventsByDate[toISODate(selectedDate)] ?? []
  const selectedEvents = (filterTechnicien
    ? allEventsForDay.filter((e) => e.technicien === filterTechnicien)
    : allEventsForDay
  ).slice().sort((a, b) => {
    if (a.plannedTime && b.plannedTime) return a.plannedTime.localeCompare(b.plannedTime)
    if (a.plannedTime) return -1
    if (b.plannedTime) return 1
    return 0
  })

  // ── Validation rapide ───────────────────────────────────────

  async function handleValidate(event: PlanningEvent) {
    if (!uid || saving) return
    setSaving(true)
    try {
      if (event.type === 'prelevement' && event.clientId && event.planId && event.samplingId) {
        const client = clients.find((c) => c.id === event.clientId)
        if (!client) return
        const updatedPlans = client.plans.map((plan) => {
          if (plan.id !== event.planId) return plan
          return {
            ...plan,
            samplings: plan.samplings.map((s: Sampling) =>
              s.id === event.samplingId
                ? { ...s, status: 'done' as const, doneDate: validationDate, doneBy: uid }
                : s
            ),
          }
        })
        await saveClient({ ...client, plans: updatedPlans }, uid)
      }

      if (event.type === 'maintenance' && event.maintenanceData) {
        await saveMaintenance(
          { ...event.maintenanceData, statut: 'realisee', dateRealisee: validationDate },
          uid
        )
      }

      setValidatingId(null)
    } finally {
      setSaving(false)
    }
  }

  function openValidation(event: PlanningEvent) {
    setValidatingId(event.id)
    setValidationDate(toISODate(today))
  }

  function selectDay(day: Date) {
    setSelectedDate(day)
    setValidatingId(null)
    if (viewMode === 'semaine') setWeekStart(startOfWeek(day))
  }

  function switchView(mode: ViewMode) {
    setViewMode(mode)
    if (mode === 'mois') setMonthStart(startOfMonth(selectedDate))
    if (mode === 'semaine') setWeekStart(startOfWeek(selectedDate))
  }

  function typeLabel(type: PlanningEvent['type']): string {
    if (type === 'prelevement') return 'Prélèvement'
    if (type === 'maintenance') return 'Maintenance'
    return 'Métrologie'
  }

  const weekLabel = (() => {
    const end = addDays(weekStart, 6)
    if (weekStart.getMonth() === end.getMonth()) {
      return `${MOIS_LONG[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    }
    return `${MOIS_LONG[weekStart.getMonth()]} — ${MOIS_LONG[end.getMonth()]} ${end.getFullYear()}`
  })()

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-3xl">

      {/* En-tête : titre + toggle vue + filtre technicien */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Planning</h1>

          {/* Toggle Semaine / Mois */}
          <div className="flex rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-tertiary)' }}>
            {(['semaine', 'mois'] as ViewMode[]).map((mode) => (
              <button key={mode}
                onClick={() => switchView(mode)}
                className="px-3 py-1 text-xs font-medium transition-colors capitalize"
                style={{
                  background: viewMode === mode ? 'var(--color-accent)' : 'transparent',
                  color: viewMode === mode ? 'white' : 'var(--color-text-secondary)',
                }}>
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Filtre technicien */}
        {allTechniciens.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterTechnicien('')}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: !filterTechnicien ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                color: !filterTechnicien ? 'white' : 'var(--color-text-secondary)',
                border: `1px solid ${!filterTechnicien ? 'transparent' : 'var(--color-border-subtle)'}`,
              }}>
              Tous
            </button>
            {allTechniciens.map((tech) => (
              <button key={tech}
                onClick={() => setFilterTechnicien(tech === filterTechnicien ? '' : tech)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                style={{
                  background: filterTechnicien === tech ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                  color: filterTechnicien === tech ? 'white' : 'var(--color-text-secondary)',
                  border: `1px solid ${filterTechnicien === tech ? 'transparent' : 'var(--color-border-subtle)'}`,
                }}>
                {tech}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── VUE SEMAINE ── */}
      {viewMode === 'semaine' && (
        <div className="rounded-xl overflow-hidden mb-5"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
            <button onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="p-1 rounded-lg" style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {weekLabel}
            </span>
            <button onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="p-1 rounded-lg" style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 px-3 py-4 gap-1">
            {weekDays.map((day, i) => {
              const dateStr = toISODate(day)
              const isSelected = isSameDay(day, selectedDate)
              const isToday = isSameDay(day, today)
              const isWeekend = i >= 5
              const events = filterTechnicien
                ? (eventsByDate[dateStr] ?? []).filter((e) => e.technicien === filterTechnicien)
                : eventsByDate[dateStr] ?? []
              const eventCount = events.length

              return (
                <button key={i}
                  onClick={() => selectDay(day)}
                  className="flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl transition-colors"
                  style={{ background: isSelected ? 'var(--color-accent)' : 'transparent' }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--color-bg-tertiary)' }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
                  <span className="text-[10px] font-medium uppercase"
                    style={{
                      color: isSelected ? 'rgba(255,255,255,0.8)' : isWeekend ? 'var(--color-border)' : 'var(--color-text-tertiary)',
                      letterSpacing: '0.04em',
                    }}>
                    {JOURS[i]}
                  </span>
                  <span className="text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full"
                    style={{
                      color: isSelected ? 'white' : isToday ? 'var(--color-accent)' : isWeekend ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                      background: isToday && !isSelected ? 'var(--color-accent-light)' : 'transparent',
                    }}>
                    {day.getDate()}
                  </span>
                  {eventCount > 0 ? (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--color-accent-light)',
                        color: isSelected ? 'white' : 'var(--color-accent)',
                      }}>
                      {eventCount}
                    </span>
                  ) : <span className="h-4" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── VUE MOIS ── */}
      {viewMode === 'mois' && (
        <div className="rounded-xl overflow-hidden mb-5"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>

          {/* Navigation mois */}
          <div className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
            <button onClick={() => setMonthStart(addMonths(monthStart, -1))}
              className="p-1 rounded-lg" style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {MOIS_LONG[monthStart.getMonth()]} {monthStart.getFullYear()}
            </span>
            <button onClick={() => setMonthStart(addMonths(monthStart, 1))}
              className="p-1 rounded-lg" style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* En-têtes jours */}
          <div className="grid grid-cols-7 px-3 pt-3 pb-1 gap-1">
            {JOURS.map((j, i) => (
              <div key={j} className="text-center text-[10px] font-medium uppercase py-1"
                style={{
                  color: i >= 5 ? 'var(--color-border)' : 'var(--color-text-tertiary)',
                  letterSpacing: '0.04em',
                }}>
                {j}
              </div>
            ))}
          </div>

          {/* Grille jours */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-1">
            {monthGrid.map((day, i) => {
              if (!day) return <div key={i} />

              const dateStr = toISODate(day)
              const isSelected = isSameDay(day, selectedDate)
              const isToday = isSameDay(day, today)
              const dayOfWeek = (i % 7)
              const isWeekend = dayOfWeek >= 5
              const events = filterTechnicien
                ? (eventsByDate[dateStr] ?? []).filter((e) => e.technicien === filterTechnicien)
                : eventsByDate[dateStr] ?? []
              const eventCount = events.length

              // Couleurs des dots : priorité danger > warning > accent > success
              const hasOverdue = events.some((e) => e.statusColor === 'var(--color-danger)')
              const hasWarning = events.some((e) => e.statusColor === 'var(--color-warning)')
              const dotColor = hasOverdue ? 'var(--color-danger)'
                : hasWarning ? 'var(--color-warning)'
                : 'var(--color-accent)'

              return (
                <button key={i}
                  onClick={() => selectDay(day)}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl transition-colors"
                  style={{ background: isSelected ? 'var(--color-accent)' : 'transparent', minHeight: 56 }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--color-bg-tertiary)' }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
                  <span className="text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full"
                    style={{
                      color: isSelected ? 'white' : isToday ? 'var(--color-accent)' : isWeekend ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                      background: isToday && !isSelected ? 'var(--color-accent-light)' : 'transparent',
                      fontSize: 13,
                    }}>
                    {day.getDate()}
                  </span>
                  {eventCount > 0 ? (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: isSelected ? 'rgba(255,255,255,0.25)' : `${dotColor}22`,
                        color: isSelected ? 'white' : dotColor,
                      }}>
                      {eventCount}
                    </span>
                  ) : <span className="h-4" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Titre du jour sélectionné */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase"
          style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
          {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h2>
        {isSameDay(selectedDate, today) && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
            Aujourd'hui
          </span>
        )}
      </div>

      {/* Timeline */}
      {selectedEvents.length === 0 ? (
        <div className="rounded-xl px-5 py-10 text-center"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            Aucune intervention prévue ce jour.
          </p>
          {!isSameDay(selectedDate, today) && (
            <button onClick={() => selectDay(today)} className="mt-3 text-xs" style={{ color: 'var(--color-accent)' }}>
              Revenir à aujourd'hui
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          {selectedEvents.map((event, i) => {
            const isValidating = validatingId === event.id
            const canQuickValidate = !event.isDone && event.type !== 'verification'

            return (
              <div key={event.id + i}
                style={{ borderBottom: i < selectedEvents.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>

                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-1 self-stretch rounded-full shrink-0"
                    style={{ background: event.statusColor, minHeight: 36 }} />

                  <button className="flex-1 min-w-0 text-left" onClick={() => navigate(event.link)}>
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {event.title}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {event.subtitle}{event.detail ? ` · ${event.detail}` : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] font-medium uppercase tracking-wide"
                        style={{ color: 'var(--color-text-tertiary)' }}>
                        {typeLabel(event.type)}
                      </p>
                      {event.plannedTime && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                          {event.plannedTime}
                        </span>
                      )}
                      {event.technicien && event.technicien !== '—' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                          {event.technicien}
                        </span>
                      )}
                    </div>
                  </button>

                  <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                    style={{ background: event.statusBg, color: event.statusColor }}>
                    {event.statusLabel}
                  </span>

                  {event.isDone ? (
                    <CheckCircle2 size={20} className="shrink-0" style={{ color: 'var(--color-success)' }} />
                  ) : event.type === 'verification' ? (
                    <button onClick={() => navigate(event.link)}
                      className="shrink-0 p-1.5 rounded-lg"
                      style={{ color: 'var(--color-accent)', background: 'var(--color-accent-light)' }}
                      title="Ouvrir la fiche">
                      <ExternalLink size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={() => isValidating ? setValidatingId(null) : openValidation(event)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: isValidating ? 'var(--color-bg-tertiary)' : 'var(--color-success-light)',
                        color: isValidating ? 'var(--color-text-secondary)' : 'var(--color-success)',
                        border: `1px solid ${isValidating ? 'var(--color-border)' : 'transparent'}`,
                      }}>
                      {isValidating ? 'Annuler' : '✓ Valider'}
                    </button>
                  )}
                </div>

                {isValidating && canQuickValidate && (
                  <div className="px-5 py-4 flex flex-col gap-3"
                    style={{ background: 'var(--color-bg-tertiary)', borderTop: '1px solid var(--color-border-subtle)' }}>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                          Date de réalisation
                        </label>
                        <input
                          type="date"
                          value={validationDate}
                          onChange={(e) => setValidationDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm"
                          style={{
                            background: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)',
                          }}
                        />
                      </div>
                      <button
                        onClick={() => handleValidate(event)}
                        disabled={saving || !validationDate}
                        className="px-4 py-2 rounded-lg text-sm font-medium"
                        style={{
                          background: 'var(--color-success)',
                          color: 'white',
                          opacity: saving ? 0.6 : 1,
                        }}>
                        {saving ? 'Enregistrement…' : 'Confirmer'}
                      </button>
                    </div>
                    {isValidationWeekend && (
                      <p className="text-xs px-3 py-2 rounded-lg"
                        style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
                        ⚠️ Intervention un week-end — vérifiez la date avant de confirmer.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Lien retour semaine en cours (vue semaine uniquement) */}
      {viewMode === 'semaine' && !weekDays.some((d) => isSameDay(d, today)) && (
        <button onClick={() => { setWeekStart(startOfWeek(today)); setSelectedDate(today) }}
          className="mt-4 text-xs" style={{ color: 'var(--color-accent)' }}>
          ← Revenir à la semaine en cours
        </button>
      )}

      {/* Lien retour mois en cours (vue mois uniquement) */}
      {viewMode === 'mois' && monthStart.getMonth() !== today.getMonth() && (
        <button onClick={() => { setMonthStart(startOfMonth(today)); setSelectedDate(today) }}
          className="mt-4 text-xs" style={{ color: 'var(--color-accent)' }}>
          ← Revenir au mois en cours
        </button>
      )}

    </div>
  )
}
