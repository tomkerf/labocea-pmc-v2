import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ChevronDown, Search } from 'lucide-react'
import type { Client, Sampling } from '@/types'
import type { Preleveur } from '@/stores/preleveursStore'
import { MOIS_LONG } from '@/lib/planningUtils'
import { isSamplingOverdue } from '@/lib/overdue'
import { type RowData, type GroupData } from '@/lib/yearMatrixUtils'
import IssueListModal from './IssueListModal'
import YearMatrixPlanRow from './YearMatrixPlanRow'

interface YearMatrixViewProps {
  clients: Client[]
  year: number
  filterTech: string
  filterSite: string
  filterMethod?: string
  preleveurs: Preleveur[]
}

export default function YearMatrixView({ clients, year, filterTech, filterSite, filterMethod = '', preleveurs }: YearMatrixViewProps) {
  const [issueModalType, setIssueModalType] = useState<'overdue' | 'non_effectue' | null>(null)
  const [monthModal, setMonthModal] = useState<number | null>(null)
  const [focusedMonth, setFocusedMonth] = useState<number | null>(null)

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
        if (filterMethod && p.methode !== filterMethod) return

        const samplingsByMonth: (Sampling | null)[] = Array(12).fill(null)
        const pairsByMonth: (Sampling | null)[][] = Array.from({ length: 12 }, () => [])

        p.samplings.forEach(s => {
          if (!s) return
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
      const c = (a.client.nom || '').localeCompare(b.client.nom || '')
      if (c !== 0) return c
      return (a.plan.siteNom || '').localeCompare(b.plan.siteNom || '')
    })
  }, [clients, year, filterTech, filterSite, filterMethod, preleveurs])

  const groupedRows = useMemo(() => {
    const map = new Map<string, GroupData>()
    rows.forEach(row => {
      if (!map.has(row.client.id)) map.set(row.client.id, { client: row.client, plans: [] })
      map.get(row.client.id)!.plans.push(row)
    })
    return Array.from(map.values())
  }, [rows])

  const [collapsedClients, setCollapsedClients] = useState<Set<string>>(
    () => new Set(groupedRows.map(g => g.client.id))
  )

  const toggleClient = (id: string) => {
    setCollapsedClients(prev => {
      const s = new Set(prev)
      if (s.has(id)) { s.delete(id) } else { s.add(id) }
      return s
    })
  }

  const counts = useMemo(() => {
    const c = { done: 0, planned: 0, overdue: 0, non_effectue: 0 }
    rows.forEach(({ client, plan }) => {
      const planYear = parseInt(client.annee ?? String(year))
      plan.samplings.forEach(s => {
        if (!s) return
        if (s.status === 'done') { c.done++; return }
        if (s.status === 'non_effectue') { c.non_effectue++; return }
        if (isSamplingOverdue(s, planYear, plan.methode === 'Automatique')) { c.overdue++; return }
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
        if (!s) return
        if (s.status === 'done') { c.done++; return }
        if (s.status === 'non_effectue') { c.non_effectue++; return }
        if (isSamplingOverdue(s, planYear, plan.methode === 'Automatique')) { c.overdue++; return }
        if (s.status === 'planned') c.planned++
      })
    })
    return c
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-bg-primary)] p-4 md:p-6">
      <div className="flex flex-col flex-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden min-h-0">

        {/* Légende */}
        <div className="shrink-0 px-5 py-3 border-b border-[var(--color-border-subtle)] flex flex-wrap items-center gap-3 text-xs font-semibold bg-[var(--color-bg-secondary)] z-20">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--color-success-light)] text-[var(--color-success)] border border-[rgba(52,199,89,0.15)]">
            <span className="size-1.5 rounded-full bg-[var(--color-success)]" />
            Fait <span className="opacity-80 font-normal">({counts.done})</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--color-warning-light)] text-[var(--color-warning)] border border-[rgba(255,159,10,0.15)]">
            <span className="size-1.5 rounded-full bg-[var(--color-warning)]" />
            Planifié <span className="opacity-80 font-normal">({counts.planned})</span>
          </div>

          <button type="button" onClick={() => setIssueModalType('overdue')}
            className="flex items-center gap-1.5 cursor-pointer px-2.5 py-0.5 rounded-full bg-[var(--color-danger-light)] text-[var(--color-danger)] border border-[rgba(255,59,48,0.15)] hover:bg-[rgba(255,59,48,0.12)] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--color-danger)] font-semibold">
            <span className="size-1.5 rounded-full bg-[var(--color-danger)] animate-pulse" />
            En retard <span className="opacity-80 font-normal">({counts.overdue})</span>
            <span className="text-[10px] opacity-60">↗</span>
          </button>

          <button type="button" onClick={() => setIssueModalType('non_effectue')}
            className="flex items-center gap-1.5 cursor-pointer px-2.5 py-0.5 rounded-full bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border-subtle)] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--color-border)] font-semibold">
            <span className="size-1.5 rounded-full bg-[var(--color-neutral)]" />
            Non effectué <span className="opacity-80 font-normal">({counts.non_effectue})</span>
            <span className="text-[10px] opacity-60">↗</span>
          </button>

          <button type="button"
            onClick={() => {
              const allIds = groupedRows.map(g => g.client.id)
              const allCollapsed = allIds.every(id => collapsedClients.has(id))
              setCollapsedClients(allCollapsed ? new Set() : new Set(allIds))
            }}
            className="ml-auto flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors border border-[var(--color-border)] px-2.5 py-1 rounded-lg bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] shadow-sm text-[11px] font-medium">
            {groupedRows.every(g => collapsedClients.has(g.client.id))
              ? <><ChevronDown size={12} /> Tout déplier</>
              : <><ChevronRight size={12} /> Tout replier</>
            }
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto w-full relative">
          <table className="w-full text-left border-collapse" style={{ minWidth: 1000 }}>
            <thead className="sticky top-0 z-30">
              <tr className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] text-[11px] uppercase tracking-wider border-b border-[var(--color-border-subtle)]">
                <th className="px-4 py-3 font-semibold sticky left-0 z-40 bg-[var(--color-bg-tertiary)] border-r border-[var(--color-border-subtle)] shadow-[1px_0_0_var(--color-border-subtle)]">Client & Point de prélèvement</th>
                <th className="px-4 py-3 font-semibold border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)]">Plan</th>
                {MOIS_LONG.map((m, i) => (
                  <th key={m} scope="col" className="p-0 w-14 transition-opacity duration-200"
                    style={{ opacity: focusedMonth !== null && i !== focusedMonth ? 0.2 : 1 }}>
                    <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full px-2 py-3 font-semibold text-center border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)]">
                      <button type="button"
                        onClick={() => setFocusedMonth(prev => prev === i ? null : i)}
                        className="hover:text-[var(--color-accent)] transition-colors cursor-pointer"
                        title={`Isoler la colonne ${m}`}>
                        {m === 'Juin' ? 'JUN' : m === 'Juillet' ? 'JUL' : m.substring(0, 3).toUpperCase()}
                      </button>
                      <button type="button"
                        onClick={() => { setMonthModal(i); setFocusedMonth(i) }}
                        className="hover:text-[var(--color-accent)] transition-colors cursor-pointer p-0.5 -m-0.5"
                        title={`Voir les prélèvements de ${m}`}>
                        <Search size={9} className="opacity-40" />
                      </button>
                    </div>
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
                groupedRows.map(({ client, plans }, groupIdx) => {
                  const isCollapsed = collapsedClients.has(client.id)
                  const summary = getGroupSummary(plans)
                  const planYear = parseInt(client.annee ?? String(year))

                  return [
                    <tr key={`header-${client.id}`}
                      className={`border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)] hover:bg-[#eaeaea] transition-colors cursor-pointer${groupIdx > 0 ? ' border-t border-t-[var(--color-border-subtle)]' : ''}`}
                      onClick={() => toggleClient(client.id)}
                      aria-label={`${client.nom} — ${isCollapsed ? 'développer' : 'réduire'}`}>
                      <td className="px-3 py-2 sticky left-0 z-20 bg-[var(--color-bg-primary)] border-r border-[var(--color-border-subtle)] shadow-[1px_0_0_var(--color-border-subtle)]">
                        <div className="flex items-center gap-2">
                          {isCollapsed
                            ? <ChevronRight size={13} className="text-[var(--color-text-secondary)] shrink-0" />
                            : <ChevronDown size={13} className="text-[var(--color-text-secondary)] shrink-0" />
                          }
                          <div>
                            <Link to={`/missions/${client.id}`}
                              className="text-xs font-bold text-[var(--color-text-primary)] hover:text-[var(--color-accent)] hover:underline"
                              onClick={e => e.stopPropagation()}>
                              {client.nom}
                            </Link>
                            <div className="text-[10px] text-[var(--color-text-secondary)] font-medium leading-tight">{client.segment}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)]">
                        <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-secondary)] font-semibold">
                          <span>{plans.length} plan{plans.length > 1 ? 's' : ''}</span>
                          <span className="flex items-center gap-1">
                            {summary.done > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[var(--color-success-light)] text-[var(--color-success)] border border-[rgba(52,199,89,0.12)]">
                                ✓ {summary.done}
                              </span>
                            )}
                            {summary.planned > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[var(--color-warning-light)] text-[var(--color-warning)] border border-[rgba(255,159,10,0.12)]">
                                ● {summary.planned}
                              </span>
                            )}
                            {summary.overdue > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[var(--color-danger-light)] text-[var(--color-danger)] border border-[rgba(255,59,48,0.12)]">
                                ! {summary.overdue}
                              </span>
                            )}
                            {summary.non_effectue > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                                ✕ {summary.non_effectue}
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      {Array(12).fill(null).map((_, i) => (
                        <td key={i} className="border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)] transition-opacity duration-200"
                          style={{ opacity: focusedMonth !== null && i !== focusedMonth ? 0.2 : 1 }} aria-label={MOIS_LONG[i]} />
                      ))}
                    </tr>,

                    ...(!isCollapsed ? plans.map((row) => (
                      <YearMatrixPlanRow
                        key={`${row.client.id}-${row.plan.id}`}
                        row={row}
                        planYear={planYear}
                        onOpenIssueModal={setIssueModalType}
                        activeMonth={focusedMonth}
                      />
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

      {monthModal !== null && (
        <IssueListModal
          type="month"
          month={monthModal}
          rows={rows}
          year={year}
          preleveurs={preleveurs}
          onClose={() => setMonthModal(null)}
        />
      )}
    </div>
  )
}
