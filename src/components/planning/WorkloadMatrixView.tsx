import { useMemo, useState } from 'react'
import type { Client } from '@/types'
import type { Preleveur } from '@/stores/preleveursStore'
import { MOIS_LONG } from '@/lib/planningUtils'
import {
  Info,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Users,
  Calendar,
  Layers
} from 'lucide-react'
import {
  getSamplingPoints,
  formatPoints,
  CAPACITY_POINTS_PER_TECH_PER_MONTH,
  THRESHOLD_WARNING_POINTS,
  THRESHOLD_DANGER_POINTS,
} from '@/lib/workloadUtils'

interface WorkloadMatrixViewProps {
  clients: Client[]
  year: number
  filterTech: string
  filterSite: string
  filterMethod?: string
  preleveurs: Preleveur[]
}

// Couleurs et styles heatmap en tons pastels ultra-doux (Apple-style)
function getHeatmapStyle(points: number) {
  if (points === 0) {
    return {
      bg: 'transparent',
      text: 'var(--color-text-tertiary)',
      border: '1px border-transparent'
    }
  }
  if (points >= THRESHOLD_DANGER_POINTS) {
    return {
      bg: 'rgba(255, 59, 48, 0.08)',
      text: 'var(--color-danger)',
      border: '1px solid rgba(255, 59, 48, 0.15)'
    }
  }
  if (points >= THRESHOLD_WARNING_POINTS) {
    return {
      bg: 'rgba(255, 159, 10, 0.08)',
      text: 'var(--color-warning)',
      border: '1px solid rgba(255, 159, 10, 0.15)'
    }
  }
  return {
    bg: 'var(--color-bg-primary)',
    text: 'var(--color-text-primary)',
    border: '1px solid var(--color-border-subtle)'
  }
}

export default function WorkloadMatrixView({ clients, year, filterTech, filterSite, filterMethod = '', preleveurs }: WorkloadMatrixViewProps) {
  const [showExplanation, setShowExplanation] = useState(false)
  
  // 1. Agréger les données par technicien et par mois
  const { techStats, totalPerMonthPoints, totalPerMonthCount, globalStats, methodBreakdown, methodBreakdownPoints } = useMemo(() => {
    // Initialisation
    const emptyTechData = () => ({
      totalCount: 0,
      totalPoints: 0,
      monthsCount: Array(12).fill(0) as number[],
      monthsPoints: Array(12).fill(0) as number[],
      monthDetails: Array.from({ length: 12 }, () => ({ Ponctuel: 0, Composite: 0, Automatique: 0 }))
    })
    const stats = new Map<string, ReturnType<typeof emptyTechData>>()

    // On ajoute tous les techniciens existants pour qu'ils s'affichent même s'ils sont à 0
    preleveurs.forEach(p => {
      stats.set(p.code, emptyTechData())
    })
    // Entrée pour les prélèvements "Non assignés"
    stats.set('NON_ASSIGNE', emptyTechData())

    const totalMonthCount = Array(12).fill(0)
    const totalMonthPoints = Array(12).fill(0)
    let totalYear = 0
    let totalYearPoints = 0
    let planned = 0
    let done = 0
    const mBreakdown = { Ponctuel: 0, Composite: 0, Automatique: 0 }
    const mBreakdownPoints = { Ponctuel: 0, Composite: 0, Automatique: 0 }

    clients.forEach(c => {
      if (c.annee && c.annee !== year.toString()) return

      c.plans.forEach(p => {
        if (p.separator) return

        const assigned = c.preleveur || ''
        const prel = preleveurs.find(pr => pr.code === assigned)
        
        // Appliquer les filtres
        if (filterSite && prel?.site !== filterSite) return
        if (filterTech && assigned !== filterTech) return
        if (filterMethod && p.methode !== filterMethod) return

        const techKey = assigned || 'NON_ASSIGNE'
        if (!stats.has(techKey)) {
          stats.set(techKey, emptyTechData())
        }
        const techData = stats.get(techKey)!

        const pointsVal = getSamplingPoints(p)

        p.samplings.forEach(s => {
          if (!s) return
          // On ne compte pas les "non_effectue" (annulés) dans la charge de travail
          if (s.status === 'non_effectue') return

          if (s.plannedMonth >= 0 && s.plannedMonth < 12) {
            techData.monthsCount[s.plannedMonth] += 1
            techData.monthsPoints[s.plannedMonth] += pointsVal
            techData.totalCount += 1
            techData.totalPoints += pointsVal

            const meth = p.methode || 'Ponctuel'
            if (meth === 'Ponctuel' || meth === 'Composite' || meth === 'Automatique') {
              techData.monthDetails[s.plannedMonth][meth] += 1
              mBreakdown[meth] += 1
              mBreakdownPoints[meth] += pointsVal
            }

            totalMonthCount[s.plannedMonth] += 1
            totalMonthPoints[s.plannedMonth] += pointsVal
            totalYear += 1
            totalYearPoints += pointsVal

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
        return b.totalPoints - a.totalPoints // Trier par charge totale décroissante
      })

    return {
      techStats: sortedStats,
      totalPerMonthPoints: totalMonthPoints,
      totalPerMonthCount: totalMonthCount,
      globalStats: { totalYear, totalYearPoints, planned, done },
      methodBreakdown: mBreakdown,
      methodBreakdownPoints: mBreakdownPoints
    }
  }, [clients, year, filterTech, filterSite, filterMethod, preleveurs])

  // Calcul du mois le plus chargé (en points de charge)
  const maxMonthPoints = Math.max(...totalPerMonthPoints)
  const maxMonthIndex = totalPerMonthPoints.indexOf(maxMonthPoints)
  const maxMonthName = maxMonthPoints > 0 ? MOIS_LONG[maxMonthIndex] : 'Aucun'
  const maxMonthCount = maxMonthPoints > 0 ? totalPerMonthCount[maxMonthIndex] : 0

  // Capacité théorique en points par mois
  const nbActiveTechs = techStats.filter(t => t.code !== 'NON_ASSIGNE').length
  const maxCapacityPerMonth = nbActiveTechs * CAPACITY_POINTS_PER_TECH_PER_MONTH

  const unassigned = techStats.find(t => t.code === 'NON_ASSIGNE')

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-bg-primary)] p-4 md:p-6 overflow-y-auto">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-8">
        
        {/* Titre et Explications */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Plan de Charge {year}</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Visualisez la répartition du volume de travail par mois et par technicien en points de charge.
            </p>
          </div>
          
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--color-accent)] bg-[var(--color-accent-light)] hover:bg-[var(--color-accent-hover)] hover:text-white transition-all cursor-pointer self-start md:self-auto shadow-sm active:scale-[0.98]"
          >
            <Info className="size-4" />
            <span>{showExplanation ? 'Masquer la méthode de calcul' : 'Comprendre le calcul de charge'}</span>
            {showExplanation ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        </div>

        {/* Détails du calcul (Scénario C) — Collapsible et élégant */}
        {showExplanation && (
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-5 text-xs text-[var(--color-text-secondary)] shadow-[var(--shadow-card)] transition-all animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="font-semibold text-[var(--color-text-primary)] block mb-3 text-sm">Barème des points de charge :</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[var(--color-bg-primary)] p-3 rounded-lg border border-[var(--color-border-subtle)] flex flex-col justify-between">
                    <span className="text-[var(--color-text-tertiary)] font-medium block mb-1">Ponctuel</span>
                    <strong className="text-base text-[var(--color-text-primary)]">1 pt</strong>
                    <span className="text-[10px] block mt-1 text-[var(--color-text-secondary)]">(15 min sur site)</span>
                  </div>
                  <div className="bg-[var(--color-bg-primary)] p-3 rounded-lg border border-[var(--color-border-subtle)] flex flex-col justify-between">
                    <span className="text-[var(--color-text-tertiary)] font-medium block mb-1">Eau Souterraine</span>
                    <strong className="text-base text-[var(--color-text-primary)]">2 pts</strong>
                    <span className="text-[10px] block mt-1 text-[var(--color-text-secondary)]">(1h sur site)</span>
                  </div>
                  <div className="bg-[var(--color-bg-primary)] p-3 rounded-lg border border-[var(--color-border-subtle)] flex flex-col justify-between">
                    <span className="text-[var(--color-text-tertiary)] font-medium block mb-1">Composite / Auto</span>
                    <strong className="text-base text-[var(--color-text-primary)]">4 pts</strong>
                    <span className="text-[10px] block mt-1 text-[var(--color-text-secondary)]">(2h site + 2 trajets)</span>
                  </div>
                </div>
              </div>
              
              <div className="border-t md:border-t-0 md:border-l border-[var(--color-border-subtle)] pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
                <span className="font-semibold text-[var(--color-text-primary)] block mb-1.5 text-sm">Capacité maximale théorique de l'équipe :</span>
                <p className="leading-relaxed mb-3">
                  Fixée à <strong>{CAPACITY_POINTS_PER_TECH_PER_MONTH} pts / mois par technicien actif</strong>.
                </p>
                <div className="bg-[var(--color-bg-primary)] rounded-lg p-3 text-[11px] leading-relaxed text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]">
                  <span className="font-semibold text-[var(--color-text-primary)] block mb-1">Calcul théorique (Scénario C) :</span>
                  Sur un temps mensuel de 151,7h, après déduction de l'administratif (15%) et de la préparation/labo (15%), il reste ~107h pour le terrain.
                  À raison d'une moyenne de 2h par prélèvement Ponctuel (1h45 de trajet A/R + 15 min sur site), la capacité est de : 107h / 2h ≈ <strong>50 points par mois</strong>.
                </div>
                <p className="mt-3 text-[10px] text-[var(--color-text-tertiary)]">
                  Calcul en cours : {nbActiveTechs} tech. {nbActiveTechs > 1 ? 'actifs' : 'actif'} × {CAPACITY_POINTS_PER_TECH_PER_MONTH} pts = <strong>{maxCapacityPerMonth} pts / mois</strong> pour l'ensemble de l'équipe.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 1. KPIs Bilan de charge (Version allégée et élégante) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-[var(--shadow-card)] flex flex-col justify-between min-h-[120px]">
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-[var(--color-text-secondary)] uppercase mb-1.5 flex items-center gap-1.5">
                <Layers className="size-3.5 text-[var(--color-accent)]" /> Volume total annuel
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)] flex items-baseline gap-x-1.5">
                {formatPoints(globalStats.totalYearPoints)}
                <span className="text-xs font-medium text-[var(--color-text-tertiary)]">{globalStats.totalYear} prélèv.</span>
              </div>
              <div className="mt-2 flex gap-3 text-[10px] font-medium">
                <span className="text-[var(--color-success)]">✓ {globalStats.done} faits</span>
                <span className="text-[var(--color-warning)]">● {globalStats.planned} à faire</span>
              </div>
            </div>
            {globalStats.totalYear > 0 && (
              <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle)] flex flex-col gap-2">
                <div className="flex h-1.5 rounded-full overflow-hidden bg-[var(--color-bg-primary)]">
                  {methodBreakdown.Ponctuel > 0 && (
                    <div 
                      className="bg-[var(--color-accent)] h-full" 
                      style={{ width: `${(methodBreakdownPoints.Ponctuel / globalStats.totalYearPoints) * 100}%` }}
                      title={`Ponctuels : ${methodBreakdown.Ponctuel}`}
                    />
                  )}
                  {methodBreakdown.Composite > 0 && (
                    <div 
                      className="bg-[#34C759] h-full" 
                      style={{ width: `${(methodBreakdownPoints.Composite / globalStats.totalYearPoints) * 100}%` }}
                      title={`Composites : ${methodBreakdown.Composite}`}
                    />
                  )}
                  {methodBreakdown.Automatique > 0 && (
                    <div 
                      className="bg-[#FF9F0A] h-full" 
                      style={{ width: `${(methodBreakdownPoints.Automatique / globalStats.totalYearPoints) * 100}%` }}
                      title={`Automatiques : ${methodBreakdown.Automatique}`}
                    />
                  )}
                </div>
                <div className="flex justify-between text-[9px] font-semibold text-[var(--color-text-secondary)]">
                  <span className="flex items-center gap-1"><span className="size-1 rounded-full bg-[var(--color-accent)]" /> {methodBreakdown.Ponctuel} Ponc.</span>
                  <span className="flex items-center gap-1"><span className="size-1 rounded-full bg-[#34C759]" /> {methodBreakdown.Composite} Comp.</span>
                  <span className="flex items-center gap-1"><span className="size-1 rounded-full bg-[#FF9F0A]" /> {methodBreakdown.Automatique} Auto.</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-[var(--shadow-card)] flex flex-col justify-between min-h-[120px]">
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-[var(--color-text-secondary)] uppercase mb-1.5 flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-[#FF9F0A]" /> Pic d'activité
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">{maxMonthName}</div>
            </div>
            <div className="text-[10px] leading-relaxed text-[var(--color-text-secondary)] mt-2 pt-2 border-t border-[var(--color-border-subtle)]">
              {maxMonthPoints > 0 ? `${formatPoints(maxMonthPoints)} prévus (${maxMonthCount} interventions)` : 'Aucune intervention'}
            </div>
          </div>

          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-[var(--shadow-card)] flex flex-col justify-between min-h-[120px]">
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-[var(--color-text-secondary)] uppercase mb-1.5 flex items-center gap-1.5">
                <Users className="size-3.5 text-[#34C759]" /> Charge moyenne
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)] flex items-baseline gap-x-1.5">
                {formatPoints(nbActiveTechs > 0 ? Math.round(globalStats.totalYearPoints / 12 / nbActiveTechs * 10) / 10 : 0)}
                <span className="text-xs font-medium text-[var(--color-text-tertiary)]">/ mois / tech</span>
              </div>
            </div>
            <div className="text-[10px] leading-relaxed text-[var(--color-text-secondary)] mt-2 pt-2 border-t border-[var(--color-border-subtle)]">
              Base de {nbActiveTechs} techniciens actifs
            </div>
          </div>

          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-[var(--shadow-card)] flex flex-col justify-between min-h-[120px]">
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-[var(--color-text-secondary)] uppercase mb-1.5 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-[var(--color-neutral)]" /> Non assignés
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)] flex items-baseline gap-x-1.5">
                {formatPoints(unassigned?.totalPoints || 0)}
                <span className="text-xs font-medium text-[var(--color-text-tertiary)]">{unassigned?.totalCount || 0} prélèv.</span>
              </div>
            </div>
            <div className="text-[10px] leading-relaxed text-[var(--color-text-secondary)] mt-2 pt-2 border-t border-[var(--color-border-subtle)]">
              Volume de travail orphelin
            </div>
          </div>
        </div>

        {/* 2. Histogramme Global */}
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Évolution de la charge globale</h3>
            <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-[3px] bg-[var(--color-accent)]" />
                <span>Volume prévu</span>
              </div>
              <div className="flex items-center gap-1.5 relative group cursor-help">
                <div className="w-2.5 h-2.5 rounded-[3px] bg-[var(--color-warning)]" />
                <span className="border-b border-dotted border-[var(--color-text-tertiary)]">Surcharge théorique</span>
                
                <div className="absolute bottom-full right-0 mb-2 w-72 p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] shadow-[var(--shadow-modal)] text-xs leading-relaxed text-[var(--color-text-secondary)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                  <span className="font-semibold text-[var(--color-text-primary)] block mb-1">Capacité maximale</span>
                  Calculée sur la base de {CAPACITY_POINTS_PER_TECH_PER_MONTH} pts de charge par mois par technicien actif ({nbActiveTechs} actuellement affichés).
                  <div className="mt-2 pt-2 border-t border-[var(--color-border-subtle)] flex flex-col gap-1 text-[11px]">
                    <span className="font-medium text-[var(--color-text-primary)] mb-0.5">Barème d'équivalence :</span>
                    <span>• Prélèvement Ponctuel = 1 pt</span>
                    <span>• Eau Souterraine = 2 pts</span>
                    <span>• Composite / Automatique = 4 pts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-stretch gap-3 h-48 relative pt-6 pb-2">
            {/* Ligne de flottaison (Capacité max) */}
            {maxCapacityPerMonth > 0 && maxMonthPoints > 0 && (
              <div
                className="absolute w-full border-t border-dashed border-[var(--color-danger)] opacity-35 z-10 flex items-center"
                style={{ bottom: `${Math.min(100, (maxCapacityPerMonth / Math.max(maxCapacityPerMonth, maxMonthPoints)) * 100)}%` }}
              >
                <span className="absolute right-0 -top-4 text-[9px] text-[var(--color-danger)] font-semibold uppercase tracking-wider">Capacité max théo. ({formatPoints(maxCapacityPerMonth)})</span>
              </div>
            )}

            {totalPerMonthPoints.map((val, i) => {
              const chartMax = Math.max(maxCapacityPerMonth, maxMonthPoints, 1)
              const heightPct = (val / chartMax) * 100
              const isOverCapacity = maxCapacityPerMonth > 0 && val > maxCapacityPerMonth

              return (
                <div key={MOIS_LONG[i]} className="flex-1 flex flex-col items-center gap-2 relative group h-full">
                  {val > 0 && (
                    <div className="absolute -top-5 text-[10px] font-semibold text-[var(--color-text-secondary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      {formatPoints(val)}
                    </div>
                  )}
                  <div className="w-full max-w-[28px] bg-[var(--color-bg-tertiary)] rounded-t-[4px] relative flex items-end justify-center overflow-hidden flex-1">
                    <div 
                      className="w-full rounded-t-[4px] transition-all duration-500"
                      style={{ 
                        height: `${heightPct}%`,
                        background: isOverCapacity ? 'var(--color-warning)' : 'var(--color-accent)'
                      }}
                    />
                  </div>
                  <div className="text-[9px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    {MOIS_LONG[i] === 'Juin' ? 'JUN' : MOIS_LONG[i] === 'Juillet' ? 'JUL' : MOIS_LONG[i].substring(0,3)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 3. Heatmap Matrice */}
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Matrice de Charge par Technicien</h3>
              <span className="text-[10px] text-[var(--color-text-tertiary)] hidden lg:inline">— défiler horizontalement →</span>
            </div>
            <div className="flex flex-wrap items-center gap-3.5 text-[11px] text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border-subtle)]" />
                <span>Normal (&lt;{THRESHOLD_WARNING_POINTS} pts)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded bg-[rgba(255,159,10,0.08)] border border-[rgba(255,159,10,0.15)]" />
                <span className="text-[var(--color-warning)] font-medium">Chargé ({THRESHOLD_WARNING_POINTS}–{THRESHOLD_DANGER_POINTS} pts)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded bg-[rgba(255,59,48,0.08)] border border-[rgba(255,59,48,0.15)]" />
                <span className="text-[var(--color-danger)] font-medium">Surcharge (&gt;={THRESHOLD_DANGER_POINTS} pts)</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" style={{ minWidth: 800 }}>
              <thead>
                <tr className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] text-[10px] uppercase tracking-wider border-b border-[var(--color-border-subtle)]">
                  <th className="px-5 py-3.5 font-semibold sticky left-0 z-40 bg-[var(--color-bg-tertiary)] border-r border-[var(--color-border-subtle)] shadow-[1px_0_0_var(--color-border-subtle)] w-48">Technicien</th>
                  <th className="px-2 py-3.5 font-semibold text-center border-r border-[var(--color-border-subtle)] w-16">Total</th>
                  {MOIS_LONG.map(m => (
                    <th key={m} className="px-2 py-3.5 font-semibold text-center border-r border-[var(--color-border-subtle)] flex-1 min-w-[50px]">
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
                      <td className="px-5 py-4 sticky left-0 z-20 bg-[var(--color-bg-secondary)] group-hover:bg-[var(--color-bg-tertiary)] border-r border-[var(--color-border-subtle)] transition-colors shadow-[1px_0_0_var(--color-border-subtle)]">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-sm ${isUnassigned ? 'text-[var(--color-warning)] italic font-normal' : 'text-[var(--color-text-primary)]'}`}>
                            {name}
                          </span>
                          {!isUnassigned && <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded-md border border-[var(--color-border-subtle)]">{tech.code}</span>}
                        </div>
                      </td>
                      <td className="px-2 py-4 border-r border-[var(--color-border-subtle)] text-center font-bold text-[var(--color-text-primary)] text-sm whitespace-nowrap">
                        {tech.totalPoints > 0 ? tech.totalPoints : '-'}
                      </td>
                      {tech.monthsPoints.map((val, i) => {
                        const details = tech.monthDetails[i]
                        const detailParts: string[] = []
                        if (details.Ponctuel > 0) detailParts.push(`${details.Ponctuel} Ponctuel${details.Ponctuel > 1 ? 's' : ''}`)
                        if (details.Composite > 0) detailParts.push(`${details.Composite} Composite${details.Composite > 1 ? 's' : ''}`)
                        if (details.Automatique > 0) detailParts.push(`${details.Automatique} Bilan 24h`)
                        const tooltipText = detailParts.length > 0
                          ? `${name} - ${MOIS_LONG[i]} : ${formatPoints(val)} — ${detailParts.join(', ')}`
                          : undefined

                        const style = getHeatmapStyle(val)

                        return (
                          <td key={i} className="px-2 py-2.5 border-r border-[var(--color-border-subtle)] last:border-0 relative group">
                            {val > 0 ? (
                              <div
                                className="w-full h-8 flex items-center justify-center font-semibold rounded-lg transition-all text-xs whitespace-nowrap select-none shadow-sm"
                                style={{
                                  backgroundColor: style.bg,
                                  color: style.text,
                                  border: style.border
                                }}
                                title={tooltipText}
                              >
                                {val}
                              </div>
                            ) : (
                              <div className="w-full h-8 flex items-center justify-center text-[var(--color-text-tertiary)] text-xs font-normal">
                                -
                              </div>
                            )}
                          </td>
                        )
                      })}
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

