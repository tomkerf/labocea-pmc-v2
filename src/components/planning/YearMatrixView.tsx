import { useMemo } from 'react'
import type { Client, Plan, Sampling } from '@/types'
import { MOIS_LONG } from '@/lib/planningUtils'
import { Link } from 'react-router-dom'

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
}

export default function YearMatrixView({ clients, year, filterTech, filterSite, preleveurs }: YearMatrixViewProps) {
  // Préparer les données
  const rows = useMemo(() => {
    const list: RowData[] = []

    clients.forEach(c => {
      // Filtrer par année de contrat (optionnel, selon la façon dont on gère les années)
      // Souvent c.annee == '2026' ou autre, mais on peut juste tout afficher si pas spécifié.
      if (c.annee && c.annee !== year.toString()) return

      c.plans.forEach(p => {
        if (p.separator) return

        // Appliquer filtres technicien/site sur le client/plan
        const assigned = c.preleveur || ''
        const prel = preleveurs.find(pr => pr.code === assigned)
        
        if (filterSite && prel?.site !== filterSite) return
        if (filterTech && assigned !== filterTech) return

        // Préparer les colonnes (0 à 11)
        const samplingsByMonth: (Sampling | null)[] = Array(12).fill(null)
        p.samplings.forEach(s => {
          if (s.plannedMonth >= 0 && s.plannedMonth < 12) {
            samplingsByMonth[s.plannedMonth] = s
          }
        })

        list.push({ client: c, plan: p, samplingsByMonth })
      })
    })

    // Trier par Nom client puis par Nom du site
    return list.sort((a, b) => {
      const c = a.client.nom.localeCompare(b.client.nom)
      if (c !== 0) return c
      return a.plan.siteNom.localeCompare(b.plan.siteNom)
    })
  }, [clients, year, filterTech, filterSite, preleveurs])

  const getStatusColor = (s: Sampling | null) => {
    if (!s) return 'transparent'
    switch (s.status) {
      case 'done': return 'var(--color-success)'
      case 'planned': return 'var(--color-warning)'
      case 'overdue': return 'var(--color-danger)'
      case 'non_effectue': return 'var(--color-neutral)'
      default: return 'var(--color-border)'
    }
  }

  const getStatusLabel = (s: Sampling | null) => {
    if (!s) return ''
    switch (s.status) {
      case 'done': return 'Fait'
      case 'planned': return 'Planifié'
      case 'overdue': return 'En retard'
      case 'non_effectue': return 'Non fait'
      default: return ''
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-bg-primary)] p-4 md:p-6">
      <div className="flex flex-col flex-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden min-h-0">
        
        {/* Légende (fixe) */}
        <div className="shrink-0 px-4 py-3 border-b border-[var(--color-border-subtle)] flex gap-4 text-xs font-medium bg-[var(--color-bg-secondary)] z-20">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--color-success)]" /> Fait</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--color-warning)]" /> Planifié</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--color-danger)]" /> En retard</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--color-neutral)]" /> Non effectué</div>
        </div>

        {/* Table wrapper (scrollable) */}
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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-[var(--color-text-secondary)] text-sm">
                    Aucun plan de prélèvement trouvé pour l'année {year} avec ces filtres.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.client.id}-${row.plan.id}`} 
                    className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-tertiary)] transition-colors group">
                    <td className="px-4 py-2 text-sm sticky left-0 z-20 bg-[var(--color-bg-secondary)] group-hover:bg-[var(--color-bg-tertiary)] border-r border-[var(--color-border-subtle)] transition-colors shadow-[1px_0_0_var(--color-border-subtle)]">
                      <Link to={`/missions/${row.client.id}`} className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)] hover:underline">
                        {row.client.nom}
                      </Link>
                      <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">{row.client.segment}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-[var(--color-text-primary)] border-r border-[var(--color-border-subtle)]">
                      <div className="font-medium">{row.plan.nom}</div>
                      <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">{row.plan.siteNom} • {row.plan.frequence}</div>
                    </td>
                    
                    {row.samplingsByMonth.map((s, mIdx) => (
                      <td key={mIdx} className="px-1 py-2 text-center border-r border-[var(--color-border-subtle)] relative">
                        {s && (
                          <div 
                            className="mx-auto w-6 h-6 rounded-full flex items-center justify-center cursor-help transition-transform hover:scale-110"
                            style={{ backgroundColor: getStatusColor(s) }}
                            title={`${MOIS_LONG[mIdx]} - ${getStatusLabel(s)}${s.doneDate ? ` le ${s.doneDate}` : ''}`}
                          >
                            <span className="text-[10px] font-bold text-white leading-none">
                              {s.status === 'done' ? '✓' : (s.status === 'non_effectue' ? '✕' : (s.status === 'overdue' ? '!' : ''))}
                            </span>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
