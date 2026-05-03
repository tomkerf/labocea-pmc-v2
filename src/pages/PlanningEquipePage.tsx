// ============================================================
// PlanningEquipePage — Vue calendrier partagée de l'équipe
// Grille semaine : lignes = techniciens, colonnes = Lun-Dim
// ============================================================

import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Users, ExternalLink, X } from 'lucide-react'
import { useClientsListener } from '@/hooks/useClients'
import { usePreleveursListener } from '@/hooks/usePreleveurs'
import { useMissionsStore } from '@/stores/missionsStore'
import { usePreleveursStore } from '@/stores/preleveursStore'
import { isSamplingOverdue } from '@/lib/overdue'
import type { Sampling, SamplingStatus } from '@/types'

// ── Constantes ────────────────────────────────────────────────

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS_LONG = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

// Palette couleurs par technicien (index → couleur)
const TECH_COLORS = [
  { bg: '#E8F1FB', text: '#0071E3', border: '#B8D4F5' }, // bleu
  { bg: '#EAF8EE', text: '#1A7A3C', border: '#B3E8C3' }, // vert
  { bg: '#FFF4E3', text: '#C06000', border: '#F5D49A' }, // orange
  { bg: '#F5EEFB', text: '#7030A0', border: '#D9B8F0' }, // violet
  { bg: '#E8F8FA', text: '#006070', border: '#A8DFE8' }, // teal
  { bg: '#FFEEED', text: '#C0392B', border: '#F5C0BC' }, // rouge
  { bg: '#F5F5E8', text: '#5A5A00', border: '#D8D8A0' }, // olive
  { bg: '#F0EEF8', text: '#3D2E8A', border: '#C8C0E8' }, // indigo
]

// ── Types ─────────────────────────────────────────────────────

interface TeamEvent {
  samplingId: string
  clientId: string
  planId: string
  clientNom: string
  siteNom: string
  planNom: string
  methode: string
  status: SamplingStatus
  statusLabel: string
  meteo: string
  doneDate: string
  comment: string
}

interface TechRow {
  code: string      // initiales
  nom: string       // nom complet
  colorIdx: number
}

// ── Helpers ───────────────────────────────────────────────────

function startOfWeekMon(d: Date): Date {
  const r = new Date(d); r.setHours(0,0,0,0)
  const day = r.getDay()
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day))
  return r
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function isToday(iso: string): boolean {
  return iso === isoDate(new Date())
}

function resolveStatus(s: Sampling, clientYear: string): SamplingStatus {
  if (s.status === 'planned' && isSamplingOverdue(s, parseInt(clientYear, 10))) return 'overdue'
  return s.status
}

const STATUS_LABEL: Record<SamplingStatus, string> = {
  planned: 'Planifié', done: 'Réalisé', overdue: 'En retard', non_effectue: 'Non effectué',
}

// ── Composant DayDetailModal ──────────────────────────────────

function DayDetailModal({ events, techCode, techNom, dateLabel, colorIdx, onClose }: {
  events: TeamEvent[]
  techCode: string
  techNom: string
  dateLabel: string
  colorIdx: number
  onClose: () => void
}) {
  const navigate = useNavigate()
  const color = TECH_COLORS[colorIdx % TECH_COLORS.length]

  const STATUS_BG: Record<SamplingStatus, string> = {
    done:         'var(--color-success-light)',
    planned:      'var(--color-accent-light)',
    overdue:      'var(--color-danger-light)',
    non_effectue: 'var(--color-bg-tertiary)',
  }
  const STATUS_COLOR: Record<SamplingStatus, string> = {
    done:         'var(--color-success)',
    planned:      'var(--color-accent)',
    overdue:      'var(--color-danger)',
    non_effectue: 'var(--color-text-tertiary)',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: 'var(--color-bg-secondary)', boxShadow: 'var(--shadow-modal)', maxHeight: '80vh' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
            {techCode.slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {techNom || techCode}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{dateLabel}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg shrink-0"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>
        {/* Liste */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 60px)' }}>
          {events.map((ev, i) => (
            <div key={ev.samplingId}
              className="px-4 py-3 flex items-start gap-3 cursor-pointer"
              style={{ borderBottom: i < events.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
              onClick={() => {
                navigate(`/missions/${ev.clientId}/plan/${ev.planId}`)
                onClose()
              }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {ev.clientNom}
                  </span>
                  {ev.meteo === 'pluie' && <span className="text-xs">🌧</span>}
                </div>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  {ev.siteNom} · {ev.methode}
                </p>
                {ev.comment && (
                  <p className="text-xs mt-1 italic truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                    {ev.comment}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: STATUS_BG[ev.status], color: STATUS_COLOR[ev.status] }}>
                  {STATUS_LABEL[ev.status]}
                </span>
                <ExternalLink size={12} style={{ color: 'var(--color-text-tertiary)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────

export default function PlanningEquipePage() {
  const navigate = useNavigate()

  // Données
  useClientsListener()
  usePreleveursListener()
  const clients    = useMissionsStore(s => s.clients)
  const preleveurs = usePreleveursStore(s => s.preleveurs)

  // Navigation semaine
  const [refDate, setRefDate] = useState(() => startOfWeekMon(new Date()))
  const weekDates = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(refDate, i)), [refDate])
  const weekISOs = useMemo(() => weekDates.map(isoDate), [weekDates])

  // Modal
  const [modal, setModal] = useState<{
    events: TeamEvent[]; techCode: string; techNom: string
    dateLabel: string; colorIdx: number
  } | null>(null)

  // Label semaine
  const weekLabel = useMemo(() => {
    const d1 = weekDates[0], d7 = weekDates[6]
    const sameMonth = d1.getMonth() === d7.getMonth()
    if (sameMonth)
      return `${d1.getDate()} – ${d7.getDate()} ${MOIS_LONG[d1.getMonth()]} ${d1.getFullYear()}`
    return `${d1.getDate()} ${MOIS_LONG[d1.getMonth()].slice(0,3)} – ${d7.getDate()} ${MOIS_LONG[d7.getMonth()].slice(0,3)} ${d7.getFullYear()}`
  }, [weekDates])

  // Construction de la liste des techniciens à partir des preleveurs
  const techRows: TechRow[] = useMemo(() => {
    const sorted = [...preleveurs].sort((a, b) => a.code.localeCompare(b.code))
    return sorted.map((p, i) => ({ code: p.code, nom: p.nom, colorIdx: i }))
  }, [preleveurs])


  // Construction de la map d'événements : { techCode → { dateISO → TeamEvent[] } }
  const eventMap = useMemo(() => {
    const map = new Map<string, Map<string, TeamEvent[]>>()

    for (const client of clients) {
      const year = client.annee || String(new Date().getFullYear())
      for (const plan of (client.plans ?? []).filter(p => !p.separator)) {
        for (const s of plan.samplings) {
          // Ignorer les prélèvements pool (plannedDay=0)
          if (!s.plannedDay || s.plannedDay <= 0) continue

          const techCode = (s.assignedTo || client.preleveur || '').toUpperCase()
          if (!techCode) continue

          // Date prévue
          const dateISO = `${year}-${String(s.plannedMonth + 1).padStart(2,'0')}-${String(s.plannedDay).padStart(2,'0')}`

          // Filtrer sur la semaine visible pour perf
          if (!weekISOs.includes(dateISO)) continue

          const status = resolveStatus(s, year)

          const ev: TeamEvent = {
            samplingId: s.id,
            clientId: client.id,
            planId: plan.id,
            clientNom: client.nom,
            siteNom: plan.siteNom,
            planNom: plan.nom,
            methode: plan.methode,
            status,
            statusLabel: STATUS_LABEL[status],
            meteo: plan.meteo,
            doneDate: s.doneDate,
            comment: s.comment,
          }

          if (!map.has(techCode)) map.set(techCode, new Map())
          const techMap = map.get(techCode)!
          if (!techMap.has(dateISO)) techMap.set(dateISO, [])
          techMap.get(dateISO)!.push(ev)
        }
      }
    }
    return map
  }, [clients, weekISOs])

  // Techs actifs cette semaine (union des techs dans eventMap + techRows)
  const activeTechs = useMemo(() => {
    const inEvents = new Set(eventMap.keys())
    // Afficher tous les techs connus + ceux qui ont des événements
    const all = new Set([...techRows.map(t => t.code), ...inEvents])
    return [...all].map((code, idx) => {
      const found = techRows.find(t => t.code === code)
      return found ?? { code, nom: code, colorIdx: idx }
    }).sort((a, b) => a.code.localeCompare(b.code))
  }, [techRows, eventMap])

  const openModal = useCallback((
    events: TeamEvent[], techCode: string, techNom: string,
    dateISO: string, colorIdx: number
  ) => {
    const d = new Date(dateISO + 'T12:00:00')
    const dateLabel = `${JOURS[d.getDay() === 0 ? 6 : d.getDay() - 1]} ${d.getDate()} ${MOIS_LONG[d.getMonth()]}`
    setModal({ events, techCode, techNom, dateLabel, colorIdx })
  }, [])

  const prevWeek = () => setRefDate(d => addDays(d, -7))
  const nextWeek = () => setRefDate(d => addDays(d, 7))
  const goToday  = () => setRefDate(startOfWeekMon(new Date()))

  // ── Render ─────────────────────────────────────────────────

  const totalSemaine = useMemo(() => {
    let n = 0
    eventMap.forEach(techMap => techMap.forEach(evs => { n += evs.length }))
    return n
  }, [eventMap])

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>

      {/* Header */}
      <div className="sticky top-0 z-20 px-4 py-3"
        style={{
          background: 'rgba(245,245,247,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/planning')}
            className="p-1.5 rounded-lg shrink-0"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
            <ChevronLeft size={18} strokeWidth={1.8} />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Users size={16} strokeWidth={1.8} className="shrink-0" style={{ color: 'var(--color-accent)' }} />
            <h1 className="text-base font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
              Planning équipe
            </h1>
            {totalSemaine > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                {totalSemaine}
              </span>
            )}
          </div>
        </div>

        {/* Navigation semaine */}
        <div className="flex items-center gap-2 mt-2.5">
          <button onClick={prevWeek}
            className="p-1.5 rounded-lg shrink-0"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
            <ChevronLeft size={15} strokeWidth={2} />
          </button>
          <button onClick={goToday}
            className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
            {weekLabel}
          </button>
          <button onClick={nextWeek}
            className="p-1.5 rounded-lg shrink-0"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
            <ChevronRight size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Grille */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          {/* En-tête jours */}
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              {/* Colonne technicien */}
              <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wide w-20 shrink-0"
                style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-secondary)', position: 'sticky', left: 0, zIndex: 1, borderRight: '1px solid var(--color-border-subtle)' }}>
                Tech
              </th>
              {weekDates.map((d, i) => {
                const iso = weekISOs[i]
                const today = isToday(iso)
                return (
                  <th key={iso}
                    className="text-center px-2 py-2.5 text-xs font-semibold"
                    style={{
                      color: today ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      background: today ? 'var(--color-accent-light)' : 'var(--color-bg-secondary)',
                      minWidth: 100,
                    }}>
                    <span className="block">{JOURS[i]}</span>
                    <span className="block text-sm font-bold mt-0.5">{d.getDate()}</span>
                  </th>
                )
              })}
            </tr>
          </thead>

          {/* Lignes par technicien */}
          <tbody>
            {activeTechs.map((tech, rowIdx) => {
              const color = TECH_COLORS[tech.colorIdx % TECH_COLORS.length]
              const techEvMap = eventMap.get(tech.code)
              const hasAnything = techEvMap && [...techEvMap.values()].some(v => v.length > 0)

              return (
                <tr key={tech.code}
                  style={{ borderBottom: '1px solid var(--color-border-subtle)', background: rowIdx % 2 === 0 ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)' }}>

                  {/* Colonne tech — sticky */}
                  <td className="px-3 py-2 align-top"
                    style={{ background: rowIdx % 2 === 0 ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)', position: 'sticky', left: 0, zIndex: 1, borderRight: '1px solid var(--color-border-subtle)', minWidth: 72 }}>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
                        {tech.code.slice(0, 3)}
                      </div>
                      {!hasAnything && (
                        <span className="text-[9px] text-center leading-tight"
                          style={{ color: 'var(--color-text-tertiary)' }}>
                          —
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Colonnes jours */}
                  {weekISOs.map((iso) => {
                    const dayEvs = techEvMap?.get(iso) ?? []
                    const today = isToday(iso)
                    const MAX_SHOW = 3

                    return (
                      <td key={iso}
                        className="px-1.5 py-1.5 align-top"
                        style={{
                          background: today ? 'rgba(0,113,227,0.03)' : undefined,
                          minWidth: 100,
                          verticalAlign: 'top',
                        }}>
                        {dayEvs.length === 0 ? null : (
                          <div className="flex flex-col gap-1">
                            {dayEvs.slice(0, MAX_SHOW).map(ev => (
                              <button key={ev.samplingId}
                                onClick={() => openModal(dayEvs, tech.code, tech.nom, iso, tech.colorIdx)}
                                className="w-full text-left px-2 py-1 rounded-lg text-[11px] font-medium leading-tight truncate"
                                style={{
                                  background: ev.status === 'done' ? 'var(--color-success-light)'
                                    : ev.status === 'overdue' ? 'var(--color-danger-light)'
                                    : color.bg,
                                  color: ev.status === 'done' ? 'var(--color-success)'
                                    : ev.status === 'overdue' ? 'var(--color-danger)'
                                    : color.text,
                                  border: `1px solid ${ev.status === 'done' ? 'var(--color-success-light)'
                                    : ev.status === 'overdue' ? 'var(--color-danger-light)'
                                    : color.border}`,
                                }}>
                                {ev.meteo === 'pluie' && '🌧 '}
                                {ev.clientNom}
                              </button>
                            ))}
                            {dayEvs.length > MAX_SHOW && (
                              <button
                                onClick={() => openModal(dayEvs, tech.code, tech.nom, iso, tech.colorIdx)}
                                className="w-full text-center text-[10px] font-semibold py-0.5 rounded-md"
                                style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                                +{dayEvs.length - MAX_SHOW} autres
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}

            {activeTechs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm"
                  style={{ color: 'var(--color-text-tertiary)' }}>
                  Aucun technicien configuré — ajoutez des préleveurs dans les réglages.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Légende */}
      {activeTechs.length > 0 && (
        <div className="px-4 py-4 flex flex-wrap gap-2 mt-2">
          {activeTechs.map(tech => {
            const color = TECH_COLORS[tech.colorIdx % TECH_COLORS.length]
            const techEvMap = eventMap.get(tech.code)
            const count = techEvMap ? [...techEvMap.values()].reduce((s, v) => s + v.length, 0) : 0
            return (
              <div key={tech.code} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
                <span className="font-bold">{tech.code}</span>
                {tech.nom && tech.nom !== tech.code && (
                  <span className="font-normal opacity-75">{tech.nom.split(' ')[0]}</span>
                )}
                {count > 0 && (
                  <span className="font-bold">{count}</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Légende statuts */}
      <div className="px-4 pb-6 flex flex-wrap gap-2">
        {[
          { label: 'Réalisé',      bg: 'var(--color-success-light)',  color: 'var(--color-success)'  },
          { label: 'Planifié',     bg: 'var(--color-accent-light)',   color: 'var(--color-accent)'   },
          { label: 'En retard',    bg: 'var(--color-danger-light)',   color: 'var(--color-danger)'   },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-1 text-[11px]"
            style={{ color: 'var(--color-text-secondary)' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />
            {s.label}
          </div>
        ))}
      </div>

      {/* Modal détail jour */}
      {modal && (
        <DayDetailModal
          events={modal.events}
          techCode={modal.techCode}
          techNom={modal.techNom}
          dateLabel={modal.dateLabel}
          colorIdx={modal.colorIdx}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
