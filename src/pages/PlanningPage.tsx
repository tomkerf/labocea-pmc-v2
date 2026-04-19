import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, ExternalLink, Trash2, Plus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useClientsListener, saveClient } from '@/hooks/useClients'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useVerificationsListener } from '@/hooks/useVerifications'
import { useMaintenancesListener, saveMaintenance } from '@/hooks/useMaintenances'
import { useEvenementsListener, createEvenement, deleteEvenement } from '@/hooks/useEvenements'
import { useMissionsStore } from '@/stores/missionsStore'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useEvenementsStore } from '@/stores/evenementsStore'
import { useAuthStore } from '@/stores/authStore'
import type { Sampling, Verification, Maintenance, EvenementPersonnel, TypeEvenement } from '@/types'
import { isSamplingOverdue } from '@/lib/overdue'

// ── Types ───────────────────────────────────────────────────

interface PlanningEvent {
  id: string
  type: 'prelevement' | 'maintenance' | 'verification' | 'evenement'
  title: string
  subtitle: string
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
  evenementData?: EvenementPersonnel
}

type ViewMode = 'semaine' | 'mois'

// ── Helpers ─────────────────────────────────────────────────

const JOURS_COURT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const JOURS_LONG  = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const MOIS_LONG   = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                     'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function startOfWeek(d: Date): Date {
  const r = new Date(d); const day = r.getDay()
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day)); r.setHours(0,0,0,0); return r
}
function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1) }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate()+n); return r }
function addMonths(d: Date, n: number): Date { return new Date(d.getFullYear(), d.getMonth()+n, 1) }
function toISO(d: Date): string { return d.toISOString().split('T')[0] }
function sameDay(a: Date, b: Date): boolean { return toISO(a) === toISO(b) }

function buildMonthGrid(ms: Date): (Date|null)[] {
  const y = ms.getFullYear(), m = ms.getMonth()
  const dim = new Date(y, m+1, 0).getDate()
  const offset = ms.getDay() === 0 ? 6 : ms.getDay()-1
  const cells: (Date|null)[] = []
  for (let i=0; i<offset; i++) cells.push(null)
  for (let d=1; d<=dim; d++) cells.push(new Date(y,m,d))
  while (cells.length%7) cells.push(null)
  return cells
}

function sortEvts(evts: PlanningEvent[]): PlanningEvent[] {
  return evts.slice().sort((a,b) => {
    if (a.plannedTime && b.plannedTime) return a.plannedTime.localeCompare(b.plannedTime)
    if (a.plannedTime) return -1
    if (b.plannedTime) return 1
    return 0
  })
}

const SAMPLING_CFG: Record<string,{label:string;bg:string;color:string}> = {
  planned:      { label:'Planifié',     bg:'var(--color-bg-tertiary)',   color:'var(--color-text-secondary)' },
  done:         { label:'Réalisé',      bg:'var(--color-success-light)', color:'var(--color-success)' },
  overdue:      { label:'En retard',    bg:'var(--color-danger-light)',  color:'var(--color-danger)' },
  non_effectue: { label:'Non effectué', bg:'var(--color-warning-light)', color:'var(--color-warning)' },
}
const MAINTENANCE_CFG: Record<string,{label:string;bg:string;color:string}> = {
  planifiee:  { label:'Planifiée',  bg:'var(--color-bg-tertiary)',   color:'var(--color-text-secondary)' },
  en_cours:   { label:'En cours',   bg:'var(--color-warning-light)', color:'var(--color-warning)' },
  realisee:   { label:'Réalisée',   bg:'var(--color-success-light)', color:'var(--color-success)' },
  abandonnee: { label:'Abandonnée', bg:'var(--color-danger-light)',  color:'var(--color-danger)' },
}
const EVENEMENT_CFG: Record<TypeEvenement,{label:string;color:string;bg:string}> = {
  rappel:  { label:'Rappel',  color:'var(--color-accent)',  bg:'var(--color-accent-light)'  },
  reunion: { label:'Réunion', color:'#AF52DE',              bg:'#F5EEFF'                    },
  rapport: { label:'Rapport', color:'var(--color-warning)', bg:'var(--color-warning-light)' },
  autre:   { label:'Autre',   color:'var(--color-neutral)', bg:'var(--color-bg-tertiary)'   },
}

// ── Composant principal ─────────────────────────────────────

export default function PlanningPage() {
  useClientsListener(); useEquipementsListener()
  useVerificationsListener(); useMaintenancesListener(); useEvenementsListener()

  const navigate = useNavigate()
  const uid       = useAuthStore(s => s.uid())
  const initiales = useAuthStore(s => s.initiales())
  const { clients }      = useMissionsStore()
  const { verifications } = useMetrologieStore()
  const { maintenances }  = useMaintenancesStore()
  const { evenements }    = useEvenementsStore()

  const today = new Date(); today.setHours(0,0,0,0)

  const [viewMode,     setViewMode]     = useState<ViewMode>('semaine')
  const [weekStart,    setWeekStart]    = useState(() => startOfWeek(today))
  const [monthStart,   setMonthStart]   = useState(() => startOfMonth(today))
  const [selectedDate, setSelectedDate] = useState(today)
  const [filterTech,   setFilterTech]   = useState('')
  const [filterRetard, setFilterRetard] = useState(false)

  // Validation rapide
  const [validatingId,   setValidatingId]   = useState<string|null>(null)
  const [validationDate, setValidationDate] = useState(toISO(today))
  const [saving, setSaving] = useState(false)

  // Nouvel événement
  const [showNewEvt,    setShowNewEvt]    = useState(false)
  const [newEvtDate,    setNewEvtDate]    = useState('')   // ISO
  const [newEvtTitre,   setNewEvtTitre]   = useState('')
  const [newEvtType,    setNewEvtType]    = useState<TypeEvenement>('rappel')
  const [newEvtHeure,   setNewEvtHeure]   = useState('')
  const [newEvtNotes,   setNewEvtNotes]   = useState('')
  const [creatingEvt,   setCreatingEvt]   = useState(false)

  const weekDays  = useMemo(() => Array.from({length:7},(_,i) => addDays(weekStart,i)), [weekStart])
  const monthGrid = useMemo(() => buildMonthGrid(monthStart), [monthStart])

  const isWeekend = (d: Date) => { const day = d.getDay(); return day===0||day===6 }

  // ── Index date → events ─────────────────────────────────────

  const eventsByDate = useMemo(() => {
    const map: Record<string,PlanningEvent[]> = {}
    const year = new Date().getFullYear()
    const add = (dateStr:string, e:PlanningEvent) => {
      if (!dateStr) return
      if (!map[dateStr]) map[dateStr] = []
      map[dateStr].push(e)
    }

    clients.forEach(client => {
      client.plans.forEach(plan => {
        plan.samplings.forEach((s:Sampling) => {
          const overdue = isSamplingOverdue(s)
          const dateStr = s.doneDate || toISO(new Date(year, s.plannedMonth, s.plannedDay||1))
          const cfg = overdue ? SAMPLING_CFG.overdue : SAMPLING_CFG[s.status] ?? SAMPLING_CFG.planned
          add(dateStr, {
            id: s.id, type:'prelevement',
            title: client.nom, subtitle: plan.siteNom || plan.nom || '—',
            statusLabel:cfg.label, statusBg:cfg.bg, statusColor:cfg.color,
            link:`/missions/${client.id}/plan/${plan.id}/sampling/${s.id}`,
            isDone: s.status==='done', technicien: client.preleveur||'—',
            plannedTime: s.plannedTime, clientId:client.id, planId:plan.id, samplingId:s.id,
          })
        })
      })
    })

    maintenances.forEach((m:Maintenance) => {
      const dateStr = m.dateRealisee||m.datePrevue
      const cfg = MAINTENANCE_CFG[m.statut]??MAINTENANCE_CFG.planifiee
      add(dateStr, {
        id:m.id, type:'maintenance',
        title:m.equipementNom||'Équipement',
        subtitle: m.type==='preventive'?'Maintenance préventive':m.type==='corrective'?'Maintenance corrective':'Panne',
        statusLabel:cfg.label, statusBg:cfg.bg, statusColor:cfg.color,
        link:`/maintenances/${m.id}`, isDone:m.statut==='realisee', technicien:m.technicienNom||'—',
        maintenanceData:m,
      })
    })

    verifications.forEach((v:Verification) => {
      if (!v.prochainControle) return
      add(v.prochainControle, {
        id:v.id, type:'verification',
        title:v.equipementNom||'Équipement',
        subtitle: v.type==='etalonnage_interne'?'Étalonnage interne':v.type==='verification_externe'?'Vérification externe':'Contrôle terrain',
        statusLabel:'Métrologie', statusBg:'var(--color-accent-light)', statusColor:'var(--color-accent)',
        link:`/metrologie/${v.id}`, isDone:false, technicien:v.technicienNom||'—',
      })
    })

    evenements.forEach((ev:EvenementPersonnel) => {
      const cfg = EVENEMENT_CFG[ev.type]??EVENEMENT_CFG.autre
      add(ev.date, {
        id:ev.id, type:'evenement',
        title:ev.titre, subtitle:cfg.label,
        statusLabel:cfg.label, statusBg:cfg.bg, statusColor:cfg.color,
        link:'', isDone:false, technicien:ev.createdByInitiales||'—',
        plannedTime:ev.heure||undefined, evenementData:ev,
      })
    })

    return map
  }, [clients, maintenances, verifications, evenements])

  // ── Filtrage technicien ─────────────────────────────────────

  const allTechs = useMemo(() => {
    const s = new Set<string>()
    Object.values(eventsByDate).flat().forEach(e => { if (e.technicien&&e.technicien!=='—') s.add(e.technicien) })
    return Array.from(s).sort()
  }, [eventsByDate])

  function filteredForDay(dateStr:string): PlanningEvent[] {
    let evts = eventsByDate[dateStr]??[]
    if (filterTech) evts = evts.filter(e => e.technicien===filterTech)
    if (filterRetard) evts = evts.filter(e => e.statusColor==='var(--color-danger)'||e.statusLabel==='En retard')
    return sortEvts(evts)
  }

  const totalOverdue = useMemo(() => {
    let n=0
    clients.forEach(c => c.plans.forEach(p => p.samplings.forEach((s:Sampling) => { if (isSamplingOverdue(s)) n++ })))
    return n
  }, [clients])

  // ── Liste période (mobile + vue retard) ────────────────────

  const periodList = useMemo(() => {
    const days: Date[] = viewMode==='semaine'
      ? weekDays
      : Array.from({length: new Date(monthStart.getFullYear(),monthStart.getMonth()+1,0).getDate()},
          (_,i) => new Date(monthStart.getFullYear(),monthStart.getMonth(),i+1))
    return days
      .map(date => ({ date, dateStr:toISO(date), events: filteredForDay(toISO(date)) }))
      .filter(g => g.events.length>0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, weekDays, monthStart, eventsByDate, filterTech, filterRetard])

  // ── Validation ─────────────────────────────────────────────

  async function handleValidate(event:PlanningEvent) {
    if (!uid||saving) return
    setSaving(true)
    try {
      if (event.type==='prelevement'&&event.clientId&&event.planId&&event.samplingId) {
        const client = clients.find(c=>c.id===event.clientId)
        if (!client) return
        await saveClient({
          ...client,
          plans: client.plans.map(plan => plan.id!==event.planId ? plan : {
            ...plan,
            samplings: plan.samplings.map((s:Sampling) =>
              s.id===event.samplingId ? {...s,status:'done'as const,doneDate:validationDate,doneBy:uid} : s
            )
          })
        }, uid)
      }
      if (event.type==='maintenance'&&event.maintenanceData) {
        await saveMaintenance({...event.maintenanceData, statut:'realisee', dateRealisee:validationDate}, uid)
      }
      setValidatingId(null)
    } finally { setSaving(false) }
  }

  const isValidationWeekend = useMemo(() => {
    const d = new Date(validationDate+'T12:00:00'); return d.getDay()===0||d.getDay()===6
  }, [validationDate])

  // ── Nouvel événement ────────────────────────────────────────

  function openNewEvt(dateStr:string) {
    setNewEvtDate(dateStr); setNewEvtTitre(''); setNewEvtType('rappel')
    setNewEvtHeure(''); setNewEvtNotes(''); setShowNewEvt(true); setValidatingId(null)
  }

  async function handleCreateEvt() {
    if (!newEvtTitre.trim()||!uid||!newEvtDate) return
    setCreatingEvt(true)
    try {
      await createEvenement(newEvtTitre.trim(), newEvtDate, newEvtType, newEvtHeure, newEvtNotes, uid, initiales)
      setShowNewEvt(false)
    } finally { setCreatingEvt(false) }
  }

  // ── Navigation ──────────────────────────────────────────────

  function prev() {
    if (viewMode==='semaine') { setWeekStart(addDays(weekStart,-7)) }
    else { setMonthStart(addMonths(monthStart,-1)) }
    setShowNewEvt(false); setValidatingId(null)
  }
  function next() {
    if (viewMode==='semaine') { setWeekStart(addDays(weekStart,7)) }
    else { setMonthStart(addMonths(monthStart,1)) }
    setShowNewEvt(false); setValidatingId(null)
  }
  function goToday() {
    setWeekStart(startOfWeek(today)); setMonthStart(startOfMonth(today))
    setSelectedDate(today); setShowNewEvt(false); setValidatingId(null)
  }
  function switchView(m:ViewMode) {
    setViewMode(m)
    if (m==='mois') setMonthStart(startOfMonth(selectedDate))
    if (m==='semaine') setWeekStart(startOfWeek(selectedDate))
    setShowNewEvt(false); setValidatingId(null)
  }

  // ── Label période ───────────────────────────────────────────

  const periodLabel = viewMode==='semaine' ? (() => {
    const end = addDays(weekStart,6)
    if (weekStart.getMonth()===end.getMonth())
      return `${weekStart.getDate()}–${end.getDate()} ${MOIS_LONG[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    return `${weekStart.getDate()} ${MOIS_LONG[weekStart.getMonth()]} – ${end.getDate()} ${MOIS_LONG[end.getMonth()]} ${end.getFullYear()}`
  })() : `${MOIS_LONG[monthStart.getMonth()]} ${monthStart.getFullYear()}`

  // ── Pill calendrier Apple-style (desktop) ──────────────────

  function EventPill({ event }: { event:PlanningEvent }) {
    const isEvt = event.type==='evenement'
    return (
      <button
        onClick={() => isEvt ? null : navigate(event.link)}
        className="w-full text-left flex items-center gap-1.5 px-1.5 py-[3px] rounded-[5px] text-[11px] leading-snug"
        style={{
          background: event.statusBg,
          cursor: isEvt ? 'default' : 'pointer',
        }}
        title={`${event.title} — ${event.subtitle}`}
      >
        {/* Point coloré */}
        <span className="shrink-0 w-[7px] h-[7px] rounded-full" style={{ background: event.statusColor }} />
        {/* Titre */}
        <span className="flex-1 truncate font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {event.title}
        </span>
        {/* Heure */}
        {event.plannedTime && (
          <span className="shrink-0 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            {event.plannedTime}
          </span>
        )}
      </button>
    )
  }

  // ── Ligne liste (mobile + desktop détail) ───────────────────

  function EventRow({ event, isLast }: { event:PlanningEvent; isLast:boolean }) {
    const isValidating = validatingId===event.id
    const isEvt = event.type==='evenement'

    return (
      <div style={{ borderBottom: isLast?'none':'1px solid var(--color-border-subtle)' }}>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-1 self-stretch rounded-full shrink-0" style={{ background:event.statusColor, minHeight:36 }} />

          {isEvt ? (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color:'var(--color-text-primary)' }}>{event.title}</p>
              {event.plannedTime && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold mt-0.5 inline-block"
                  style={{ background:'var(--color-accent-light)', color:'var(--color-accent)' }}>
                  {event.plannedTime}
                </span>
              )}
            </div>
          ) : (
            <button className="flex-1 min-w-0 text-left" onClick={() => navigate(event.link)}>
              <p className="text-sm font-medium truncate" style={{ color:'var(--color-text-primary)' }}>{event.title}</p>
              <p className="text-xs mt-0.5 truncate" style={{ color:'var(--color-text-secondary)' }}>{event.subtitle}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {event.plannedTime && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                    style={{ background:'var(--color-accent-light)', color:'var(--color-accent)' }}>
                    {event.plannedTime}
                  </span>
                )}
                {event.technicien&&event.technicien!=='—' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background:'var(--color-bg-tertiary)', color:'var(--color-text-secondary)' }}>
                    {event.technicien}
                  </span>
                )}
              </div>
            </button>
          )}

          <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
            style={{ background:event.statusBg, color:event.statusColor }}>
            {event.statusLabel}
          </span>

          {isEvt ? (
            <button onClick={() => event.evenementData&&deleteEvenement(event.evenementData.id)}
              className="shrink-0 p-1.5 rounded-lg" style={{ color:'var(--color-text-tertiary)' }}
              onMouseEnter={e=>(e.currentTarget.style.color='var(--color-danger)')}
              onMouseLeave={e=>(e.currentTarget.style.color='var(--color-text-tertiary)')}>
              <Trash2 size={15} />
            </button>
          ) : event.isDone ? (
            <CheckCircle2 size={20} className="shrink-0" style={{ color:'var(--color-success)' }} />
          ) : event.type==='verification' ? (
            <button onClick={() => navigate(event.link)} className="shrink-0 p-1.5 rounded-lg"
              style={{ color:'var(--color-accent)', background:'var(--color-accent-light)' }}>
              <ExternalLink size={15} />
            </button>
          ) : (
            <button
              onClick={() => isValidating ? setValidatingId(null) : (setValidatingId(event.id), setValidationDate(toISO(today)))}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: isValidating?'var(--color-bg-tertiary)':'var(--color-success-light)',
                color: isValidating?'var(--color-text-secondary)':'var(--color-success)',
                border: `1px solid ${isValidating?'var(--color-border)':'transparent'}`,
              }}>
              {isValidating?'Annuler':'✓ Valider'}
            </button>
          )}
        </div>

        {isValidating && !isEvt && (
          <div className="px-5 py-4 flex flex-col gap-3"
            style={{ background:'var(--color-bg-tertiary)', borderTop:'1px solid var(--color-border-subtle)' }}>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1.5" style={{ color:'var(--color-text-secondary)' }}>Date de réalisation</label>
                <input type="date" value={validationDate} onChange={e=>setValidationDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background:'var(--color-bg-secondary)', border:'1px solid var(--color-border)', color:'var(--color-text-primary)' }} />
              </div>
              <button onClick={() => handleValidate(event)} disabled={saving||!validationDate}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background:'var(--color-success)', color:'white', opacity:saving?0.6:1 }}>
                {saving?'…':'Confirmer'}
              </button>
            </div>
            {isValidationWeekend && (
              <p className="text-xs px-3 py-2 rounded-lg"
                style={{ background:'var(--color-warning-light)', color:'var(--color-warning)' }}>
                ⚠️ Intervention un week-end — vérifiez la date.
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Formulaire nouvel événement ─────────────────────────────

  function NewEventForm() {
    const d = newEvtDate ? new Date(newEvtDate+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}) : ''
    return (
      <div className="rounded-xl p-4 mb-3"
        style={{ background:'var(--color-bg-secondary)', border:'1px solid var(--color-border-subtle)', boxShadow:'var(--shadow-card)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase" style={{ color:'var(--color-text-tertiary)', letterSpacing:'0.06em' }}>
            Nouvel événement{d ? ` — ${d}` : ''}
          </p>
          <button onClick={() => setShowNewEvt(false)} style={{ color:'var(--color-text-tertiary)' }}>
            <X size={14} />
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          <input type="text" value={newEvtTitre} onChange={e=>setNewEvtTitre(e.target.value)}
            placeholder="Titre de l'événement…" autoFocus
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background:'var(--color-bg-tertiary)', border:'1px solid var(--color-border)', color:'var(--color-text-primary)' }}
            onKeyDown={e => e.key==='Enter' && handleCreateEvt()} />
          <div className="flex gap-2">
            <select value={newEvtType} onChange={e=>setNewEvtType(e.target.value as TypeEvenement)}
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background:'var(--color-bg-tertiary)', border:'1px solid var(--color-border)', color:'var(--color-text-primary)' }}>
              <option value="rappel">Rappel</option>
              <option value="reunion">Réunion / Entretien</option>
              <option value="rapport">Rapport</option>
              <option value="autre">Autre</option>
            </select>
            <input type="time" value={newEvtHeure} onChange={e=>setNewEvtHeure(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background:'var(--color-bg-tertiary)', border:'1px solid var(--color-border)', color:'var(--color-text-primary)', width:110 }} />
          </div>
          <input type="text" value={newEvtNotes} onChange={e=>setNewEvtNotes(e.target.value)}
            placeholder="Notes (optionnel)"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background:'var(--color-bg-tertiary)', border:'1px solid var(--color-border)', color:'var(--color-text-primary)' }} />
          <button onClick={handleCreateEvt} disabled={!newEvtTitre.trim()||creatingEvt}
            className="self-end px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background:newEvtTitre.trim()?'var(--color-accent)':'var(--color-border)', color:'white', opacity:creatingEvt?0.6:1 }}>
            {creatingEvt?'Ajout…':'Ajouter'}
          </button>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* ── En-tête navigation ── */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 shrink-0 flex-wrap gap-2"
        style={{ borderBottom:'1px solid var(--color-border-subtle)', background:'var(--color-bg-secondary)' }}>

        {/* Navigation + label */}
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
        </div>

        {/* Contrôles droite */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle vue */}
          <div className="flex rounded-lg overflow-hidden"
            style={{ border:'1px solid var(--color-border-subtle)', background:'var(--color-bg-tertiary)' }}>
            {(['semaine','mois'] as ViewMode[]).map(m => (
              <button key={m} onClick={() => switchView(m)}
                className="px-3 py-1 text-xs font-medium capitalize"
                style={{ background:viewMode===m?'var(--color-accent)':'transparent', color:viewMode===m?'white':'var(--color-text-secondary)' }}>
                {m}
              </button>
            ))}
          </div>

          {/* Filtre retard */}
          {totalOverdue>0 && (
            <button onClick={() => setFilterRetard(v=>!v)}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background:filterRetard?'var(--color-danger)':'var(--color-danger-light)', color:filterRetard?'white':'var(--color-danger)' }}>
              ⚠ {totalOverdue} en retard
            </button>
          )}

          {/* Filtre technicien */}
          {allTechs.length>1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setFilterTech('')}
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background:!filterTech?'var(--color-accent)':'var(--color-bg-secondary)', color:!filterTech?'white':'var(--color-text-secondary)', border:`1px solid ${!filterTech?'transparent':'var(--color-border-subtle)'}` }}>
                Tous
              </button>
              {allTechs.map(t => (
                <button key={t} onClick={() => setFilterTech(t===filterTech?'':t)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background:filterTech===t?'var(--color-accent)':'var(--color-bg-secondary)', color:filterTech===t?'white':'var(--color-text-secondary)', border:`1px solid ${filterTech===t?'transparent':'var(--color-border-subtle)'}` }}>
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP : vue calendrier grille ── */}
      <div className="hidden md:flex flex-col flex-1 overflow-hidden">

        {viewMode==='semaine' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* En-têtes colonnes */}
            <div className="grid grid-cols-7 shrink-0"
              style={{ borderBottom:'1px solid var(--color-border-subtle)' }}>
              {weekDays.map((day,i) => {
                const isToday = sameDay(day,today)
                const isWE = isWeekend(day)
                return (
                  <div key={i} className="py-2 px-2 text-center"
                    style={{ borderRight: i<6?'1px solid var(--color-border-subtle)':'none' }}>
                    <div className="text-[10px] font-medium uppercase mb-1"
                      style={{ color:isWE?'var(--color-text-tertiary)':'var(--color-text-tertiary)', letterSpacing:'0.04em' }}>
                      {JOURS_COURT[i]}
                    </div>
                    <div className="w-7 h-7 flex items-center justify-center rounded-full mx-auto text-sm font-semibold"
                      style={{
                        background:isToday?'#FF3B30':'transparent',
                        color:isToday?'white':isWE?'var(--color-text-tertiary)':'var(--color-text-primary)',
                      }}>
                      {day.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Colonnes événements */}
            <div className="grid grid-cols-7 flex-1 overflow-y-auto">
              {weekDays.map((day,i) => {
                const dateStr = toISO(day)
                const evts = filteredForDay(dateStr)
                const isToday = sameDay(day,today)
                const isWE = isWeekend(day)
                return (
                  <div key={i} className="p-1.5 flex flex-col gap-1"
                    style={{
                      borderRight: i<6?'1px solid var(--color-border-subtle)':'none',
                      background: isToday?'var(--color-accent-light)':isWE?'var(--color-bg-tertiary)40':'transparent',
                      minHeight: 120,
                    }}>
                    {evts.map(evt => <EventPill key={evt.id} event={evt} />)}
                    {/* Bouton ajouter événement */}
                    <button
                      onClick={() => openNewEvt(dateStr)}
                      className="opacity-0 hover:opacity-100 group-hover:opacity-100 w-full mt-auto flex items-center justify-center gap-1 rounded-md py-1 text-[10px] transition-opacity"
                      style={{ color:'var(--color-text-tertiary)', border:'1px dashed var(--color-border)' }}
                      onMouseEnter={e=>(e.currentTarget.style.opacity='1')}
                      onMouseLeave={e=>(e.currentTarget.style.opacity='0')}>
                      <Plus size={10}/> Ajouter
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {viewMode==='mois' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* En-têtes jours */}
            <div className="grid grid-cols-7 shrink-0"
              style={{ borderBottom:'1px solid var(--color-border-subtle)' }}>
              {JOURS_COURT.map((j,i) => (
                <div key={j} className="py-2 text-center text-[10px] font-medium uppercase"
                  style={{ color:i>=5?'var(--color-text-tertiary)':'var(--color-text-tertiary)', letterSpacing:'0.04em',
                    borderRight:i<6?'1px solid var(--color-border-subtle)':'none' }}>
                  {j}
                </div>
              ))}
            </div>
            {/* Grille */}
            <div className="grid grid-cols-7 flex-1 overflow-y-auto" style={{ gridAutoRows:'1fr' }}>
              {monthGrid.map((day,i) => {
                if (!day) return (
                  <div key={i} style={{ borderRight:(i%7)<6?'1px solid var(--color-border-subtle)':'none', borderBottom:'1px solid var(--color-border-subtle)', background:'var(--color-bg-tertiary)40' }} />
                )
                const dateStr = toISO(day)
                const evts = filteredForDay(dateStr)
                const isToday = sameDay(day,today)
                const isWE = isWeekend(day)
                const MAX = 3
                return (
                  <div key={i} className="p-1 flex flex-col gap-0.5"
                    style={{
                      borderRight:(i%7)<6?'1px solid var(--color-border-subtle)':'none',
                      borderBottom:'1px solid var(--color-border-subtle)',
                      background: isToday?'var(--color-accent-light)':isWE?'var(--color-bg-tertiary)30':'transparent',
                      minHeight: 90,
                    }}>
                    <div className="flex items-center justify-between mb-1 px-0.5">
                      <span className="text-[11px] font-semibold flex items-center gap-1">
                        <span className={`w-[22px] h-[22px] flex items-center justify-center rounded-full text-[11px] font-semibold`}
                          style={{
                            background: isToday ? '#FF3B30' : 'transparent',
                            color: isToday ? 'white' : isWE ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
                          }}>
                          {day.getDate()}
                        </span>
                        {day.getDate()===1 && (
                          <span className="text-[10px] font-normal" style={{ color:'var(--color-text-tertiary)' }}>
                            {MOIS_LONG[day.getMonth()].slice(0,3).toLowerCase()}.
                          </span>
                        )}
                      </span>
                      <button onClick={() => openNewEvt(dateStr)}
                        className="p-0.5 rounded opacity-0"
                        style={{ color:'var(--color-text-tertiary)' }}
                        onMouseEnter={e=>(e.currentTarget.style.opacity='1')}
                        onMouseLeave={e=>(e.currentTarget.style.opacity='0')}>
                        <Plus size={10} />
                      </button>
                    </div>
                    {evts.slice(0,MAX).map(evt => <EventPill key={evt.id} event={evt} />)}
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
      <div className="md:hidden flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4">

          {showNewEvt && <NewEventForm />}

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
                  {/* En-tête du jour */}
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <span className="text-xs font-semibold capitalize"
                      style={{ color:isToday?'var(--color-accent)':'var(--color-text-secondary)' }}>
                      {JOURS_LONG[dayIdx]} {date.getDate()} {MOIS_LONG[date.getMonth()]}
                    </span>
                    {isToday && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background:'var(--color-accent-light)', color:'var(--color-accent)' }}>
                        Aujourd'hui
                      </span>
                    )}
                    <button onClick={() => openNewEvt(dateStr)}
                      className="ml-auto flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ color:'var(--color-text-tertiary)', border:'1px solid var(--color-border-subtle)' }}>
                      <Plus size={9} /> Ajouter
                    </button>
                  </div>
                  {/* Événements */}
                  <div className="rounded-xl overflow-hidden"
                    style={{ background:'var(--color-bg-secondary)', border:'1px solid var(--color-border-subtle)', boxShadow:'var(--shadow-card)' }}>
                    {events.map((evt,i) => <EventRow key={evt.id} event={evt} isLast={i===events.length-1} />)}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Formulaire nouvel événement (desktop) ── */}
      {showNewEvt && (
        <div className="hidden md:block absolute inset-0 z-20 flex items-center justify-center"
          style={{ background:'rgba(0,0,0,0.25)' }}
          onClick={e => { if (e.target===e.currentTarget) setShowNewEvt(false) }}>
          <div className="w-full max-w-md mx-auto" style={{ marginTop:60 }}>
            <NewEventForm />
          </div>
        </div>
      )}

    </div>
  )
}
