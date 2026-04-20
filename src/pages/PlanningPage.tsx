import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, ExternalLink, Trash2, Plus, X, Calendar, Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useClientsListener, saveClient } from '@/hooks/useClients'
import { useEquipementsListener } from '@/hooks/useEquipements'
import { useVerificationsListener } from '@/hooks/useVerifications'
import { useMaintenancesListener } from '@/hooks/useMaintenances'
import { useEvenementsListener, createEvenement, deleteEvenement } from '@/hooks/useEvenements'
import { useMissionsStore } from '@/stores/missionsStore'
import { useMetrologieStore } from '@/stores/metrologieStore'
import { useMaintenancesStore } from '@/stores/maintenancesStore'
import { useEvenementsStore } from '@/stores/evenementsStore'
import { useAuthStore } from '@/stores/authStore'
import type { Client, Sampling, Verification, Maintenance, EvenementPersonnel, TypeEvenement } from '@/types'
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
  count?: number          // nb prélèvements regroupés (même client, même jour)
  plannedTime?: string
  clientId?: string
  planId?: string
  samplingId?: string
  maintenanceData?: Maintenance
  evenementData?: EvenementPersonnel
}

interface PoolItem {
  sampling: Sampling
  clientId: string
  clientNom: string
  planId: string
  planNom: string
  siteNom: string
  techInitiales: string
}

type ViewMode = 'jour' | 'semaine' | 'mois'

// ── Helpers ─────────────────────────────────────────────────

const JOURS_COURT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'] // lun-ven uniquement
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
function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function sameDay(a: Date, b: Date): boolean { return toISO(a) === toISO(b) }

// Grille mensuelle 5 colonnes (lun-ven uniquement — sans week-ends)
function buildMonthGrid(ms: Date): (Date|null)[] {
  const y = ms.getFullYear(), m = ms.getMonth()
  const dim = new Date(y, m+1, 0).getDate()
  const firstDow = ms.getDay() // 0=dim, 1=lun … 6=sam
  // Décalage = position du 1er dans la grille lun-ven (0=lun, …, 4=ven)
  // Si le 1er tombe sam/dim → 0 (les jours de WE ne sont pas affichés)
  const offset = (firstDow >= 1 && firstDow <= 5) ? firstDow - 1 : 0
  const cells: (Date|null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= dim; d++) {
    const date = new Date(y, m, d)
    const dow = date.getDay()
    if (dow !== 0 && dow !== 6) cells.push(date) // skip sam & dim
  }
  while (cells.length % 5) cells.push(null)
  return cells
}


// ── Helpers vue Jour ────────────────────────────────────────

function parseHHMM(hhmm: string): number {
  const p = hhmm.split(':')
  return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0)
}

type TimedEvent = PlanningEvent & { startMin: number; durationMin: number; col: number; totalCols: number }

function assignColumns(
  evts: Array<PlanningEvent & { startMin: number; durationMin: number }>
): TimedEvent[] {
  if (!evts.length) return []
  const sorted = [...evts].sort((a, b) => a.startMin - b.startMin)
  const colEnds: number[] = []
  const assigned: TimedEvent[] = sorted.map(evt => {
    let col = colEnds.findIndex(end => end <= evt.startMin)
    if (col === -1) col = colEnds.length
    colEnds[col] = evt.startMin + evt.durationMin
    return { ...evt, col, totalCols: 0 }
  })
  assigned.forEach(e => { e.totalCols = colEnds.length })
  return assigned
}

function sortEvts(evts: PlanningEvent[]): PlanningEvent[] {
  return evts.slice().sort((a,b) => {
    if (a.plannedTime && b.plannedTime) return a.plannedTime.localeCompare(b.plannedTime)
    if (a.plannedTime) return -1
    if (b.plannedTime) return 1
    return 0
  })
}

// Regroupe les prélèvements du même client sur un même jour en une seule pill
function groupByClient(evts: PlanningEvent[]): PlanningEvent[] {
  const prelev = evts.filter(e => e.type === 'prelevement')
  const others = evts.filter(e => e.type !== 'prelevement')

  const groups = new Map<string, PlanningEvent[]>()
  prelev.forEach(e => {
    const key = e.clientId ?? e.id
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(e)
  })

  const statusPri = (e: PlanningEvent) => {
    if (e.statusColor === 'var(--color-danger)')        return 0  // en retard
    if (e.statusColor === 'var(--color-warning)')       return 1  // non effectué
    if (e.statusColor === 'var(--color-text-secondary)') return 2  // planifié
    return 3                                                       // réalisé
  }

  const merged: PlanningEvent[] = []
  groups.forEach(group => {
    if (group.length === 1) { merged.push(group[0]); return }
    const worst = group.reduce((best, e) => statusPri(e) < statusPri(best) ? e : best, group[0])
    // Noms de points uniques (retire "· Bilan 24h J1/J2" pour dédupliquer)
    const pointNames = [...new Set(
      group.map(e => e.subtitle.replace(/ · Bilan 24h J[12]$/, '')).filter(s => s && s !== '—')
    )]
    const subtitle = pointNames.length <= 2
      ? pointNames.join(' · ')
      : `${group.length} prélèvements`
    merged.push({ ...worst, subtitle, count: group.length, link: `/missions/${worst.clientId}` })
  })

  return sortEvts([...merged, ...others])
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

// ── DayModal ────────────────────────────────────────────────

interface DayModalProps {
  dateStr: string
  onClose: () => void
  dayEvents: PlanningEvent[]
  pool: PoolItem[]
  uid: string | null
  initiales: string
  onValidatePool: (item: PoolItem, date: string) => Promise<void>
  onEventSelect: (event: PlanningEvent) => void
  initialTab?: 'pool'|'jour'|'evt'
}

function DayModal({ dateStr, onClose, dayEvents, pool, uid, initiales, onValidatePool, onEventSelect, initialTab }: DayModalProps) {
  const defaultTab: 'pool'|'jour'|'evt' = initialTab ?? (pool.length > 0 ? 'pool' : 'jour')
  const [activeTab,   setActiveTab]   = useState<'pool'|'jour'|'evt'>(defaultTab)
  const [poolValidId, setPoolValidId] = useState<string|null>(null)
  const [poolDate,    setPoolDate]    = useState(dateStr)
  const [poolSaving,  setPoolSaving]  = useState(false)
  const [evtTitre,    setEvtTitre]    = useState('')
  const [evtType,     setEvtType]     = useState<TypeEvenement>('rappel')
  const [evtHeure,    setEvtHeure]    = useState('')
  const [evtNotes,    setEvtNotes]    = useState('')
  const [evtSaving,   setEvtSaving]   = useState(false)

  const date     = new Date(dateStr + 'T12:00:00')
  const dayLabel = date.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

  async function handleValidatePool(item: PoolItem) {
    if (poolSaving) return
    setPoolSaving(true)
    try { await onValidatePool(item, poolDate); setPoolValidId(null) }
    finally { setPoolSaving(false) }
  }

  async function handleCreateEvt() {
    if (!evtTitre.trim() || !uid) return
    setEvtSaving(true)
    try {
      await createEvenement(evtTitre.trim(), dateStr, evtType, evtHeure, evtNotes, uid, initiales)
      setEvtTitre(''); setEvtHeure(''); setEvtNotes('')
      setActiveTab('jour')
    } finally { setEvtSaving(false) }
  }

  const LIST_TABS = [
    { id: 'pool' as const, label: 'À planifier', count: pool.length },
    { id: 'jour' as const, label: 'Ce jour',     count: dayEvents.length },
  ]

  return (
    <div className="fixed inset-0 z-[55] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full md:max-w-lg flex flex-col overflow-hidden rounded-t-[20px] md:rounded-2xl"
        style={{ background: 'var(--color-bg-primary)', maxHeight: '88vh', boxShadow: 'var(--shadow-modal)' }}>

        {/* Handle mobile */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: 'var(--color-border)' }} />
        </div>

        {/* Header : date + bouton "+ Événement" + fermer */}
        <div className="flex items-center gap-3 px-5 py-3.5 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <p className="flex-1 text-base font-semibold capitalize" style={{ color: 'var(--color-text-primary)' }}>
            {dayLabel}
          </p>
          {/* Bouton "+ Événement" sorti des onglets — nature différente (formulaire) */}
          <button
            onClick={() => setActiveTab(activeTab === 'evt' ? defaultTab : 'evt')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: activeTab === 'evt' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
              color: activeTab === 'evt' ? 'white' : 'var(--color-text-secondary)',
              border: `1px solid ${activeTab === 'evt' ? 'transparent' : 'var(--color-border-subtle)'}`,
            }}>
            <Plus size={11} /> Événement
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg"
            style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-tertiary)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Onglets — 2 uniquement (listes) */}
        {activeTab !== 'evt' && (
          <div className="flex px-4 pt-3 pb-2.5 gap-1.5 shrink-0"
            style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
            {LIST_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                  color: activeTab === tab.id ? 'white' : 'var(--color-text-secondary)',
                }}>
                {tab.label}
                {tab.count > 0 && (
                  <span className="text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full"
                    style={{ background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--color-border)' }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4">

            {/* ── Onglet : À planifier ── */}
            {activeTab === 'pool' && (
              pool.length === 0 ? (
                <div className="rounded-xl py-8 text-center"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>
                  <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Tout est planifié ce mois ✓</p>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
                  {pool.map((item, i) => {
                    const overdue = isSamplingOverdue(item.sampling)
                    const cfg = overdue ? SAMPLING_CFG.overdue : SAMPLING_CFG[item.sampling.status] ?? SAMPLING_CFG.planned
                    const isValidating = poolValidId === item.sampling.id
                    return (
                      <div key={item.sampling.id}
                        style={{ borderBottom: i < pool.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                        {/* Ligne — tap = ouvrir sélecteur de date */}
                        <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                          onClick={() => isValidating
                            ? setPoolValidId(null)
                            : (setPoolValidId(item.sampling.id), setPoolDate(dateStr))
                          }>
                          {/* Dot statut — remplace la barre colorée */}
                          <span className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ background: cfg.color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                              {item.clientNom}
                            </p>
                            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                              {item.planNom}{item.siteNom ? ` · ${item.siteNom}` : ''}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: cfg.bg, color: cfg.color }}>
                                {cfg.label}
                              </span>
                              {item.techInitiales && item.techInitiales !== '—' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                                  {item.techInitiales}
                                </span>
                              )}
                              {item.sampling.plannedDay > 0 && (
                                <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                                  Prévu le {item.sampling.plannedDay}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Icône cercle +/× — remplace le bouton texte "→ Ce jour" */}
                          <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                            style={{
                              background: isValidating ? 'var(--color-bg-tertiary)' : 'var(--color-success-light)',
                              border: isValidating ? '1px solid var(--color-border)' : 'none',
                            }}>
                            {isValidating
                              ? <X size={13} style={{ color: 'var(--color-text-secondary)' }} />
                              : <Plus size={13} style={{ color: 'var(--color-success)' }} />
                            }
                          </span>
                        </button>
                        {/* Panneau date inline */}
                        {isValidating && (
                          <div className="px-4 py-3 flex items-end gap-3"
                            style={{ background: 'var(--color-bg-tertiary)', borderTop: '1px solid var(--color-border-subtle)' }}>
                            <div className="flex-1">
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                                Planifier le
                              </label>
                              <input type="date" value={poolDate} onChange={e => setPoolDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg text-sm"
                                style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
                            </div>
                            <button onClick={() => handleValidatePool(item)} disabled={poolSaving || !poolDate}
                              className="px-4 py-2 rounded-lg text-sm font-medium"
                              style={{ background: 'var(--color-success)', color: 'white', opacity: poolSaving ? 0.6 : 1 }}>
                              {poolSaving ? '…' : 'Confirmer'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            )}

            {/* ── Onglet : Ce jour ── */}
            {activeTab === 'jour' && (
              dayEvents.length === 0 ? (
                <div className="rounded-xl py-8 text-center"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)' }}>
                  <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Aucune intervention ce jour.</p>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
                  {dayEvents.map((evt, i) => {
                    const isLast = i === dayEvents.length - 1
                    return (
                      <button key={evt.id}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                        style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)' }}
                        onClick={() => { onEventSelect(evt) }}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: evt.statusColor }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{evt.title}</p>
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                            {evt.subtitle}{evt.plannedTime && ` · ${evt.plannedTime}`}
                          </p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
                          style={{ background: evt.statusBg, color: evt.statusColor }}>
                          {evt.statusLabel}
                        </span>
                        {evt.isDone
                          ? <CheckCircle2 size={15} className="shrink-0" style={{ color: 'var(--color-success)' }} />
                          : <ChevronRight size={14} className="shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
                        }
                      </button>
                    )
                  })}
                </div>
              )
            )}

            {/* ── Formulaire : + Événement (hors onglets) ── */}
            {activeTab === 'evt' && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold px-1" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Nouvel événement
                </p>
                <div className="rounded-xl p-4 flex flex-col gap-2.5"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
                  <input
                    type="text" value={evtTitre} onChange={e => setEvtTitre(e.target.value)}
                    placeholder="Titre de l'événement…" autoFocus
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                    onKeyDown={e => e.key === 'Enter' && handleCreateEvt()} />
                  <div className="flex gap-2">
                    <select value={evtType} onChange={e => setEvtType(e.target.value as TypeEvenement)}
                      className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                      <option value="rappel">Rappel</option>
                      <option value="reunion">Réunion / Entretien</option>
                      <option value="rapport">Rapport</option>
                      <option value="autre">Autre</option>
                    </select>
                    <input type="time" value={evtHeure} onChange={e => setEvtHeure(e.target.value)}
                      className="px-3 py-2.5 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', width: 110 }} />
                  </div>
                  <input type="text" value={evtNotes} onChange={e => setEvtNotes(e.target.value)}
                    placeholder="Notes (optionnel)"
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
                  <div className="flex items-center justify-between pt-0.5">
                    <button onClick={() => setActiveTab(defaultTab)}
                      className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                      Annuler
                    </button>
                    <button onClick={handleCreateEvt} disabled={!evtTitre.trim() || evtSaving}
                      className="px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ background: evtTitre.trim() ? 'var(--color-accent)' : 'var(--color-border)', color: 'white', opacity: evtSaving ? 0.6 : 1 }}>
                      {evtSaving ? 'Ajout…' : 'Ajouter'}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

// ── CellContextMenu ─────────────────────────────────────────

function CellContextMenu({ x, y, onClose, onPlanifier, onEvenement }: {
  x: number; y: number
  onClose: () => void
  onPlanifier: () => void
  onEvenement: () => void
}) {
  // Ajuste la position pour rester dans l'écran
  const safeX = Math.min(x, window.innerWidth  - 220)
  const safeY = Math.min(y, window.innerHeight - 110)

  return (
    <div className="fixed inset-0 z-[55]" onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose() }}>
      <div className="absolute rounded-xl overflow-hidden"
        style={{
          left: safeX, top: safeY,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid var(--color-border-subtle)',
          minWidth: 210,
        }}
        onClick={e => e.stopPropagation()}>
        <button
          onClick={() => { onPlanifier(); onClose() }}
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-medium"
          style={{ color: 'var(--color-text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Calendar size={15} style={{ color: 'var(--color-accent)' }} />
          Planifier un prélèvement
        </button>
        <div style={{ height: 1, background: 'var(--color-border-subtle)' }} />
        <button
          onClick={() => { onEvenement(); onClose() }}
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-medium"
          style={{ color: 'var(--color-text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Bell size={15} style={{ color: 'var(--color-accent)' }} />
          Nouvel événement
        </button>
      </div>
    </div>
  )
}

// ── EventDetailModal ────────────────────────────────────────

interface EventDetailModalProps {
  event: PlanningEvent
  dateStr: string
  onClose: () => void
  onCancel: (event: PlanningEvent) => Promise<void>
  onMove: (event: PlanningEvent, newDate: string) => Promise<void>
  onDelete: (event: PlanningEvent) => void
}

function EventDetailModal({ event, dateStr, onClose, onCancel, onMove, onDelete }: EventDetailModalProps) {
  const navigate = useNavigate()
  const [isMoving, setIsMoving] = useState(false)
  const [moveDate, setMoveDate] = useState(dateStr)
  const [saving, setSaving] = useState(false)

  const isPrelev = event.type === 'prelevement'
  const isEvt    = event.type === 'evenement'

  const dateLabel = new Date(dateStr + 'T12:00:00')
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  async function handleMove() {
    if (!moveDate || saving) return
    setSaving(true)
    try { await onMove(event, moveDate); onClose() }
    finally { setSaving(false) }
  }

  async function handleCancel() {
    setSaving(true)
    try { await onCancel(event); onClose() }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full md:max-w-sm flex flex-col rounded-t-[20px] md:rounded-2xl"
        style={{ background: 'var(--color-bg-secondary)', boxShadow: 'var(--shadow-modal)', maxHeight: '90dvh', overflow: 'hidden' }}>

        {/* Handle mobile */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: 'var(--color-border)' }} />
        </div>

        {/* Header — titre + badges + date */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-4">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ background: event.statusColor }} />
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
              {event.title}
            </p>
            {event.subtitle && event.subtitle !== '—' && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                {event.subtitle}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: event.statusBg, color: event.statusColor }}>
                {event.statusLabel}
              </span>
              {event.technicien && event.technicien !== '—' && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                  {event.technicien}
                </span>
              )}
              {event.plannedTime && (
                <span className="text-[11px] px-2 py-0.5 rounded font-semibold"
                  style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                  {event.plannedTime}
                </span>
              )}
            </div>
            <p className="text-xs mt-1.5 capitalize" style={{ color: 'var(--color-text-tertiary)' }}>
              {dateLabel}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg shrink-0 mt-0.5"
            style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-tertiary)' }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ height: 1, background: 'var(--color-border-subtle)' }} />

        {/* Panneau déplacer — inline */}
        {isMoving && (
          <div className="px-5 py-3.5 flex items-end gap-3"
            style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Nouvelle date
              </label>
              <input type="date" value={moveDate} onChange={e => setMoveDate(e.target.value)} autoFocus
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
            </div>
            <button onClick={handleMove} disabled={!moveDate || saving}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--color-accent)', color: 'white', opacity: (!moveDate || saving) ? 0.5 : 1 }}>
              {saving ? '…' : 'Déplacer'}
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col px-4 py-3 gap-2 overflow-y-auto"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>

          {/* Voir la mission / maintenance / métrologie */}
          {event.link && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // Construction explicite de l'URL pour prélèvements (évite ghost-tap iOS sur event.link)
                const dest = (event.type === 'prelevement' && event.clientId && event.planId && event.samplingId)
                  ? `/missions/${event.clientId}/plan/${event.planId}/sampling/${event.samplingId}`
                  : event.link
                onClose()
                // Délai court pour laisser le modal se fermer avant la navigation (iOS)
                setTimeout(() => navigate(dest), 50)
              }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
              <ExternalLink size={15} />
              {event.type === 'prelevement' ? 'Voir la mission' :
               event.type === 'maintenance' ? 'Voir la maintenance' :
               'Voir la métrologie'}
            </button>
          )}

          {/* Déplacer */}
          {isPrelev && !event.isDone && (
            <button onClick={() => setIsMoving(v => !v)}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{
                background: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-subtle)',
              }}>
              <ChevronRight size={15} style={{ transform: isMoving ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
              Déplacer à une autre date
            </button>
          )}

          {/* Retirer du calendrier */}
          {isPrelev && !event.isDone && (
            <button onClick={handleCancel} disabled={saving}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
              ↩ Retirer du calendrier
            </button>
          )}

          {/* Supprimer événement personnel */}
          {isEvt && (
            <button onClick={() => { onDelete(event); onClose() }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-left w-full"
              style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
              <Trash2 size={15} /> Supprimer
            </button>
          )}

        </div>
      </div>
    </div>
  )
}

// ── DragCreateModal ─────────────────────────────────────────

function DragCreateModal({
  dateDebut, dateFin, onClose, onSave,
}: {
  dateDebut: string; dateFin: string
  onClose: () => void
  onSave: (titre: string, type: TypeEvenement, dateDebut: string, dateFin: string, heure: string, notes: string) => Promise<void>
}) {
  const [titre,    setTitre]    = useState('')
  const [type,     setType]     = useState<TypeEvenement>('autre')
  const [debut,    setDebut]    = useState(dateDebut)
  const [fin,      setFin]      = useState(dateFin)
  const [heure,    setHeure]    = useState('')
  const [notes,    setNotes]    = useState('')
  const [saving,   setSaving]   = useState(false)

  const isMultiDay = debut !== fin

  const TYPES: { value: TypeEvenement; label: string; emoji: string }[] = [
    { value: 'rappel',  label: 'Rappel',   emoji: '🔔' },
    { value: 'reunion', label: 'Réunion',  emoji: '👥' },
    { value: 'rapport', label: 'Rapport',  emoji: '📋' },
    { value: 'autre',   label: 'Autre',    emoji: '📌' },
  ]

  async function handleSave() {
    if (!titre.trim()) return
    setSaving(true)
    try {
      await onSave(titre.trim(), type, debut, isMultiDay ? fin : '', heure, notes)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  function fmtDate(d: string) {
    const dt = new Date(d + 'T12:00:00')
    return `${dt.getDate()} ${MOIS_LONG[dt.getMonth()]}`
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}>
      <div className="w-full md:w-[400px] rounded-t-2xl md:rounded-2xl overflow-hidden"
        style={{
          background: 'var(--color-bg-secondary)',
          boxShadow: 'var(--shadow-modal)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Nouvel événement
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
              {isMultiDay ? `${fmtDate(debut)} → ${fmtDate(fin)}` : fmtDate(debut)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg"
            style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-tertiary)' }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ height: 1, background: 'var(--color-border-subtle)' }} />

        <div className="px-5 py-4 space-y-3">
          {/* Titre */}
          <input
            autoFocus
            placeholder="Titre de l'événement"
            value={titre}
            onChange={e => setTitre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={{
              background: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }} />

          {/* Type */}
          <div className="grid grid-cols-4 gap-1.5">
            {TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)}
                className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-[11px] font-medium"
                style={{
                  background: type === t.value ? 'var(--color-accent-light)' : 'var(--color-bg-tertiary)',
                  color: type === t.value ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  border: `1px solid ${type === t.value ? 'var(--color-accent)' : 'transparent'}`,
                }}>
                <span className="text-base">{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Dates (modifiables) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Début
              </label>
              <input type="date" value={debut} onChange={e => setDebut(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Fin
              </label>
              <input type="date" value={fin} min={debut} onChange={e => setFin(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
            </div>
          </div>

          {/* Heure (optionnel, seulement si jour unique) */}
          {!isMultiDay && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Heure (optionnel)
              </label>
              <input type="time" value={heure} onChange={e => setHeure(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Notes (optionnel)
            </label>
            <textarea rows={2} placeholder="Remarques…" value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
          </div>

          {/* Bouton sauvegarder */}
          <button onClick={handleSave} disabled={!titre.trim() || saving}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{
              background: titre.trim() ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
              color: titre.trim() ? 'white' : 'var(--color-text-tertiary)',
            }}>
            {saving ? 'Enregistrement…' : 'Créer l\'événement'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ─────────────────────────────────────

export default function PlanningPage() {
  useClientsListener(); useEquipementsListener()
  useVerificationsListener(); useMaintenancesListener()
  useEvenementsListener()

  const navigate   = useNavigate()
  const uid        = useAuthStore(s => s.uid())
  const initiales  = useAuthStore(s => s.initiales())
  const { clients }       = useMissionsStore()
  const { verifications } = useMetrologieStore()
  const { maintenances }  = useMaintenancesStore()
  const { evenements }    = useEvenementsStore()

  const today = new Date(); today.setHours(0,0,0,0)

  const [viewMode,    setViewMode]    = useState<ViewMode>('semaine')
  const [weekStart,   setWeekStart]   = useState(() => startOfWeek(today))
  const [monthStart,  setMonthStart]  = useState(() => startOfMonth(today))
  const [selectedDate,setSelectedDate]= useState(today)
  const [filterTech,  setFilterTech]  = useState('')
  const [filterRetard,setFilterRetard]= useState(false)
  const [selectedDay,         setSelectedDay]         = useState<string|null>(null)
  const [dayModalInitialTab,  setDayModalInitialTab]  = useState<'pool'|'jour'|'evt'>('pool')
  const [ctxMenu,             setCtxMenu]             = useState<{ dateStr: string; x: number; y: number } | null>(null)
  const [eventDetail, setEventDetail] = useState<{ event: PlanningEvent; dateStr: string } | null>(null)

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
        const baseSub = plan.nom || plan.siteNom || '—'
        plan.samplings.forEach((s:Sampling) => {
          // Exclure les samplings non planifiés (pool) — plannedDay = 0 ou absent
          if (!s.plannedDay && !s.doneDate) return
          const overdue = isSamplingOverdue(s)
          const dateStr = s.doneDate || toISO(new Date(year, s.plannedMonth, s.plannedDay))
          const cfg = overdue ? SAMPLING_CFG.overdue : SAMPLING_CFG[s.status] ?? SAMPLING_CFG.planned
          const common = {
            type: 'prelevement' as const,
            statusLabel:cfg.label, statusBg:cfg.bg, statusColor:cfg.color,
            link:`/missions/${client.id}/plan/${plan.id}/sampling/${s.id}`,
            isDone: s.status==='done', technicien: client.preleveur||'—',
            plannedTime: s.plannedTime, clientId:client.id, planId:plan.id, samplingId:s.id,
          }
          // Jour 1 (ou jour unique pour les méthodes ponctuelles / composite)
          add(dateStr, {
            ...common,
            id: s.id,
            title: client.nom,
            subtitle: isAuto ? `${baseSub} · Bilan 24h J1` : baseSub,
          })
          // Méthode Automatique = bilan 24h → occupe aussi le lendemain (J2)
          if (isAuto) {
            const dateStr2 = toISO(addDays(new Date(dateStr + 'T12:00:00'), 1))
            add(dateStr2, {
              ...common,
              id: `${s.id}_j2`,
              title: client.nom,
              subtitle: `${baseSub} · Bilan 24h J2`,
            })
          }
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
      const evObj: PlanningEvent = {
        id:ev.id, type:'evenement',
        title:ev.titre, subtitle:cfg.label,
        statusLabel:cfg.label, statusBg:cfg.bg, statusColor:cfg.color,
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

  const allTechs = useMemo(() => {
    const s = new Set<string>()
    Object.values(eventsByDate).flat().forEach(e => { if (e.technicien&&e.technicien!=='—') s.add(e.technicien) })
    return Array.from(s).sort()
  }, [eventsByDate])

  // Avec regroupement par client (vue mois, DayModal)
  function filteredForDay(dateStr:string): PlanningEvent[] {
    let evts = eventsByDate[dateStr]??[]
    if (filterTech) evts = evts.filter(e => e.technicien===filterTech)
    if (filterRetard) evts = evts.filter(e => e.statusColor==='var(--color-danger)'||e.statusLabel==='En retard')
    return groupByClient(evts)
  }
  // Sans regroupement (vue semaine et vue jour : chaque prélèvement visible)
  function filteredForDayFlat(dateStr:string): PlanningEvent[] {
    let evts = eventsByDate[dateStr]??[]
    if (filterTech) evts = evts.filter(e => e.technicien===filterTech)
    if (filterRetard) evts = evts.filter(e => e.statusColor==='var(--color-danger)'||e.statusLabel==='En retard')
    return sortEvts(evts)
  }

  const totalOverdue = useMemo(() => {
    let n=0
    clients.forEach((c:Client) => c.plans.forEach(p => p.samplings.forEach((s:Sampling) => { if (isSamplingOverdue(s)) n++ })))
    return n
  }, [clients])

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
              techInitiales: client.preleveur || '—',
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

  // ── Liste période (mobile) ──────────────────────────────

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

  // ── Gestion des samplings ───────────────────────────────

  // Retire un sampling du calendrier → remet plannedDay à 0, il revient dans le pool
  async function handleCancelSampling(event: PlanningEvent) {
    if (!uid || !event.clientId || !event.planId || !event.samplingId) return
    const client = clients.find((c: Client) => c.id === event.clientId)
    if (!client) return
    await saveClient({
      ...client,
      plans: client.plans.map(plan => plan.id !== event.planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) =>
          s.id !== event.samplingId ? s : { ...s, plannedDay: 0 }
        )
      })
    }, uid)
  }

  // Déplace un sampling vers une nouvelle date (change uniquement le plannedDay)
  async function handleMoveEvent(event: PlanningEvent, newDate: string) {
    if (!uid || !event.clientId || !event.planId || !event.samplingId) return
    const client = clients.find((c: Client) => c.id === event.clientId)
    if (!client) return
    const plannedDay = new Date(newDate + 'T12:00:00').getDate()
    await saveClient({
      ...client,
      plans: client.plans.map(plan => plan.id !== event.planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) =>
          s.id !== event.samplingId ? s : { ...s, plannedDay }
        )
      })
    }, uid)
  }

  // Supprime un événement personnel
  function handleDeleteEvent(event: PlanningEvent) {
    if (event.evenementData) deleteEvenement(event.evenementData.id)
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
    const client = clients.find((c: Client) => c.id === item.clientId)
    if (!client) return
    const plannedDay = new Date(date + 'T12:00:00').getDate()
    await saveClient({
      ...client,
      plans: client.plans.map(plan => plan.id !== item.planId ? plan : {
        ...plan,
        samplings: plan.samplings.map((s: Sampling) =>
          s.id !== item.sampling.id ? s : { ...s, plannedDay }
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

  function EventPill({ event, compact, onExpand, onSelect }: {
    event: PlanningEvent; compact?: boolean; onExpand?: () => void
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

    return (
      <button
        onClick={handleClick}
        className="w-full text-left px-1.5 py-[3px] rounded-[5px] leading-snug"
        style={{ background: event.statusBg, cursor: isGrouped ? 'zoom-in' : event.type === 'evenement' ? 'default' : 'pointer' }}
        title={isGrouped ? `${event.title} — ${event.count} prélèvements (cliquer pour détails)` : `${event.title} — ${event.subtitle} (${event.technicien})`}
      >
        {/* Ligne 1 : dot + client + badge ×N ou technicien */}
        <div className="flex items-center gap-1">
          <span className="shrink-0 w-[6px] h-[6px] rounded-full" style={{ background: event.statusColor }} />
          <span className="flex-1 truncate text-[11px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {event.title}
          </span>
          {hasTech && (
            <span className="shrink-0 text-[9px] font-semibold px-1 rounded"
              style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
              {event.technicien}
            </span>
          )}
          {isGrouped && (
            <span className="shrink-0 text-[9px] font-bold px-1 rounded"
              style={{ background: event.statusColor + '28', color: event.statusColor }}>
              ×{event.count}
            </span>
          )}
          {event.plannedTime && (
            <span className="shrink-0 text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>
              {event.plannedTime}
            </span>
          )}
        </div>
        {/* Ligne 2 : nom du point (masquée en vue mois) */}
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
    const dotColor = event.statusColor

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
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
            style={{ background:event.statusBg, color:event.statusColor }}>
            {event.statusLabel}
          </span>
          {event.isDone
            ? <CheckCircle2 size={18} className="shrink-0" style={{ color:'var(--color-success)' }} />
            : <ChevronRight size={15} className="shrink-0" style={{ color:'var(--color-text-tertiary)' }} />
          }
        </button>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* En-tête navigation */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 shrink-0 flex-wrap gap-2"
        style={{ borderBottom:'1px solid var(--color-border-subtle)', background:'var(--color-bg-secondary)' }}>

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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle vue */}
          <div className="flex rounded-lg overflow-hidden"
            style={{ border:'1px solid var(--color-border-subtle)', background:'var(--color-bg-tertiary)' }}>
            {(['jour','semaine','mois'] as ViewMode[]).map(m => (
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

          {/* Filtre technicien — badges colorés */}
          {allTechs.length>1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setFilterTech('')}
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background:!filterTech?'var(--color-accent)':'var(--color-bg-secondary)', color:!filterTech?'white':'var(--color-text-secondary)', border:`1px solid ${!filterTech?'transparent':'var(--color-border-subtle)'}` }}>
                Tous
              </button>
              {allTechs.map(t => {
                const isActive = filterTech === t
                return (
                  <button key={t} onClick={() => setFilterTech(t===filterTech?'':t)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: isActive ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                      color: isActive ? 'white' : 'var(--color-text-secondary)',
                      border: `1px solid ${isActive ? 'transparent' : 'var(--color-border-subtle)'}`,
                    }}>
                    {t}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Légende statuts ── */}
      <div className="hidden md:flex items-center gap-4 px-6 py-1.5 shrink-0"
        style={{ borderBottom:'1px solid var(--color-border-subtle)', background:'var(--color-bg-secondary)' }}>
        {[
          { color:'var(--color-text-tertiary)', label:'Planifié' },
          { color:'var(--color-danger)',        label:'En retard' },
          { color:'var(--color-success)',        label:'Réalisé' },
          { color:'var(--color-warning)',        label:'Non effectué' },
          { color:'var(--color-accent)',         label:'Métrologie' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-[11px]" style={{ color:'var(--color-text-tertiary)' }}>{label}</span>
          </div>
        ))}
      </div>

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
          if (filterTech)   evts = evts.filter(e => e.technicien === filterTech)
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
          <div className="flex-1 overflow-hidden flex flex-col">

            {/* Sous-titre : numéro de semaine + bouton Planifier */}
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
              <button
                onClick={() => setSelectedDay(dateStr)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--color-accent)', color: 'white' }}>
                <Plus size={12} /> Planifier
              </button>
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
                      onClick={() => setEventDetail({ event: evt, dateStr })}
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
                        onClick={() => setEventDetail({ event: evt, dateStr })}
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
                return (
                  <div key={i} className="py-2 px-2 text-center"
                    style={{ borderRight: i<4?'1px solid var(--color-border-subtle)':'none' }}>
                    <div className="text-[10px] font-medium uppercase mb-1"
                      style={{ color:'var(--color-text-tertiary)', letterSpacing:'0.04em' }}>
                      {JOURS_COURT[i]}
                    </div>
                    <div className="w-7 h-7 flex items-center justify-center rounded-full mx-auto text-sm font-semibold"
                      style={{
                        background: isToday ? '#FF3B30' : 'transparent',
                        color: isToday ? 'white' : 'var(--color-text-primary)',
                      }}>
                      {day.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Colonnes événements */}
            <div className="grid grid-cols-5 flex-1 overflow-y-auto">
              {weekDays.map((day,i) => {
                const dateStr = toISO(day)
                const evts = filteredForDayFlat(dateStr)
                const isToday = sameDay(day,today)
                return (
                  <div key={i}
                    className="p-1.5 flex flex-col gap-1 cursor-pointer group"
                    onClick={() => goToDay(dateStr)}
                    onContextMenu={e => { e.preventDefault(); setCtxMenu({ dateStr, x: e.clientX, y: e.clientY }) }}
                    style={{
                      borderRight: i<4?'1px solid var(--color-border-subtle)':'none',
                      background: isToday?'rgba(255,59,48,0.04)':'transparent',
                      minHeight: 120,
                    }}>
                    {evts.map(evt => <EventPill key={evt.id} event={evt} onExpand={() => goToDay(dateStr)} onSelect={e => setEventDetail({ event: e, dateStr })} />)}
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
                const MAX = 3
                return (
                  <div key={i}
                    className="p-1 flex flex-col gap-0.5 cursor-crosshair group"
                    onMouseDown={e => handleDragMouseDown(e, dateStr)}
                    onMouseEnter={() => handleDragMouseEnter(dateStr)}
                    onContextMenu={e => { e.preventDefault(); setCtxMenu({ dateStr, x: e.clientX, y: e.clientY }) }}
                    style={{
                      borderRight:(i%5)<4?'1px solid var(--color-border-subtle)':'none',
                      borderBottom:'1px solid var(--color-border-subtle)',
                      background: inDrag
                        ? 'rgba(0,113,227,0.1)'
                        : isToday ? 'rgba(255,59,48,0.04)' : 'transparent',
                      outline: inDrag ? '2px solid rgba(0,113,227,0.3)' : 'none',
                      outlineOffset: '-1px',
                      minHeight: 90,
                      userSelect: 'none',
                    }}>
                    <div className="flex items-center justify-between mb-0.5 px-0.5">
                      <span className="flex items-center gap-1">
                        <span className="w-[22px] h-[22px] flex items-center justify-center rounded-full text-[11px] font-semibold"
                          style={{
                            background: isToday ? '#FF3B30' : 'transparent',
                            color: isToday ? 'white' : 'var(--color-text-secondary)',
                          }}>
                          {day.getDate()}
                        </span>
                        {day.getDate()===1 && (
                          <span className="text-[10px] font-normal" style={{ color:'var(--color-text-tertiary)' }}>
                            {MOIS_LONG[day.getMonth()].slice(0,3).toLowerCase()}.
                          </span>
                        )}
                      </span>
                      <Plus size={10} className="opacity-25 group-hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--color-text-tertiary)' }} />
                    </div>
                    {evts.slice(0,MAX).map(evt => <EventPill key={evt.id} event={evt} compact onExpand={() => goToDay(dateStr)} onSelect={e => setEventDetail({ event: e, dateStr })} />)}
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
                    {events.map((evt,i) => <EventRow key={evt.id} event={evt} isLast={i===events.length-1} onSelect={e => setEventDetail({ event: e, dateStr })} />)}
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
          dayEvents={filteredForDay(selectedDay)}
          pool={poolSamplings}
          uid={uid}
          initiales={initiales}
          onValidatePool={handleValidatePool}
          onEventSelect={event => setEventDetail({ event, dateStr: selectedDay! })}
          initialTab={dayModalInitialTab}
        />
      )}

      {/* ── CellContextMenu ── */}
      {ctxMenu && (
        <CellContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
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
