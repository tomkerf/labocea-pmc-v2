import { isSamplingOverdue } from '@/lib/overdue'
import { MOIS_LONG } from '@/lib/planningUtils'
import type { Sampling } from '@/types'
import { getStatusLabel, type RowData } from '@/lib/yearMatrixUtils'

interface YearMatrixPlanRowProps {
  row: RowData
  planYear: number
  onOpenIssueModal: (type: 'overdue' | 'non_effectue') => void
  isFirstInSite?: boolean
  activeMonth?: number | null
}

// Calcule le style premium (pastel Apple-style) d'une pastille de prélèvement
function getSamplingBadgeStyle(s: Sampling | null, planYear: number, isAuto?: boolean) {
  if (!s) {
    return {
      bg: 'transparent',
      text: 'transparent',
      border: '1px solid transparent',
      icon: ''
    }
  }
  
  const isOverdue = isSamplingOverdue(s, planYear, isAuto)

  if (s.status === 'done') {
    return {
      bg: 'var(--color-success-light)',
      text: 'var(--color-success)',
      border: '1px solid rgba(52, 199, 89, 0.25)',
      icon: '✓'
    }
  }
  if (s.status === 'non_effectue') {
    return {
      bg: 'var(--color-bg-tertiary)',
      text: 'var(--color-text-secondary)',
      border: '1px solid var(--color-border)',
      icon: '✕'
    }
  }
  if (isOverdue) {
    return {
      bg: 'var(--color-danger-light)',
      text: 'var(--color-danger)',
      border: '1px solid rgba(255, 59, 48, 0.25)',
      icon: '!'
    }
  }
  // planned (planifié)
  return {
    bg: 'var(--color-warning-light)',
    text: 'var(--color-warning)',
    border: '1px solid rgba(255, 159, 10, 0.25)',
    icon: '' // pas d'icône pour rester propre
  }
}

export default function YearMatrixPlanRow({ row, planYear, onOpenIssueModal, isFirstInSite, activeMonth = null }: YearMatrixPlanRowProps) {
  return (
    <tr
      className={`border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-tertiary)] transition-colors group h-8${isFirstInSite ? ' border-t border-t-[var(--color-border)]' : ''}`}
    >
      <td className="px-4 py-1 text-sm sticky left-0 z-20 bg-[var(--color-bg-secondary)] group-hover:bg-[var(--color-bg-tertiary)] border-r border-[var(--color-border-subtle)] transition-colors shadow-[1px_0_0_var(--color-border-subtle)] pl-9">
        <div className="text-[10px] text-[var(--color-text-secondary)] flex items-center gap-1.5">
          <span className="font-medium">{row.plan.siteNom}</span>
          <span className="text-[var(--color-text-tertiary)]">•</span>
          <span className="text-[var(--color-text-tertiary)]">{row.plan.frequence}</span>
          {row.plan.frequence === 'Personnalisé' && (
            <span className="inline-flex items-center px-1 py-0.5 rounded-md text-[9px] font-semibold bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]">
              manuel
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-1 text-sm text-[var(--color-text-primary)] border-r border-[var(--color-border-subtle)]">
        <div className="font-medium text-[var(--color-text-primary)] text-xs">{row.plan.nom}</div>
      </td>
      {row.samplingsByMonth.map((s, mIdx) => {
        const isBimensuel = row.plan.frequence === 'Bimensuel'
        const pair = row.pairsByMonth[mIdx]
        const dotSize = 'size-4'
        const iconSize = 'text-[9px]'
        const isAuto = row.plan.methode === 'Automatique'
        const isDimmed = activeMonth !== null && mIdx !== activeMonth
        return (
          <td key={mIdx} className="px-1 py-1 text-center border-r border-[var(--color-border-subtle)] relative transition-opacity duration-200"
            style={{ opacity: isDimmed ? 0.2 : 1 }}>
            {isBimensuel ? (
              pair.length > 0 && (
                <div className="flex items-center justify-center gap-0.5 mx-auto" style={{ width: 34 }}>
                  {(() => {
                    const priority = (ps: Sampling) => isSamplingOverdue(ps, planYear, isAuto) ? 3 : ps.status === 'planned' ? 2 : ps.status === 'done' ? 1 : 0
                    const sorted = [...pair].filter(Boolean).sort((a, b) => priority(b!) - priority(a!))
                    return sorted.slice(0, 2).map((ps, pi) => {
                      if (!ps) return null
                      const style = getSamplingBadgeStyle(ps, planYear, isAuto)
                      const isClickable = isSamplingOverdue(ps, planYear, isAuto) || ps.status === 'non_effectue'
                      return (
                        <button
                          type="button"
                          key={ps.id}
                          onClick={() => {
                            if (isSamplingOverdue(ps, planYear, isAuto)) onOpenIssueModal('overdue');
                            else if (ps.status === 'non_effectue') onOpenIssueModal('non_effectue')
                          }}
                          className={`${dotSize} rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-sm border ${isClickable ? 'cursor-pointer active:scale-95' : 'cursor-help'}`}
                          style={{
                            backgroundColor: style.bg,
                            color: style.text,
                            borderColor: style.border.split(' ')[2] || style.border // Sécurise la couleur de bordure
                          }}
                          title={`${MOIS_LONG[mIdx]} #${pi + 1} - ${getStatusLabel(ps, planYear, isAuto)}${ps.doneDate ? ` le ${ps.doneDate}` : ''}${isClickable ? ' — cliquer pour voir la liste' : ''}`}
                          aria-label={`${MOIS_LONG[mIdx]} #${pi + 1} - ${getStatusLabel(ps, planYear, isAuto)}`}
                        >
                          <span className={`${iconSize} font-bold leading-none`}>
                            {style.icon}
                          </span>
                        </button>
                      )
                    })
                  })()}
                </div>
              )
            ) : (
              s && (
                (() => {
                  const style = getSamplingBadgeStyle(s, planYear, isAuto)
                  const isClickable = isSamplingOverdue(s, planYear, isAuto) || s.status === 'non_effectue'
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (isSamplingOverdue(s, planYear, isAuto)) onOpenIssueModal('overdue');
                        else if (s.status === 'non_effectue') onOpenIssueModal('non_effectue')
                      }}
                      className={`mx-auto ${dotSize} rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-sm border ${isClickable ? 'cursor-pointer active:scale-95' : 'cursor-help'}`}
                      style={{
                        backgroundColor: style.bg,
                        color: style.text,
                        borderColor: style.border.split(' ')[2] || style.border
                      }}
                      title={`${MOIS_LONG[mIdx]} - ${getStatusLabel(s, planYear, isAuto)}${s.doneDate ? ` le ${s.doneDate}` : ''}${isClickable ? ' — cliquer pour voir la liste' : ''}`}
                      aria-label={`${MOIS_LONG[mIdx]} - ${getStatusLabel(s, planYear, isAuto)}`}
                    >
                      <span className={`${iconSize} font-bold leading-none`}>
                        {style.icon}
                      </span>
                    </button>
                  )
                })()
              )
            )}
          </td>
        )
      })}
    </tr>
  )
}
