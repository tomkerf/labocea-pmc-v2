import { useMemo } from 'react'
import type { Client } from '@/types'
import type { Preleveur } from '@/stores/preleveursStore'
import { MOIS_LONG } from '@/lib/planningUtils'

interface WorkloadMatrixViewProps {
  clients: Client[]
  year: number
  filterTech: string
  filterSite: string
  preleveurs: Preleveur[]
}

// Seuils de charge par mois pour un technicien
const THRESHOLD_WARNING = 25
const THRESHOLD_DANGER = 40

function getHeatmapColor(value: number) {
  if (value === 0) return 'transparent'
  if (value >= THRESHOLD_DANGER) return 'var(--color-danger-light)'
  if (value >= THRESHOLD_WARNING) return 'var(--color-warning-light)'
  return 'var(--color-bg-secondary)'
}

function getHeatmapTextColor(value: number) {
  if (value === 0) return 'var(--color-text-tertiary)'
  return 'var(--color-text-primary)'
}

export default function WorkloadMatrixView({ clients, year, filterTech, filterSite, preleveurs }: WorkloadMatrixViewProps) {
  
  // 1. Agréger les données par technicien et par mois
  const { techStats, totalPerMonth, globalStats } = useMemo(() => {
    // Initialisation
    const stats = new Map<string, { total: number, months: number[] }>()
    
    // On ajoute tous les techniciens existants pour qu'ils s'affichent même s'ils sont à 0
    preleveurs.forEach(p => {
      stats.set(p.code, { total: 0, months: Array(12).fill(0) })
    })
    // Entrée pour les prélèvements "Non assignés"
    stats.set('NON_ASSIGNE', { total: 0, months: Array(12).fill(0) })

    const totalMonth = Array(12).fill(0)
    let totalYear = 0
    let planned = 0
    let done = 0

    clients.forEach(c => {
      if (c.annee && c.annee !== year.toString()) return

      c.plans.forEach(p => {
        if (p.separator) return

        const assigned = c.preleveur || ''
        const prel = preleveurs.find(pr => pr.code === assigned)
        
        // Appliquer les filtres
        if (filterSite && prel?.site !== filterSite) return
        if (filterTech && assigned !== filterTech) return

        const techKey = assigned || 'NON_ASSIGNE'
        if (!stats.has(techKey)) stats.set(techKey, { total: 0, months: Array(12).fill(0) })
        const techData = stats.get(techKey)!

        p.samplings.forEach(s => {
          // On ne compte pas les "non_effectue" (annulés) dans la charge de travail
          if (s.status === 'non_effectue') return
          
          if (s.plannedMonth >= 0 && s.plannedMonth < 12) {
            techData.months[s.plannedMonth] += 1
            techData.total += 1
            totalMonth[s.plannedMonth] += 1
            totalYear += 1
            
            if (s.status === 'planned' || s.status === 'overdue') planned++
            if (s.status === 'done') done++
          }
        })
      })
    })

    // On retire les techniciens qui n'ont rien du tout s'ils ne correspondent pas aux filtres
    // Mais on garde une liste propre triée
    const sortedStats = Array.from(stats.entries())
      .filter(([code]) => {
        if (code === 'NON_ASSIGNE') return true
        if (filterTech && code !== filterTech) return false
        if (filterSite) {
          const prel = preleveurs.find(pr => pr.code === code)
          if (prel?.site !== filterSite) return false
        }
        return true
      })
      .map(([code, d]) => ({ code, ...d }))
      .sort((a, b) => {
        if (a.code === 'NON_ASSIGNE') return 1 // Non assigné à la fin
        if (b.code === 'NON_ASSIGNE') return -1
        return b.total - a.total // Trier par charge totale décroissante
      })

    return { 
      techStats: sortedStats, 
      totalPerMonth: totalMonth,
      globalStats: { totalYear, planned, done }
    }
  }, [clients, year, filterTech, filterSite, preleveurs])

  // Calcul du mois le plus chargé
  const maxMonthValue = Math.max(...totalPerMonth)
  const maxMonthIndex = totalPerMonth.indexOf(maxMonthValue)
  const maxMonthName = maxMonthValue > 0 ? MOIS_LONG[maxMonthIndex] : 'Aucun'

  // Capacité théorique (exemple: 35 prélèvements * nb de techs)
  const nbActiveTechs = techStats.filter(t => t.code !== 'NON_ASSIGNE').length
  const maxCapacityPerMonth = nbActiveTechs * 35 

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-bg-primary)] p-4 md:p-6 overflow-y-auto">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-8">
        
        {/* Titre et Explications */}
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Plan de Charge {year}</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Visualisez la répartition du volume de travail par mois et par technicien pour anticiper les surcharges.
          </p>
        </div>

        {/* 1. KPIs Bilan de charge */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-[var(--shadow-card)]">
            <div className="text-sm text-[var(--color-text-secondary)] mb-1">Volume total annuel</div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">{globalStats.totalYear} <span className="text-sm font-medium text-[var(--color-text-tertiary)]">prélèv.</span></div>
            <div className="mt-2 text-xs flex gap-2">
              <span className="text-[var(--color-success)] font-medium">✓ {globalStats.done} faits</span>
              <span className="text-[var(--color-warning)] font-medium">● {globalStats.planned} à faire</span>
            </div>
          </div>
          
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-[var(--shadow-card)]">
            <div className="text-sm text-[var(--color-text-secondary)] mb-1">Pic d'activité</div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">{maxMonthName}</div>
            <div className="mt-2 text-xs text-[var(--color-text-secondary)]">
              {maxMonthValue > 0 ? `Avec ${maxMonthValue} interventions prévues` : 'Aucune intervention'}
            </div>
          </div>

          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-[var(--shadow-card)]">
            <div className="text-sm text-[var(--color-text-secondary)] mb-1">Charge moyenne</div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {nbActiveTechs > 0 ? Math.round(globalStats.totalYear / 12 / nbActiveTechs) : 0} <span className="text-sm font-medium text-[var(--color-text-tertiary)]">/ mois / tech</span>
            </div>
            <div className="mt-2 text-xs text-[var(--color-text-secondary)]">
              Base de {nbActiveTechs} techniciens actifs
            </div>
          </div>

          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-[var(--shadow-card)]">
            <div className="text-sm text-[var(--color-text-secondary)] mb-1">Non assignés</div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {techStats.find(t => t.code === 'NON_ASSIGNE')?.total || 0} <span className="text-sm font-medium text-[var(--color-text-tertiary)]">prélèv.</span>
            </div>
            <div className="mt-2 text-xs text-[var(--color-text-secondary)]">
              Volume de travail orphelin
            </div>
          </div>
        </div>

        {/* 2. Histogramme Global */}
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-md font-semibold text-[var(--color-text-primary)]">Évolution de la charge globale</h3>
            <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-[2px] bg-[var(--color-accent)]" />
                <span>Volume prévu</span>
              </div>
              <div className="flex items-center gap-1.5 relative group cursor-help">
                <div className="w-3 h-3 rounded-[2px] bg-[var(--color-warning)]" />
                <span className="border-b border-dotted border-[var(--color-text-tertiary)]">Surcharge théorique</span>
                
                <div className="absolute bottom-full right-0 mb-2 w-56 p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] shadow-[var(--shadow-modal)] text-xs leading-relaxed text-[var(--color-text-secondary)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                  <span className="font-semibold text-[var(--color-text-primary)] block mb-1">Capacité maximale</span>
                  Calculé sur la base de 35 prélèvements par mois par technicien actif ({nbActiveTechs} actuellement affichés).
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-stretch gap-2 h-48 relative pt-6 pb-2">
            {/* Ligne de flottaison (Capacité max) */}
            {maxCapacityPerMonth > 0 && maxMonthValue > 0 && (
              <div 
                className="absolute w-full border-t border-dashed border-[var(--color-danger)] opacity-50 z-10 flex items-center"
                style={{ bottom: `${Math.min(100, (maxCapacityPerMonth / Math.max(maxCapacityPerMonth, maxMonthValue)) * 100)}%` }}
              >
                <span className="absolute right-0 -top-5 text-[10px] text-[var(--color-danger)] font-medium">Capacité max théo. ({maxCapacityPerMonth})</span>
              </div>
            )}

            {totalPerMonth.map((val, i) => {
              const chartMax = Math.max(maxCapacityPerMonth, maxMonthValue, 1)
              const heightPct = (val / chartMax) * 100
              const isOverCapacity = maxCapacityPerMonth > 0 && val > maxCapacityPerMonth
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 relative group h-full">
                  {val > 0 && (
                    <div className="absolute -top-6 text-xs font-semibold text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity">
                      {val}
                    </div>
                  )}
                  <div className="w-full max-w-[40px] bg-[var(--color-bg-tertiary)] rounded-t-[6px] relative flex items-end justify-center overflow-hidden flex-1">
                    <div 
                      className="w-full rounded-t-[6px] transition-all duration-500"
                      style={{ 
                        height: `${heightPct}%`,
                        background: isOverCapacity ? 'var(--color-warning)' : 'var(--color-accent)'
                      }}
                    />
                  </div>
                  <div className="text-[10px] font-medium text-[var(--color-text-secondary)] uppercase">
                    {MOIS_LONG[i] === 'Juin' ? 'JUN' : MOIS_LONG[i] === 'Juillet' ? 'JUL' : MOIS_LONG[i].substring(0,3)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 3. Heatmap Matrice */}
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Matrice de Charge par Technicien</h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5"><span className="size-3 rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]" /> Normal</div>
              <div className="flex items-center gap-1.5"><span className="size-3 rounded bg-[var(--color-warning-light)] border border-[var(--color-warning)] opacity-50" /> Chargé ({'>'}{THRESHOLD_WARNING})</div>
              <div className="flex items-center gap-1.5"><span className="size-3 rounded bg-[var(--color-danger-light)] border border-[var(--color-danger)] opacity-50" /> Surcharge ({'>'}{THRESHOLD_DANGER})</div>
            </div>
          </div>
          
          <div className="relative">
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" style={{ minWidth: 800 }}>
              <thead>
                <tr className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] text-[11px] uppercase tracking-wider border-b border-[var(--color-border-subtle)]">
                  <th className="px-5 py-3 font-semibold sticky left-0 z-40 bg-[var(--color-bg-tertiary)] border-r border-[var(--color-border-subtle)] shadow-[1px_0_0_var(--color-border-subtle)] w-48">Technicien</th>
                  <th className="px-2 py-3 font-semibold text-center border-r border-[var(--color-border-subtle)] w-16">Total</th>
                  {MOIS_LONG.map(m => (
                    <th key={m} className="px-2 py-3 font-semibold text-center border-r border-[var(--color-border-subtle)] flex-1 min-w-[50px]">
                      {m === 'Juin' ? 'JUN' : m === 'Juillet' ? 'JUL' : m.substring(0, 3).toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {techStats.map((tech) => {
                  const prel = preleveurs.find(p => p.code === tech.code)
                  const name = tech.code === 'NON_ASSIGNE' ? 'Non assigné' : (prel?.nom || tech.code)
                  const isUnassigned = tech.code === 'NON_ASSIGNE'
                  
                  return (
                    <tr key={tech.code} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-tertiary)] transition-colors">
                      <td className="px-5 py-3 sticky left-0 z-20 bg-[var(--color-bg-secondary)] group-hover:bg-[var(--color-bg-tertiary)] border-r border-[var(--color-border-subtle)] transition-colors shadow-[1px_0_0_var(--color-border-subtle)]">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm ${isUnassigned ? 'text-[var(--color-warning)] italic' : 'text-[var(--color-text-primary)]'}`}>
                            {name}
                          </span>
                          {!isUnassigned && <span className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded">{tech.code}</span>}
                        </div>
                      </td>
                      <td className="px-2 py-3 border-r border-[var(--color-border-subtle)] text-center font-bold text-[var(--color-text-primary)] text-sm">
                        {tech.total > 0 ? tech.total : '-'}
                      </td>
                      {tech.months.map((val, i) => (
                        <td key={i} className="px-1.5 py-1.5 border-r border-[var(--color-border-subtle)] last:border-0 relative group">
                          <div 
                            className="w-full h-8 flex items-center justify-center font-medium rounded-md transition-colors"
                            style={{ 
                              backgroundColor: getHeatmapColor(val),
                              color: getHeatmapTextColor(val)
                            }}
                          >
                            {val > 0 ? val : '-'}
                          </div>
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
            {/* Indicateur scroll horizontal */}
            <div className="absolute inset-y-0 right-0 w-10 pointer-events-none rounded-br-xl"
              style={{ background: 'linear-gradient(to right, transparent, var(--color-bg-secondary))' }} />
          </div>
        </div>

      </div>
    </div>
  )
}
