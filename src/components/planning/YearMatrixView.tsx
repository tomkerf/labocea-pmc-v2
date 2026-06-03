import { useMemo, useState } from 'react'
import type { Client, Plan, Sampling } from '@/types'
import { MOIS_LONG } from '@/lib/planningUtils'
import { isSamplingOverdue } from '@/lib/overdue'
import { Link } from 'react-router-dom'
import { ChevronRight, ChevronDown } from 'lucide-react'
import IssueListModal from './IssueListModal'

interface YearMatrixViewProps {
  clients: Client[]
  year: number
  filterTech: string
  filterSite: string
  preleveurs: any[]
}

type RowData = {
  client: Client
  plan: Plan
  samplingsByMonth: (Sampling | null)[]
  pairsByMonth: (Sampling | null)[][]
}

type GroupData = {
  client: Client
  plans: RowData[]
}

export default function YearMatrixView({ clients, year, filterTech, filterSite, preleveurs }: YearMatrixViewProps) {
  const [issueModalType, setIssueModalType] = useState<'overdue' | 'non_effectue' | null>(null)
  const [compact, setCompact] = useState(false)

  const rows = useMemo(() => {
    const list: RowData[] = []

    clients.forEach(c => {
      if (c.annee && c.annee !== year.toString()) return

      c.plans.forEach(p => {
        if (p.separator) return

        const assigned = c.preleveur || ''
        const prel = preleveurs.find(pr => pr.code === assigned)
        if (filterSite && prel?.site !== filterSite) return
        if (filterTech && assigned !== filterTech) return

        const samplingsByMonth: (Sampling | null)[] = Array(12).fill(null)
        const pairsByMonth: (Sampling | null)[][] = Array.from({ length: 12 }, () => [])

        p.samplings.forEach(s => {
          if (s.plannedMonth >= 0 && s.plannedMonth < 12) {
            samplingsByMonth[s.plannedMonth] = s
            if (p.frequence === 'Bimensuel') {
              pairsByMonth[s.plannedMonth].push(s)
            }
          }
        })

        if (p.frequence === 'Bimensuel') {
          for (let m = 0; m < 12; m++) {
            const pair = pairsByMonth[m]
            if (pair.length > 0 && pair.every(s => s?.status === 'non_effectue')) {
              pairsByMonth[m] = []
              samplingsByMonth[m] = null
            }
          }
        }

        list.push({ client: c, plan: p, samplingsByMonth, pairsByMonth })
      })
    })

    return list.sort((a, b) => {
      const c = a.client.nom.localeCompare(b.client.nom)
      if (c !== 0) return c
      return a.plan.siteNom.localeCompare(b.plan.siteNom)
    })
  }, [clients, year, filterTech, filterSite, preleveurs])

  const groupedRows = useMemo(() => {
    const map = new Map<string, GroupData>()
    rows.forEach(row => {
      if (!map.has(row.client.id)) map.set(row.client.id, { client: row.client, plans: [] })
      map.get(row.client.id)!.plans.push(row)
    })
    return Array.from(map.values())
  }, [rows])

  // Tous repliés par défaut
  const [collapsedClients, setCollapsedClients] = useState<Set<string>>(
    () => new Set(groupedRows.map(g => g.client.id))
  )

  const toggleClient = (id: string) => {
    setCollapsedClients(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const getStatusColor = (s: Sampling | null, planYear: number) => {
    if (!s) return 'transparent'
    if (s.status === 'done') return 'var(--color-success)'
    if (s.status === 'non_effectue') return 'var(--color-neutral)'
    if (isSamplingOverdue(s, planYear)) return 'var(--color-danger)'
    if (s.status === 'planned') return 'var(--color-warning)'
    return 'var(--color-border)'
  }

  const getStatusLabel = (s: Sampling | null, planYear: number) => {
    if (!s) return ''
    if (s.status === 'done') return 'Fait'
    if (s.status === 'non_effectue') return 'Non fait'
    if (isSamplingOverdue(s, planYear)) return 'En retard'
    if (s.status === 'planned') return 'Planifié'
    return ''
  }

  const getStatusIcon = (s: Sampling, planYear: number) => {
    if (s.status === 'done') return '✓'
    if (s.status === 'non_effectue') return '✕'
    if (isSamplingOverdue(s, planYear)) return '!'
    return ''
  }

  const counts = useMemo(() => {
    const c = { done: 0, planned: 0, overdue: 0, non_effectue: 0 }
    rows.forEach(({ client, plan }) => {
      const planYear = parseInt(client.annee ?? String(year))
      plan.samplings.forEach(s => {
        if (s.status === 'done') { c.done++; return }
        if (s.status === 'non_effectue') { c.non_effectue++; return }
        if (isSamplingOverdue(s, planYear)) { c.overdue++; return }
        if (s.status === 'planned') c.planned++
      })
    })
    return c
  }, [rows, year])

  const getGroupSummary = (plans: RowData[]) => {
    const c = { done: 0, overdue: 0, non_effectue: 0, planned: 0 }
    plans.forEach(({ client, plan }) => {
      const planYear = parseInt(client.annee ?? String(year))
      plan.samplings.forEach(s => {
        if (s.status === 'done') { c.done++; return }
        if (s.status === 'non_effectue') { c.non_effectue++; return }
        if (isSamplingOverdue(s, planYear)) { c.overdue++; return }
        if (s.status === 'planned') c.planned++
      })
    })
    return c
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-bg-primary)] p-4 md:p-6">
      <div className="flex flex-col flex-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden min-h-0">

        {/* Légende */}
        <div className="shrink-0 px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center gap-4 text-xs font-medium bg-[var(--color-bg-secondary)] z-20">
          <div className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[var(--color-success)]" /> Fait <span className="text-[var(--color-text-secondary)]">({counts.done})</span></div>
          <div className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[var(--color-warning)]" /> Planifié <span className="text-[var(--color-text-secondary)]">({counts.planned})</span></div>

          <button
            type="button"
            onClick={() => setIssueModalType('overdue')}
            className="flex items-center gap-1.5 cursor-pointer hover:bg-[var(--color-danger-light)] px-2 py-0.5 -mx-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)]"
          >
            <span className="size-2.5 rounded-full bg-[var(--color-danger)]" />
            En retard <span className="text-[var(--color-text-secondary)]">({counts.overdue})</span>
            <span className="text-[var(--color-danger)] opacity-60">↗</span>
          </button>

          <button
            type="button"
            onClick={() => setIssueModalType('non_effectue')}
            className="flex items-center gap-1.5 cursor-pointer hover:bg-[var(--color-bg-tertiary)] px-2 py-0.5 -mx-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-border)]"
          >
            <span className="size-2.5 rounded-full bg-[var(--color-neutral)]" />
            Non effectué <span className="text-[var(--color-text-secondary)]">({counts.non_effectue})</span>
            <span className="text-[var(--color-neutral)] opacity-60">↗</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const allIds = groupedRows.map(g => g.client.id)
              const allCollapsed = allIds.every(id => collapsedClients.has(id))
              setCollapsedClients(allCollapsed ? new Set() : new Set(allIds))
            }}
            className="ml-auto flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            {groupedRows.every(g => collapsedClients.has(g.client.id))
              ? <><ChevronDown size={12} /> Tout déplier</>
              : <><ChevronRight size={12} /> Tout replier</>
            }
          </button>

          <button
            type="button"
            onClick={() => setCompact(c => !c)}
            className="flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors border border-[var(--color-border)] rounded px-2 py-0.5"
          >
            {compact ? 'Vue normale' : 'Vue compacte'}
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto w-full relative">
          <table className="w-full text-left border-collapse" style={{ minWidth: 1000 }}>
            <thead className="sticky top-0 z-30">
              <tr className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] text-[11px] uppercase tracking-wider border-b border-[var(--color-border-subtle)]">
                <th className="px-4 py-3 font-semibold sticky left-0 z-40 bg-[var(--color-bg-tertiary)] border-r border-[var(--color-border-subtle)] shadow-[1px_0_0_var(--color-border-subtle)]">Client & Mission</th>
                <th className="px-4 py-3 font-semibold border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)]">Point de prélèvement</th>
                {MOIS_LONG.map(m => (
                  <th key={m} className="px-2 py-3 font-semibold text-center border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)] w-14">
                    {m.substring(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-[var(--color-text-secondary)] text-sm">
                    Aucun plan de prélèvement trouvé pour l'année {year} avec ces filtres.
                  </td>
                </tr>
              ) : (
                groupedRows.map(({ client, plans }) => {
                  const isCollapsed = collapsedClients.has(client.id)
                  const summary = getGroupSummary(plans)
                  const planYear = parseInt(client.annee ?? String(year))

                  return [
                    // Ligne header client
                    <tr
                      key={`header-${client.id}`}
                      className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)] hover:bg-[#e8e8ec] transition-colors cursor-pointer"
                      onClick={() => toggleClient(client.id)}
                    >
                      <td className="px-3 py-2 sticky left-0 z-20 bg-[var(--color-bg-tertiary)] border-r border-[var(--color-border-subtle)] shadow-[1px_0_0_var(--color-border-subtle)]" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                        <div className="flex items-center gap-2">
                          {isCollapsed
                            ? <ChevronRight size={14} className="text-[var(--color-text-secondary)] shrink-0" />
                            : <ChevronDown size={14} className="text-[var(--color-text-secondary)] shrink-0" />
                          }
                          <div>
                            <Link
                              to={`/missions/${client.id}`}
                              className="text-sm font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent)] hover:underline"
                              onClick={e => e.stopPropagation()}
                            >
                              {client.nom}
                            </Link>
                            <div className="text-xs text-[var(--color-text-secondary)]">{client.segment}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-[var(--color-border-subtle)]">
                        <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                          <span>{plans.length} plan{plans.length > 1 ? 's' : ''}</span>
                          <span className="flex items-center gap-1.5">
                            {summary.done > 0 && <span className="text-[var(--color-success)] font-medium">✓ {summary.done}</span>}
                            {summary.planned > 0 && <span className="text-[var(--color-warning)] font-medium">● {summary.planned}</span>}
                            {summary.overdue > 0 && <span className="text-[var(--color-danger)] font-medium">! {summary.overdue}</span>}
                            {summary.non_effectue > 0 && <span className="text-[var(--color-neutral)] font-medium">✕ {summary.non_effectue}</span>}
                          </span>
                        </div>
                      </td>
                      {Array(12).fill(null).map((_, i) => (
                        <td key={i} className="border-r border-[var(--color-border-subtle)]" />
                      ))}
                    </tr>,

                    // Lignes de plans (conditionnelles)
                    ...(!isCollapsed ? plans.map((row) => (
                      <tr key={`${row.client.id}-${row.plan.id}`}
                        className={`border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-tertiary)] transition-colors group ${compact ? 'h-7' : ''}`}>
                        <td className={`${compact ? 'px-4 py-0.5' : 'px-4 py-2'} text-sm sticky left-0 z-20 bg-[var(--color-bg-secondary)] group-hover:bg-[var(--color-bg-tertiary)] border-r border-[var(--color-border-subtle)] transition-colors shadow-[1px_0_0_var(--color-border-subtle)] pl-9`}>
                          <div className={`font-medium text-[var(--color-text-primary)] ${compact ? 'text-xs' : 'text-sm'}`}>{row.plan.nom}</div>
                        </td>
                        <td className={`${compact ? 'px-4 py-0.5' : 'px-4 py-2'} text-sm text-[var(--color-text-primary)] border-r border-[var(--color-border-subtle)]`}>
                          <div className={`${compact ? 'text-[10px]' : 'text-xs'} text-[var(--color-text-secondary)] flex items-center gap-1.5`}>
                            <span>{row.plan.siteNom} • {row.plan.frequence}</span>
                            {row.plan.frequence === 'Personnalisé' && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] border border-[var(--color-border)]">
                                manuel
                              </span>
                            )}
                          </div>
                        </td>

                        {row.samplingsByMonth.map((s, mIdx) => {
                          const isBimensuel = row.plan.frequence === 'Bimensuel'
                          const pair = row.pairsByMonth[mIdx]
                          const dotSize = compact ? 'size-3.5' : 'size-5'
                          const iconSize = compact ? 'text-[7px]' : 'text-[9px]'
                          return (
                            <td key={mIdx} className={`px-1 ${compact ? 'py-0.5' : 'py-2'} text-center border-r border-[var(--color-border-subtle)] relative`}>
                              {isBimensuel ? (
                                pair.length > 0 && (
                                  <div className="flex items-center justify-center" style={{ width: compact ? 24 : 32 }}>
                                    {(() => {
                                      const priority = (s: Sampling) => isSamplingOverdue(s, planYear) ? 3 : s.status === 'planned' ? 2 : s.status === 'done' ? 1 : 0
                                      const sorted = [...pair].filter(Boolean).sort((a, b) => priority(b!) - priority(a!))
                                      return sorted.slice(0, 2).map((ps, pi) => ps && (
                                        <div
                                          key={pi}
                                          onClick={() => { if (isSamplingOverdue(ps, planYear)) setIssueModalType('overdue'); else if (ps.status === 'non_effectue') setIssueModalType('non_effectue') }}
                                          className={`${dotSize} rounded-full flex items-center justify-center transition-transform hover:scale-110 border-2 border-[var(--color-bg-secondary)] ${isSamplingOverdue(ps, planYear) || ps.status === 'non_effectue' ? 'cursor-pointer ring-1 ring-offset-1 ring-white/50 hover:ring-2 hover:ring-white/70' : 'cursor-help'}`}
                                          style={{ backgroundColor: getStatusColor(ps, planYear), marginLeft: pi === 1 ? (compact ? -5 : -7) : 0, zIndex: pi === 0 ? 2 : 1 }}
                                          title={`${MOIS_LONG[mIdx]} #${pi + 1} - ${getStatusLabel(ps, planYear)}${ps.doneDate ? ` le ${ps.doneDate}` : ''}${isSamplingOverdue(ps, planYear) || ps.status === 'non_effectue' ? ' — cliquer pour voir la liste' : ''}`}
                                        >
                                          <span className={`${iconSize} font-bold text-white leading-none`}>
                                            {getStatusIcon(ps, planYear)}
                                          </span>
                                        </div>
                                      ))
                                    })()}
                                  </div>
                                )
                              ) : (
                                s && (
                                  <div
                                    onClick={() => { if (isSamplingOverdue(s, planYear)) setIssueModalType('overdue'); else if (s.status === 'non_effectue') setIssueModalType('non_effectue') }}
                                    className={`mx-auto ${dotSize} rounded-full flex items-center justify-center transition-transform hover:scale-110 ${isSamplingOverdue(s, planYear) || s.status === 'non_effectue' ? 'cursor-pointer ring-1 ring-offset-1 ring-white/50 hover:ring-2 hover:ring-white/70' : 'cursor-help'}`}
                                    style={{ backgroundColor: getStatusColor(s, planYear) }}
                                    title={`${MOIS_LONG[mIdx]} - ${getStatusLabel(s, planYear)}${s.doneDate ? ` le ${s.doneDate}` : ''}${isSamplingOverdue(s, planYear) || s.status === 'non_effectue' ? ' — cliquer pour voir la liste' : ''}`}
                                  >
                                    <span className={`${iconSize} font-bold text-white leading-none`}>
                                      {getStatusIcon(s, planYear)}
                                    </span>
                                  </div>
                                )
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )) : [])
                  ]
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {issueModalType && (
        <IssueListModal
          type={issueModalType}
          rows={rows}
          year={year}
          onClose={() => setIssueModalType(null)}
        />
      )}
    </div>
  )
}
