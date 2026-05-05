import { useState, useMemo, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, Plus, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useClientsListener, saveClient } from '@/hooks/useClients'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useVerificationsListener } from '@/hooks/useVerifications'
import { useMaintenancesListener } from '@/hooks/useMaintenances'
import { useEvenementsListener, createEvenement, deleteEvenement } from '@/hooks/useEvenements'
import { useUsersListener } from '@/hooks/useUsers'
import { usePreleveursListener } from '@/hooks/usePreleveurs'
import { useMissionsStore } from '@/stores/missionsStore'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useEvenementsStore } from '@/stores/evenementsStore'
import { useUsersStore } from '@/stores/usersStore'
import { usePreleveursStore } from '@/stores/preleveursStore'
import { useAuthStore, selectUid, selectInitiales } from '@/stores/authStore'
import type { Client, Sampling, Verification, Maintenance, EvenementPersonnel, TypeEvenement } from '@/types'
import { isSamplingOverdue } from '@/lib/overdue'
import {
  // Types
  type PlanningEvent, type PoolItem, type ViewMode, type TechOption,
  // Constantes
  JOURS_COURT, JOURS_LONG, MOIS_LONG,
  SAMPLING_LABEL, MAINTENANCE_LABEL, EVENEMENT_LABEL,
  // Fonctions pure
  getTechColor,
  getFrenchHolidays, isVeilleJourFerie,
  startOfWeek, startOfMonth, addDays, addMonths, toISO, sameDay,
  buildMonthGrid, buildMiniGrid,
  parseHHMM, assignColumns, isMultiDay,
  sortEvts, groupByClient,
} from '@/lib/planningUtils'
import DayModal          from '@/components/planning/DayModal'
import CellContextMenu   from '@/components/planning/CellContextMenu'
import GhostDetailModal  from '@/components/planning/GhostDetailModal'
import EventDetailModal  from '@/components/planning/EventDetailModal'
import DragCreateModal   from '@/components/planning/DragCreateModal'

// ── Composant principal ─────────────────────────────────────

export default function PlanningPage() {
  useClientsListener(); useEquipementsListener()
  useVerificationsListener(); useMaintenancesListener()
  useEvenementsListener(); useUsersListener()
  usePreleveursListener()

  const navigate   = useNavigate()
  const uid        = useAuthStore(selectUid)
  const initiales  = useAuthStore(selectInitiales)
  const { clients }       = useMissionsStore()
  const { verifications } = useMetrologieStore()
  const { maintenances }  = useMaintenancesStore()
  const { evenements }    = useEvenementsStore()
  const users             = useUsersStore(s => s.users)
  const preleveurs        = usePreleveursStore(s => s.preleveurs)

  const today = new Date(); today.setHours(0,0,0,0)

  // Jours fériés — recalculés chaque année (couvre l'année courante + suivante)
  const holidays = useMemo(() => ({
    ...getFrenchHolidays(today.getFullYear()),
    ...getFrenchHolidays(today.getFullYear() + 1),
  }), [today.getFullYear()])

  const [viewMode,    setViewMode]    = useState<ViewMode>('semaine')
  const [weekStart,   setWeekStart]   = useState(() => startOfWeek(today))
  const [monthStart,  setMonthStart]  = useState(() => startOfMonth(today))
  const [selectedDate,setSelectedDate]= useState(today)
  const [filterTech,  setFilterTech]  = useState('')
  const [filterRetard,setFilterRetard]= useState(false)
  const [selectedDay,         setSelectedDay]         = useState<string|null>(null)
  const [dayModalInitialTab,  setDayModalInitialTab]  = useState<'pool'|'evt'>('pool')
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
  function isInDrag(dateStr: string) {
    const mn = dragRangeMin(); const mx = dragRangeMax()
    return isDragging && mn && mx && dateStr >= mn && dateStr <= mx
  }

  const weekDays  = useMemo(() => Array.from({length:5},(_,i) => addDays(weekStart,i)), [weekStart])
  const monthGrid = useMemo(() => buildMonthGrid(monthStart), [monthStart])

  // ── Index date → events ─────────────────────────────────

  const eventsByDate = useMemo(() => {
    const map: Record<string,PlanningEvent[]> = {}
    const year = new Date().getFullYear()
    const add = (dateStr:string, e:PlanningEvent) => {
      if (!dateStr) return
      if (!map[dateStr]) map[dateStr] = []
      map[dateStr].push(e)
    }

    clients.forEach((client: Client) => {
      client.plans.forEach(plan => {
        const isAuto = plan.methode === 'Automatique'
        const baseSub = [plan.nom, plan.siteNom].filter(Boolean).join(' · ') || '—'
        plan.samplings.forEach((s:Sampling) => {
          // Exclure les samplings non planifiés (pool) — plannedDay = 0 ou absent
          if (!s.plannedDay && !s.doneDate) return
          const overdue = isSamplingOverdue(s)
          // Positionnement dans la grille = toujours plannedDay (jamais doneDate)
          // doneDate sert uniquement à l'affichage "réalisé le X", pas au positionnement
          const dateStr = s.plannedDay
            ? toISO(new Date(year, s.plannedMonth, s.plannedDay))
            : s.doneDate  // fallback pool bimensuel sans plannedDay
          const statusLabel = overdue ? SAMPLING_LABEL.overdue : SAMPLING_LABEL[s.status] ?? SAMPLING_LABEL.planned
          const priority = overdue ? 0 : s.status === 'non_effectue' ? 1 : s.status === 'planned' ? 2 : 3
          const technicien = s.assignedTo || client.preleveur || ''
          const tc = getTechColor(technicien)
          const isDone = s.status === 'done'
          const statusBg    = isDone ? 'var(--color-success-light)' : overdue ? 'var(--color-danger-light)' : tc.bg
          const statusColor = isDone ? 'var(--color-success)'       : overdue ? 'var(--color-danger)'       : tc.color
          const common = {
            type: 'prelevement' as const,
            statusLabel, statusBg, statusColor, priority,
            link:`/missions/${client.id}/plan/${plan.id}/sampling/${s.id}`,
            isDone, technicien: technicien || '—',
            plannedTime: s.plannedTime, clientId:client.id, planId:plan.id, samplingId:s.id,
            meteo: plan.meteo || '',
            analysesSousTraitees: plan.analysesSousTraitees ?? false,
          }
          // Méthode Automatique = bilan 24h → J1 + J2 le lendemain
          if (isAuto) {
            const dateStr2 = toISO(addDays(new Date(dateStr + 'T12:00:00'), 1))
            add(dateStr, {
              ...common,
              id: s.id,
              title: client.nom,
              subtitle: `${baseSub} · Bilan 24h J1`,
              dateFin: dateStr2,
            })
            add(dateStr2, {
              ...common,
              id: `${s.id}_j2`,
              title: client.nom,
              subtitle: `${baseSub} · Bilan 24h J2`,
              isJ2Continuation: true,
            })
          } else {
            // Jour unique (ponctuel / composite)
            add(dateStr, {
              ...common,
              id: s.id,
              title: client.nom,
              subtitle: baseSub,
            })
          }
        })
      })
    })

    // ── Fantômes (reportHistory) ─────────────────────────────
    clients.forEach((client: Client) => {
      client.plans.forEach(plan => {
        const baseSub = [plan.nom, plan.siteNom].filter(Boolean).join(' · ') || '—'
        plan.samplings.forEach((s: Sampling) => {
          if (!s.reportHistory?.length) return
          s.reportHistory.forEach((h, idx) => {
            if (!h.from) return
            const ghostAction: 'retiré' | 'reporté' = h.to === '' ? 'retiré' : 'reporté'
            add(h.from, {
              id: `${s.id}_ghost_${idx}`,
              type: 'prelevement' as const,
              title: client.nom,
              subtitle: baseSub,
              statusLabel: ghostAction === 'retiré' ? 'Retiré' : 'Reporté',
              statusBg: 'transparent',
              statusColor: 'var(--color-text-tertiary)',
              link: `/missions/${client.id}/plan/${plan.id}/sampling/${s.id}`,
              isDone: false,
              priority: 4,
              technicien: s.assignedTo || client.preleveur || '—',
              clientId: client.id,
              planId: plan.id,
              samplingId: s.id,
              isGhost: true,
              ghostAction,
              ghostNewDate: h.to || undefined,
              ghostReason: h.reason,
              ghostBy: h.by,
              ghostAt: h.at,
            })
          })
        })
      })
    })

    maintenances.forEach((m:Maintenance) => {
      const dateStr = m.dateRealisee||m.datePrevue
      const tc = getTechColor('')   // maintenances : couleur neutre (pas d'initiales dispo)
      add(dateStr, {
        id:m.id, type:'maintenance', priority: m.statut==='realisee' ? 3 : 2,
        title:m.equipementNom||'Équipement',
        subtitle: m.type==='preventive'?'Maintenance préventive':m.type==='corrective'?'Maintenance corrective':'Panne',
        statusLabel: MAINTENANCE_LABEL[m.statut]??'Planifiée', statusBg:tc.bg, statusColor:tc.color,
        link:`/maintenances/${m.id}`, isDone:m.statut==='realisee', technicien:m.technicienNom||'—',
        maintenanceData:m,
      })
    })

    verifications.forEach((v:Verification) => {
      if (!v.prochainControle) return
      const tc = getTechColor('')
      add(v.prochainControle, {
        id:v.id, type:'verification', priority: 2,
        title:v.equipementNom||'Équipement',
        subtitle: v.type==='etalonnage_interne'?'Étalonnage interne':v.type==='verification_externe'?'Vérification externe':'Contrôle terrain',
        statusLabel:'Métrologie', statusBg:tc.bg, statusColor:tc.color,
        link:`/metrologie/${v.id}`, isDone:false, technicien:v.technicienNom||'—',
      })
    })

    evenements.forEach((ev:EvenementPersonnel) => {
      const evObj: PlanningEvent = {
        id:ev.id, type:'evenement', priority: 2,
        title:ev.titre, subtitle: EVENEMENT_LABEL[ev.type]??'Autre',
        statusLabel: EVENEMENT_LABEL[ev.type]??'Autre',
        statusBg: 'var(--color-bg-tertiary)', statusColor: 'var(--color-text-tertiary)',
        link:'', isDone:false, technicien:ev.createdByInitiales||'—',
        plannedTime:ev.heure||undefined, evenementData:ev,
      }
      // Étendre sur toute la plage date → dateFin (si multi-jours)
      if (ev.dateFin && ev.dateFin > ev.date) {
        let cur = ev.date
        while (cur <= ev.dateFin) {
          add(cur, { ...evObj, id: `${ev.id}_${cur}` })
          const d = new Date(cur + 'T12:00:00')
          d.setDate(d.getDate() + 1)
          cur = toISO(d)
        }
      } else {
        add(ev.date, evObj)
      }
    })

    return map
  }, [clients, maintenances, verifications, evenements])

  // ── Filtrage technicien ─────────────────────────────────

  // Extrait les initiales (dernier mot après espace) — ex: "Thomas THK" → "THK"
  function normTech(s: string): string {
    if (!s || s === '—') return s
    const parts = s.trim().split(' ')
    return parts[parts.length - 1]
  }

  // Liste des techs : préleveurs V1 en priorité, complétée par ceux présents dans les events
  const allTechs = useMemo(() => {
    if (preleveurs.length > 0) {
      return preleveurs.map(p => p.code).sort()
    }
    // Fallback : extraire depuis les événements du planning
    const s = new Set<string>()
    Object.values(eventsByDate).flat().forEach(e => { if (e.technicien && e.technicien !== '—') s.add(normTech(e.technicien)) })
    return Array.from(s).sort()
  }, [preleveurs, eventsByDate])

  // Avec regroupement par client (vue mois, DayModal)
  const filteredForDay = useCallback((dateStr:string): PlanningEvent[] => {
    let evts = eventsByDate[dateStr]??[]
    if (filterTech) evts = evts.filter(e => normTech(e.technicien)===filterTech)
    if (filterRetard) evts = evts.filter(e => e.priority === 0)
    return groupByClient(evts)
  }, [eventsByDate, filterTech, filterRetard])

  // Sans regroupement (vue semaine et vue jour : chaque prélèvement visible)
  const filteredForDayFlat = useCallback((dateStr:string): PlanningEvent[] => {
    let evts = eventsByDate[dateStr]??[]
    if (filterTech) evts = evts.filter(e => normTech(e.technicien)===filterTech)
    if (filterRetard) evts = evts.filter(e => e.priority === 0)
    return sortEvts(evts)
  }, [eventsByDate, filterTech, filterRetard])


  const totalOverdue = useMemo(() => {
    let n=0
    clients.forEach((c:Client) => c.plans.forEach(p => p.samplings.forEach((s:Sampling) => { if (isSamplingOverdue(s)) n++ })))
    return n
  }, [clients])

  // Liste unifiée de tous les techniciens : préleveurs V1 + users V2 + codes présents dans clients
  const techOptions = useMemo((): TechOption[] => {
    const map = new Map<string, string>()
    // 1. Préleveurs V1 (nom complet connu)
    preleveurs.forEach(p => map.set(p.code, `${p.nom} (${p.code})`))
    // 2. Utilisateurs V2 pas encore dans V1
    users.forEach(u => { if (u.initiales && !map.has(u.initiales)) map.set(u.initiales, `${u.prenom} ${u.nom} (${u.initiales})`) })
    // 3. Codes issus des clients (fallback si pas de fiche)
    clients.forEach((c: Client) => { if (c.preleveur && !map.has(normTech(c.preleveur))) map.set(normTech(c.preleveur), normTech(c.preleveur)) })
    return Array.from(map.entries()).map(([code, label]) => ({ code, label })).sort((a, b) => a.code.localeCompare(b.code))
  }, [preleveurs, users, clients])

  // Nombre de samplings non faits dans le mois visible — pour le bandeau "à planifier"
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

  // ── Pool samplings non faits du mois sélectionné ────────

  const poolSamplings = useMemo((): PoolItem[] => {
    if (!selectedDay) return []
    const month = new Date(selectedDay + 'T12:00:00').getMonth()
    const result: PoolItem[] = []
    clients.forEach((client: Client) => {
      client.plans.forEach(plan => {
        plan.samplings.forEach((s: Sampling) => {
          if (s.plannedMonth === month && s.status !== 'done') {
            result.push({
              sampling: s,
              clientId: client.id,
              clientNom: client.nom,
              planId: plan.id,
              planNom: plan.nom,
              siteNom: plan.siteNom,
              frequence: plan.frequence || '',
              techInitiales: client.preleveur || '—',
              meteo: plan.meteo || '',
              analysesSousTraitees: plan.analysesSousTraitees ?? false,
            })
          }
        })
      })
    })
    // Tri : en retard en premier, puis par client
    return result.sort((a, b) => {
      const aOvr = isSamplingOverdue(a.sampling) ? 0 : 1
      const bOvr = isSamplingOverdue(b.sampling) ? 0 : 1
      if (aOvr !== bOvr) return aOvr - bOvr
      return a.clientNom.localeCompare(b.clientNom)
    })
  }, [selectedDay, clients])

  // Prélèvements en retard — TOUS mois confondus (identique au Dashboard)
  const overduePool = useMemo((): PoolItem[] => {
    const result: PoolItem[] = []
    clients.forEach((client: Client) => {
      const clientYear = Number(client.annee) || undefined
      client.plans.forEach(plan => {
        plan.samplings.forEach((s: Sampling) => {
          if (isSamplingOverdue(s, clientYear)) {
            result.push({
              sampling: s,
              clientId: client.id,
              clientNom: client.nom,
              planId: plan.id,
              planNom: plan.nom,
              siteNom: plan.siteNom,
              frequence: plan.frequence || '',
              techInitiales: s.assignedTo || client.preleveur || '—',
              meteo: plan.meteo || '',
              analysesSousTraitees: plan.analysesSousTraitees ?? false,
            })
          }
        })
      })
    })
    return result.sort((a, b) => a.clientNom.localeCompare(b.clientNom))
  }, [clients])

  // ── Bande bilan 24h — J1 + J2 dans un groupe spanning ──────────────────────
  // Chaque groupe = une paire J1/J2 entourée d'une bordure commune (colspan).
  // Le row-index garantit que deux paires distinctes ne se chevauchent pas.
  const bilanBand = useMemo(() => {
    if (viewMode !== 'semaine') return []
    const wISOs = weekDays.map(toISO)

    type BilanItem  = { colIdx: number; event: PlanningEvent }
    type BilanGroup = { colStart: number; colEnd: number; techColor: string; items: BilanItem[] }

    const pairs: { j1Col: number; j2Col: number; j1: PlanningEvent; j2: PlanningEvent | null }[] = []

    wISOs.forEach((dateStr, colIdx) => {
      ;(eventsByDate[dateStr] ?? []).forEach(e => {
        if (e.type !== 'prelevement' || !e.dateFin) return
        if (filterTech && normTech(e.technicien) !== filterTech) return
        const j2DateStr = e.dateFin
        const j2Col     = wISOs.indexOf(j2DateStr)
        const j2        = j2Col !== -1
          ? (eventsByDate[j2DateStr] ?? []).find(x => x.isJ2Continuation && x.samplingId === e.samplingId) ?? null
          : null
        pairs.push({ j1Col: colIdx, j2Col: j2 ? j2Col : -1, j1: e, j2 })
      })
    })

    // Assigner les lignes : J1 et J2 forcément sur la même ligne
    const colRowNext = new Array(5).fill(0) as number[]
    const rows: BilanGroup[][] = []

    pairs.forEach(({ j1Col, j2Col, j1, j2 }) => {
      let rowIdx = colRowNext[j1Col]
      if (j2Col !== -1) rowIdx = Math.max(rowIdx, colRowNext[j2Col])
      if (!rows[rowIdx]) rows[rowIdx] = []

      const tc = getTechColor(j1.technicien).color
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
  }, [viewMode, weekDays, eventsByDate, filterTech])

  // ── Bande "toute la journée" — multi-jours (style Apple Calendar) ──────────
  // Événements personnels avec dateFin s'étirant sur plusieurs colonnes.
  // L'algorithme de row-packing évite les chevauchements.
  const allDayItems = useMemo(() => {
    if (viewMode !== 'semaine') return []
    const weekDayISOs  = weekDays.map(toISO)
    const weekStartISO = weekDayISOs[0]
    const weekEndISO   = weekDayISOs[4]

    type RawItem = {
      key: string
      colStart: number
      colEnd: number
      bg: string
      color: string
      label: string
      badge?: string   // initiales tech
      tag?: string     // ex: "J1→J2" pour les bilans
      onClick: () => void
      tooltip: string
    }

    const rawItems: RawItem[] = []

    // 1. Événements personnels avec dateFin (multi-jours) — sauf congés (pills par colonne)
    evenements
      .filter(ev => {
        if (!ev.dateFin || ev.dateFin <= ev.date) return false
        if (ev.type === 'conge') return false   // congés → pills individuelles dans chaque colonne
        if (filterTech && normTech(ev.createdByInitiales || '') !== filterTech) return false
        return ev.date <= weekEndISO && ev.dateFin >= weekStartISO
      })
      .forEach(ev => {
        const tc = getTechColor(ev.createdByInitiales || '')
        const startClamped = ev.date < weekStartISO ? weekStartISO : ev.date
        const endClamped   = ev.dateFin! > weekEndISO ? weekEndISO : ev.dateFin!
        const colStart = weekDayISOs.findIndex(d => d >= startClamped)
        let colEnd = -1
        for (let i = 4; i >= 0; i--) { if (weekDayISOs[i] <= endClamped) { colEnd = i; break } }
        if (colStart === -1 || colEnd === -1 || colStart > colEnd) return
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
          bg: tc.bg, color: tc.color,
          label: ev.titre,
          badge: ev.createdByInitiales || undefined,
          onClick: () => handleSelectEvent(evObj, ev.date),
          tooltip: `${ev.titre} (${ev.date} → ${ev.dateFin})`,
        })
      })

    // Row-packing — une seule passe pour tous les items
    const rowEnds: number[] = []
    return rawItems.map(item => {
      let row = rowEnds.findIndex(end => end <= item.colStart)
      if (row === -1) row = rowEnds.length
      rowEnds[row] = item.colEnd + 1
      return { ...item, row }
    })
  }, [evenements, eventsByDate, viewMode, weekDays, filterTech])

  // ── Liste période (mobile) ──────────────────────────────

  const periodList = useMemo(() => {
    const days: Date[] = viewMode==='semaine'
      ? weekDays
      : Array.from({length: new Date(monthStart.getFullYear(),monthStart.getMonth()+1,0).getDate()},
          (_,i) => new Date(monthStart.getFullYear(),monthStart.getMonth(),i+1))
    return days
      .map(date => ({ date, dateStr:toISO(date), events: viewMode==='semaine' ? filteredForDayFlat(toISO(date)) : filteredForDay(toISO(date)) }))
      .filter(g => g.events.length>0)
  }, [viewMode, weekDays, monthStart, filteredForDay, filteredForDayFlat])

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

  const periodLabel = viewMode==='jour'
    ? `${JOURS_LONG[(selectedDate.getDay()+6)%7]} ${selectedDate.getDate()} ${MOIS_LONG[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
    : viewMode==='semaine' ? (() => {
    const end = addDays(weekStart,6)
    if (weekStart.getMonth()===end.getMonth())
      return `${weekStart.getDate()}–${end.getDate()} ${MOIS_LONG[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    return `${weekStart.getDate()} ${MOIS_LONG[weekStart.getMonth()]} – ${end.getDate()} ${MOIS_LONG[end.getMonth()]} ${end.getFullYear()}`
  })() : `${MOIS_LONG[monthStart.getMonth()]} ${monthStart.getFullYear()}`

  // ── EventPill (calendrier desktop) ─────────────────────

  function EventPill({ event, compact, dateStr, onExpand, onSelect }: {
    event: PlanningEvent; compact?: boolean; dateStr?: string; onExpand?: () => void
    onSelect?: (event: PlanningEvent) => void
  }) {
    // compact = true en vue mois : une seule ligne, pas de sous-titre
    const isGrouped = (event.count ?? 0) > 1
    const hasSubtitle = !compact && event.subtitle && event.subtitle !== '—'
    const hasTech = event.technicien && event.technicien !== '—'

    function handleClick(e: React.MouseEvent) {
      e.stopPropagation()
      if (isGrouped && onExpand) { onExpand(); return }
      if (onSelect) { onSelect(event); return }
      if (event.type !== 'evenement') navigate(event.link)
    }

    // ── Rendu fantôme ──────────────────────────────────────
    if (event.isGhost) {
      const isRetrait = event.ghostAction === 'retiré'
      const ghostLabel = isRetrait
        ? '↩ retiré'
        : (() => {
            if (!event.ghostNewDate) return '→ reporté'
            const d = new Date(event.ghostNewDate + 'T12:00:00')
            return `→ ${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`
          })()
      return (
        <button
          onClick={handleClick}
          onMouseDown={e => e.stopPropagation()}
          className="w-full text-left px-1.5 py-[3px] rounded-[5px] leading-snug"
          style={{
            cursor: 'pointer',
            border: '1px dashed var(--color-border)',
            background: 'var(--color-bg-tertiary)',
          }}
          title={`${event.title} — ${event.ghostAction}${event.ghostReason ? ' · ' + event.ghostReason : ''}`}
        >
          <div className="flex items-center gap-1">
            <span className="shrink-0 text-[9px]">{isRetrait ? '↩' : '→'}</span>
            <span className="flex-1 truncate text-[10px]"
              style={{
                color: 'var(--color-text-secondary)',
                textDecoration: isRetrait ? 'line-through' : 'none',
                fontStyle: 'italic',
              }}>
              {event.title}
            </span>
            <span className="shrink-0 text-[9px] font-medium px-1 rounded"
              style={{ background: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
              {ghostLabel}
            </span>
          </div>
        </button>
      )
    }

    // Congé/RTT — traitement spécial
    const isConge = event.type === 'evenement' && event.evenementData?.type === 'conge'
    const techColor = getTechColor(event.technicien).color
    const dotColor = event.type === 'prelevement'
      ? event.priority === 0 ? 'var(--color-danger)'   // overdue → rouge
      : event.priority === 1 ? 'var(--color-neutral)'  // non_effectué → gris
      : techColor                                        // planifié → couleur tech
      : event.type === 'evenement' ? techColor
      : event.statusColor  // maintenance / vérification

    // Badges bilan 24h
    const isJ1 = event.type === 'prelevement' && !!event.dateFin
    const isJ2 = event.isJ2Continuation === true

    // Veille de jour férié — uniquement pour les plans sous-traités
    const veilleFerrieNom = event.analysesSousTraitees && dateStr && !event.isDone
      ? isVeilleJourFerie(dateStr)
      : null

    // Congé : pill gris clair, texte muted, emoji 🏖️ à la place du dot
    if (isConge) {
      return (
        <div
          className="w-full text-left px-1.5 py-[3px] rounded-[5px] leading-snug"
          style={{ background: 'var(--color-bg-tertiary)', cursor: 'default', opacity: 0.85 }}
          title={event.title}
        >
          <div className="flex items-center gap-1">
            <span className="shrink-0 text-[10px]">🏖️</span>
            <span className="flex-1 truncate text-[11px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {event.title || 'Congé/RTT'}
            </span>
            {hasTech && (
              <span className="shrink-0 text-[9px] font-semibold px-1 rounded"
                style={{ background: techColor + '18', color: techColor }}>
                {event.technicien}
              </span>
            )}
          </div>
        </div>
      )
    }

    return (
      <button
        onClick={handleClick}
        onMouseDown={e => e.stopPropagation()}
        className="w-full text-left px-1.5 py-[3px] rounded-[5px] leading-snug"
        style={{ background: 'var(--color-bg-secondary)', border: `1px solid ${techColor}30`, cursor: isGrouped ? 'zoom-in' : event.type === 'evenement' ? 'default' : 'pointer' }}
        title={isGrouped ? `${event.title} — ${event.count} prélèvements (cliquer pour détails)` : `${event.title} — ${event.subtitle} (${event.technicien})`}
      >
        {/* Ligne 1 : dot (ou ✓) + titre + badges */}
        <div className="flex items-center gap-1">
          {event.isDone
            ? <CheckCircle2 size={11} className="shrink-0" style={{ color: dotColor }} />
            : <span className="shrink-0 w-[6px] h-[6px] rounded-full" style={{ background: dotColor }} />
          }
          {event.meteo === 'pluie' && (
            <span className="shrink-0 text-[10px]" title="Prélèvement par temps de pluie">🌧</span>
          )}
          {veilleFerrieNom && (
            <span className="shrink-0 text-[10px]" title={`Analyses sous-traitées — veille de ${veilleFerrieNom}`}>⚠️</span>
          )}
          <span className="flex-1 truncate text-[11px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {event.title}
          </span>
          {(isJ1 || isJ2) && (
            <span className="shrink-0 text-[8px] font-bold px-1 rounded"
              style={{ background: dotColor + '22', color: dotColor }}>
              {isJ1 ? 'J1' : 'J2'}
            </span>
          )}
          {hasTech && (
            <span className="shrink-0 text-[9px] font-semibold px-1 rounded"
              style={{ background: dotColor + '18', color: dotColor }}>
              {event.technicien}
            </span>
          )}
          {isGrouped && (
            <span className="shrink-0 text-[9px] font-bold px-1 rounded"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
              ×{event.count}
            </span>
          )}
          {event.plannedTime && (
            <span className="shrink-0 text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>
              {event.plannedTime}
            </span>
          )}
        </div>
        {/* Ligne 2 : sous-titre (masqué en vue mois) */}
        {hasSubtitle && (
          <div className="text-[10px] truncate pl-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
            {event.subtitle}
          </div>
        )}
      </button>
    )
  }

  // ── EventRow (liste mobile + desktop) ──────────────────

  function EventRow({ event, isLast, onSelect }: {
    event: PlanningEvent; isLast: boolean
    onSelect?: (event: PlanningEvent) => void
  }) {
    const techColor = getTechColor(event.technicien).color
    const dotColor  = event.statusColor

    return (
      <div style={{ borderBottom: isLast?'none':'1px solid var(--color-border-subtle)' }}>
        <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
          onClick={() => onSelect ? onSelect(event) : (event.link && navigate(event.link))}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color:'var(--color-text-primary)' }}>{event.title}</p>
            <p className="text-xs mt-0.5 truncate" style={{ color:'var(--color-text-secondary)' }}>{event.subtitle}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {event.plannedTime && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                  style={{ background:'var(--color-accent-light)', color:'var(--color-accent)' }}>
                  {event.plannedTime}
                </span>
              )}
              {event.technicien&&event.technicien!=='—' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                  {event.technicien}
                </span>
              )}
              {event.meteo === 'pluie' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: '#EFF6FF', color: '#3B82F6' }}>
                  🌧 Pluie
                </span>
              )}
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
            style={{ background:event.statusBg, color:event.statusColor }}>
            {event.statusLabel}
          </span>
          {event.isDone
            ? <CheckCircle2 size={18} className="shrink-0" style={{ color: techColor }} />
            : <ChevronRight size={15} className="shrink-0" style={{ color:'var(--color-text-tertiary)' }} />
          }
        </button>
      </div>
    )
  }

  // ── MiniCalendar multi-mois (sidebar overlay desktop) ──

  function MiniCalendarPanel() {
    const refDate = viewMode === 'mois' ? monthStart : viewMode === 'semaine' ? weekStart : selectedDate
    const [baseMonth, setBaseMonth] = useState(() => startOfMonth(refDate))
    const todayISO   = toISO(today)
    const weekEndISO = toISO(addDays(weekStart, 6))
    const DAYS = ['L','M','M','J','V','S','D']
    const N_MONTHS = 3

    function jumpToDate(d: Date) {
      setWeekStart(startOfWeek(d))
      setMonthStart(startOfMonth(d))
      setSelectedDate(d)
      if (viewMode === 'jour') setViewMode('semaine')
      setSelectedDay(null)
      setShowMiniCal(false)
    }

    function MonthGrid({ offset }: { offset: number }) {
      const ms   = addMonths(baseMonth, offset)
      const cells = buildMiniGrid(ms)
      const label = MOIS_LONG[ms.getMonth()] + ' ' + ms.getFullYear()
      return (
        <div className="px-3 pt-3 pb-2">
          {/* Titre mois */}
          <p className="text-[11px] font-semibold mb-2 capitalize text-center"
            style={{ color: 'var(--color-text-primary)' }}>{label}</p>
          {/* En-têtes jours (1 seule fois, sur le 1er mois) */}
          {offset === 0 && (
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map((d, i) => (
                <span key={i} className="text-center text-[9px] font-semibold"
                  style={{ color: 'var(--color-text-tertiary)' }}>{d}</span>
              ))}
            </div>
          )}
          {/* Grille */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((d, i) => {
              if (!d) return <span key={i} />
              const iso = toISO(d)
              const isToday     = iso === todayISO
              const inWeek      = viewMode === 'semaine' && iso >= toISO(weekStart) && iso <= weekEndISO
              const inMonth     = viewMode === 'mois' && d.getMonth() === monthStart.getMonth() && d.getFullYear() === monthStart.getFullYear()
              const isSelected  = viewMode === 'jour' && iso === toISO(selectedDate)
              const highlighted = inWeek || inMonth || isSelected
              return (
                <button key={i} onClick={() => jumpToDate(d)}
                  className="flex items-center justify-center rounded-full mx-auto"
                  style={{
                    width: 22, height: 22,
                    fontSize: 11,
                    background: isToday ? 'var(--color-accent)' : highlighted ? 'var(--color-accent-light)' : 'transparent',
                    color: isToday ? 'white' : highlighted ? 'var(--color-accent)' : 'var(--color-text-primary)',
                    fontWeight: isToday || highlighted ? 600 : 400,
                  }}>
                  {d.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Navigation globale */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <button onClick={() => setBaseMonth(m => addMonths(m, -1))}
            className="p-1.5 rounded-md"
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            style={{ color: 'var(--color-text-secondary)' }}>
            <ChevronLeft size={13} />
          </button>
          <button onClick={() => setBaseMonth(startOfMonth(today))}
            className="text-[10px] font-medium px-2 py-0.5 rounded"
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            style={{ color: 'var(--color-text-secondary)' }}>
            Aujourd'hui
          </button>
          <button onClick={() => setBaseMonth(m => addMonths(m, 1))}
            className="p-1.5 rounded-md"
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            style={{ color: 'var(--color-text-secondary)' }}>
            <ChevronRight size={13} />
          </button>
        </div>
        {/* Mois empilés */}
        {Array.from({ length: N_MONTHS }, (_, i) => (
          <div key={i}>
            {i > 0 && <div style={{ height: 1, background: 'var(--color-border-subtle)', margin: '0 12px' }} />}
            <MonthGrid offset={i} />
          </div>
        ))}
      </div>
    )
  }

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
            {/* Vue équipe */}
            <button onClick={() => navigate('/planning/equipe')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
              style={{ background:'var(--color-bg-tertiary)', color:'var(--color-text-secondary)', border:'1px solid var(--color-border-subtle)' }}
              title="Vue planning équipe">
              👥
            </button>
          </div>
        </div>

        {/* Ligne 2 : filtres technicien + retard */}
        {(allTechs.length > 1 || totalOverdue > 0) && (
          <div className="flex items-center gap-2 px-4 md:px-6 pb-3 flex-wrap">
            {/* Filtre technicien */}
            {allTechs.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button onClick={() => setFilterTech('')}
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
                    <button key={t} onClick={() => setFilterTech(t===filterTech?'':t)}
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
        <MiniCalendarPanel />
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

      {/* ── VUE JOUR (toutes tailles) ── */}
      {viewMode === 'jour' && (() => {
        const D_START = 7, D_END = 20, PX_H = 64, PX_M = PX_H / 60
        const dateStr = toISO(selectedDate)
        const allEvts = sortEvts((() => {
          let evts = eventsByDate[dateStr] ?? []
          if (filterTech)   evts = evts.filter(e => normTech(e.technicien) === filterTech)
          if (filterRetard) evts = evts.filter(e => e.statusColor === 'var(--color-danger)' || e.statusLabel === 'En retard')
          return evts
        })())
        const allDayEvts = allEvts.filter(e => !e.plannedTime)
        const timedEvts  = assignColumns(
          allEvts.filter(e => !!e.plannedTime)
            .map(e => ({ ...e, startMin: parseHHMM(e.plannedTime!), durationMin: 60 }))
        )
        const now    = new Date()
        const nowMin = now.getHours() * 60 + now.getMinutes()
        const showNow = sameDay(selectedDate, today) && nowMin >= D_START * 60 && nowMin <= D_END * 60
        const weekNum = (() => {
          const d = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()))
          d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
          const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
          return Math.ceil((((d.getTime() - y.getTime()) / 86400000) + 1) / 7)
        })()
        return (
          <div className="flex-1 overflow-hidden flex flex-col relative"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}>

            {/* Sous-titre : numéro de semaine */}
            <div className="px-4 py-1.5 shrink-0 flex items-center gap-2"
              style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-secondary)' }}>
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                Semaine {weekNum}
              </span>
              {allEvts.length > 0 && (
                <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  · {allEvts.length} intervention{allEvts.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Section "Toute la journée" */}
            <div className="shrink-0" style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-secondary)' }}>
              <div className="flex">
                <div className="w-14 shrink-0 flex items-start justify-end pr-2 pt-2 pb-1">
                  <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-tertiary)' }}>Jour</span>
                </div>
                <div className="flex-1 py-1.5 pr-3 flex flex-col gap-1" style={{ minHeight: 36 }}>
                  {allDayEvts.length === 0 ? (
                    <span className="text-xs py-1" style={{ color: 'var(--color-text-tertiary)' }}>Aucune intervention planifiée</span>
                  ) : allDayEvts.map(evt => (
                    <button key={evt.id}
                      onClick={() => handleSelectEvent(evt, dateStr)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-[5px] text-left"
                      style={{ background: evt.statusBg }}>
                      <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: evt.statusColor }} />
                      <span className="text-[11px] font-medium flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {evt.title}
                      </span>
                      <span className="text-[10px] truncate max-w-[160px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {evt.subtitle}
                      </span>
                      {evt.technicien && evt.technicien !== '—' && (
                        <span className="text-[9px] px-1 rounded shrink-0"
                          style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                          {evt.technicien}
                        </span>
                      )}
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                        style={{ background: evt.statusColor + '22', color: evt.statusColor }}>
                        {evt.statusLabel}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grille horaire */}
            <div className="flex-1 overflow-y-auto" style={{ background: 'var(--color-bg-primary)' }}>
              <div className="relative" style={{ height: (D_END - D_START) * PX_H }}>

                {/* Lignes horaires */}
                {Array.from({ length: D_END - D_START }, (_, i) => (
                  <div key={i} className="absolute left-0 right-0"
                    style={{ top: i * PX_H, height: PX_H, borderTop: '1px solid var(--color-border-subtle)' }}>
                    <div className="absolute w-14 pr-2 text-right -top-2.5">
                      <span className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                        {String(D_START + i).padStart(2, '0')}h
                      </span>
                    </div>
                    {/* Demi-heure */}
                    <div className="absolute right-0 border-t opacity-40"
                      style={{ left: 56, top: PX_H / 2, borderColor: 'var(--color-border-subtle)', borderStyle: 'dashed' }} />
                  </div>
                ))}

                {/* Indicateur heure actuelle */}
                {showNow && (
                  <div className="absolute flex items-center z-10 pointer-events-none"
                    style={{ top: (nowMin - D_START * 60) * PX_M, left: 56 - 5, right: 0 }}>
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#FF3B30' }} />
                    <div className="flex-1" style={{ height: 2, background: '#FF3B30' }} />
                  </div>
                )}

                {/* Événements horodatés */}
                <div className="absolute inset-0" style={{ left: 56 }}>
                  {timedEvts.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-xs text-center px-4" style={{ color: 'var(--color-text-tertiary)' }}>
                        Aucun événement horodaté
                        <br />Utilisez "+ Événement" pour en ajouter
                      </p>
                    </div>
                  ) : timedEvts.map(evt => {
                    const top    = (evt.startMin - D_START * 60) * PX_M
                    const height = Math.max(evt.durationMin * PX_M, 28)
                    const W      = 1 / evt.totalCols
                    return (
                      <button key={evt.id}
                        onClick={() => handleSelectEvent(evt, dateStr)}
                        className="absolute text-left rounded-lg px-2 py-1 overflow-hidden"
                        style={{
                          top: top + 1, height: height - 2,
                          left: `calc(${evt.col * W * 100}% + 2px)`,
                          width: `calc(${W * 100}% - 4px)`,
                          background: evt.statusBg,
                          border: `1.5px solid ${evt.statusColor}50`,
                        }}>
                        <div className="flex items-center gap-1">
                          <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: evt.statusColor }} />
                          <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {evt.title}
                          </span>
                        </div>
                        {height >= 38 && (
                          <p className="text-[10px] truncate pl-[13px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                            {evt.plannedTime} · {evt.subtitle}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>

              </div>
            </div>

            {/* FAB Planifier — flottant bas droite */}
            <button
              onClick={() => setSelectedDay(dateStr)}
              className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-lg"
              style={{
                background: 'var(--color-accent)',
                color: 'white',
                boxShadow: '0 4px 16px rgba(0,113,227,0.35)',
                zIndex: 20,
              }}>
              <Plus size={16} strokeWidth={2.5} />
              Planifier
            </button>

          </div>
        )
      })()}

      {/* ── DESKTOP : vue calendrier grille ── */}
      <div className={viewMode === 'jour' ? 'hidden' : 'hidden md:flex flex-col flex-1 overflow-hidden'}>

        {viewMode==='semaine' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* En-têtes colonnes */}
            <div className="grid grid-cols-5 shrink-0"
              style={{ borderBottom:'1px solid var(--color-border-subtle)' }}>
              {weekDays.map((day,i) => {
                const isToday = sameDay(day,today)
                const holidayName = holidays[toISO(day)]
                return (
                  <div key={i} className="py-2 px-2 text-center"
                    style={{
                      borderRight: i<4?'1px solid var(--color-border-subtle)':'none',
                      background: holidayName ? 'rgba(255,59,48,0.04)' : 'transparent',
                    }}>
                    <div className="text-[10px] font-medium uppercase mb-1"
                      style={{ color:'var(--color-text-tertiary)', letterSpacing:'0.04em' }}>
                      {JOURS_COURT[i]}
                    </div>
                    <div className="w-7 h-7 flex items-center justify-center rounded-full mx-auto text-sm font-semibold"
                      style={{
                        background: isToday ? '#FF3B30' : holidayName ? 'rgba(255,59,48,0.12)' : 'transparent',
                        color: isToday ? 'white' : holidayName ? '#FF3B30' : 'var(--color-text-primary)',
                      }}>
                      {day.getDate()}
                    </div>
                    {holidayName && (
                      <div className="text-[9px] mt-0.5 truncate px-0.5 font-medium"
                        style={{ color: '#FF3B30' }}>
                        {holidayName}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── Bande bilan 24h — groupe J1+J2 avec bordure commune (colspan) ── */}
            {bilanBand.length > 0 && (
              <div className="shrink-0" style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-secondary)', padding: '3px 0' }}>
                {bilanBand.map((row, rowIdx) => {
                  const wISOs = weekDays.map(toISO)
                  return (
                    <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', padding: '0 2px' }}>
                      {row.map((group, gIdx) => (
                        <div key={gIdx}
                          style={{
                            gridColumn: `${group.colStart + 1} / ${group.colEnd + 2}`,
                            display: 'flex',
                            gap: 2,
                            border: `1px solid ${group.techColor}45`,
                            borderRadius: 7,
                            padding: '1px 2px',
                            margin: '0 3px',
                            background: group.techColor + '08',
                          }}>
                          {group.items.map(item => (
                            <div key={item.event.id} style={{ flex: 1, minWidth: 0 }}>
                              <EventPill
                                event={item.event}
                                dateStr={wISOs[item.colIdx]}
                                onSelect={e => handleSelectEvent(e, wISOs[item.colIdx])}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Bande "toute la journée" — multi-jours (style Apple Calendar) ── */}
            {allDayItems.length > 0 && (() => {
              const numRows = Math.max(...allDayItems.map(s => s.row)) + 1
              return (
                <div className="shrink-0"
                  style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-secondary)', padding: '3px 2px' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gridTemplateRows: `repeat(${numRows}, 18px)`,
                    gap: '2px 0',
                  }}>
                    {allDayItems.map(({ key, colStart, colEnd, row, bg, color, label, badge, tag, onClick, tooltip }) => (
                      <button
                        key={key}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={onClick}
                        className="text-left px-2 rounded flex items-center gap-1 truncate"
                        style={{
                          gridColumn: `${colStart + 1} / ${colEnd + 2}`,
                          gridRow: row + 1,
                          background: bg,
                          marginLeft: 1,
                          marginRight: 1,
                        }}
                        title={tooltip}
                      >
                        <span className="text-[11px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
                        {tag && (
                          <span className="shrink-0 text-[9px]" style={{ color }}>{tag}</span>
                        )}
                        {badge && (
                          <span className="shrink-0 text-[9px] opacity-60" style={{ color: 'var(--color-text-secondary)' }}>{badge}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Colonnes événements */}
            <div className="grid grid-cols-5 flex-1 overflow-y-auto select-none"
              onMouseUp={handleDragMouseUp}
              onMouseLeave={() => { if (isDragging) { setIsDragging(false); setDragStart(null); setDragEnd(null) } }}>
              {weekDays.map((day,i) => {
                const dateStr  = toISO(day)
                const evts     = filteredForDayFlat(dateStr).filter(e => !isMultiDay(e))
                const inDrag   = isInDrag(dateStr)
                const isHoliday = !!holidays[dateStr]
                const hasConge  = eventsByDate[dateStr]?.some(e => e.evenementData?.type === 'conge') ?? false
                return (
                  <div key={i}
                    className="p-1.5 flex flex-col gap-1 cursor-crosshair group"
                    onMouseDown={e => handleDragMouseDown(e, dateStr)}
                    onMouseEnter={() => handleDragMouseEnter(dateStr)}
                    onContextMenu={e => { e.preventDefault(); setCtxMenu({ dateStr, x: e.clientX, y: e.clientY }) }}
                    style={{
                      position: 'relative',
                      borderRight: i<4?'1px solid var(--color-border-subtle)':'none',
                      background: inDrag ? 'rgba(0,113,227,0.1)' : 'var(--color-bg-secondary)',
                      outline: inDrag ? '2px solid rgba(0,113,227,0.3)' : 'none',
                      outlineOffset: '-1px',
                      minHeight: 120,
                      userSelect: 'none',
                    }}>
                    {/* Overlay jour férié */}
                    {isHoliday && !inDrag && <div className="holiday-overlay" />}
                    {/* Overlay congé/RTT */}
                    {!isHoliday && hasConge && !inDrag && <div className="conge-overlay" />}
                    {evts.map(evt => <EventPill key={evt.id} event={evt} dateStr={dateStr} onExpand={() => goToDay(dateStr)} onSelect={e => handleSelectEvent(e, dateStr)} />)}
                    <div className="mt-auto pt-1 flex justify-end pr-0.5">
                      <Plus size={10} className="opacity-20 group-hover:opacity-60 transition-opacity"
                        style={{ color: 'var(--color-text-tertiary)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {viewMode==='mois' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* En-têtes jours */}
            <div className="grid grid-cols-5 shrink-0"
              style={{ borderBottom:'1px solid var(--color-border-subtle)' }}>
              {JOURS_COURT.map((j,i) => (
                <div key={j} className="py-2 text-center text-[10px] font-medium uppercase"
                  style={{ color:'var(--color-text-tertiary)', letterSpacing:'0.04em',
                    borderRight:i<4?'1px solid var(--color-border-subtle)':'none' }}>
                  {j}
                </div>
              ))}
            </div>
            {/* Grille */}
            <div className="grid grid-cols-5 flex-1 overflow-y-auto select-none"
              style={{ gridAutoRows:'1fr' }}
              onMouseUp={handleDragMouseUp}
              onMouseLeave={() => { if (isDragging) { setIsDragging(false); setDragStart(null); setDragEnd(null) } }}>
              {monthGrid.map((day,i) => {
                if (!day) return (
                  <div key={i} style={{
                    borderRight:(i%5)<4?'1px solid var(--color-border-subtle)':'none',
                    borderBottom:'1px solid var(--color-border-subtle)',
                    background:'rgba(0,0,0,0.015)',
                  }} />
                )
                const dateStr = toISO(day)
                const evts = filteredForDay(dateStr)
                const isToday = sameDay(day,today)
                const inDrag = isInDrag(dateStr)
                const holidayName = holidays[dateStr]
                const hasCongeM   = eventsByDate[dateStr]?.some(e => e.evenementData?.type === 'conge') ?? false
                const MAX = 3
                return (
                  <div key={i}
                    className="p-1 flex flex-col gap-0.5 cursor-crosshair group"
                    onMouseDown={e => handleDragMouseDown(e, dateStr)}
                    onMouseEnter={() => handleDragMouseEnter(dateStr)}
                    onContextMenu={e => { e.preventDefault(); setCtxMenu({ dateStr, x: e.clientX, y: e.clientY }) }}
                    style={{
                      position: 'relative',
                      borderRight:(i%5)<4?'1px solid var(--color-border-subtle)':'none',
                      borderBottom:'1px solid var(--color-border-subtle)',
                      background: inDrag ? 'rgba(0,113,227,0.1)' : 'var(--color-bg-secondary)',
                      outline: inDrag ? '2px solid rgba(0,113,227,0.3)' : 'none',
                      outlineOffset: '-1px',
                      minHeight: 90,
                      userSelect: 'none',
                    }}>
                    {/* Overlay jour férié */}
                    {holidayName && !inDrag && <div className="holiday-overlay" />}
                    {/* Overlay congé/RTT */}
                    {!holidayName && hasCongeM && !inDrag && <div className="conge-overlay" />}
                    <div className="flex items-center justify-between mb-0.5 px-0.5">
                      <span className="flex items-center gap-1">
                        <span className="w-[22px] h-[22px] flex items-center justify-center rounded-full text-[11px] font-semibold"
                          style={{
                            background: isToday ? '#FF3B30' : holidayName ? 'rgba(255,59,48,0.12)' : 'transparent',
                            color: isToday ? 'white' : holidayName ? '#FF3B30' : 'var(--color-text-secondary)',
                          }}>
                          {day.getDate()}
                        </span>
                        {day.getDate()===1 && !holidayName && (
                          <span className="text-[10px] font-normal" style={{ color:'var(--color-text-tertiary)' }}>
                            {MOIS_LONG[day.getMonth()].slice(0,3).toLowerCase()}.
                          </span>
                        )}
                        {holidayName && (
                          <span className="text-[9px] font-medium truncate max-w-[70px]"
                            style={{ color: '#FF3B30' }}>
                            {holidayName}
                          </span>
                        )}
                      </span>
                      <Plus size={10} className="opacity-25 group-hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--color-text-tertiary)' }} />
                    </div>
                    {evts.slice(0,MAX).map(evt => <EventPill key={evt.id} event={evt} compact dateStr={dateStr} onExpand={() => goToDay(dateStr)} onSelect={e => handleSelectEvent(e, dateStr)} />)}
                    {evts.length>MAX && (
                      <span className="text-[10px] pl-1 mt-0.5" style={{ color:'var(--color-text-tertiary)' }}>
                        +{evts.length-MAX} autres
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
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
