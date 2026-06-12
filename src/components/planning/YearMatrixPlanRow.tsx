import { isSamplingOverdue } from '@/lib/overdue'
import { MOIS_LONG } from '@/lib/planningUtils'
import type { Sampling } from '@/types'
import { getStatusColor, getStatusLabel, getStatusIcon, type RowData } from '@/lib/yearMatrixUtils'

interface YearMatrixPlanRowProps {
  row: RowData
  planYear: number
  onOpenIssueModal: (type: 'overdue' | 'non_effectue') => void
  isFirstInSite?: boolean
}

export default function YearMatrixPlanRow({ row, planYear, onOpenIssueModal, isFirstInSite }: YearMatrixPlanRowProps) {
  return (
    <tr
      className={`border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-tertiary)] transition-colors group h-7${isFirstInSite ? ' border-t border-t-[var(--color-border)]' : ''}`}
    >
      <td className="px-4 py-0.5 text-sm sticky left-0 z-20 bg-[var(--color-bg-secondary)] group-hover:bg-[var(--color-bg-tertiary)] border-r border-[var(--color-border-subtle)] transition-colors shadow-[1px_0_0_var(--color-border-subtle)] pl-9">
        <div className="text-[10px] text-[var(--color-text-secondary)] flex items-center gap-1.5">
          <span>{row.plan.siteNom} • {row.plan.frequence}</span>
          {row.plan.frequence === 'Personnalisé' && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] border border-[var(--color-border)]">
              manuel
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-0.5 text-sm text-[var(--color-text-primary)] border-r border-[var(--color-border-subtle)]">
        <div className="font-medium text-[var(--color-text-primary)] text-xs">{row.plan.nom}</div>
      </td>
      {row.samplingsByMonth.map((s, mIdx) => {
        const isBimensuel = row.plan.frequence === 'Bimensuel'
        const pair = row.pairsByMonth[mIdx]
        const dotSize = 'size-3.5'
        const iconSize = 'text-[7px]'
        const isAuto = row.plan.methode === 'Automatique'
        return (
          <td key={mIdx} className="px-1 py-0.5 text-center border-r border-[var(--color-border-subtle)] relative">
            {isBimensuel ? (
              pair.length > 0 && (
                <div className="flex items-center justify-center" style={{ width: 24 }}>
                  {(() => {
                    const priority = (ps: Sampling) => isSamplingOverdue(ps, planYear, isAuto) ? 3 : ps.status === 'planned' ? 2 : ps.status === 'done' ? 1 : 0
                    const sorted = [...pair].filter(Boolean).sort((a, b) => priority(b!) - priority(a!))
                    return sorted.slice(0, 2).map((ps, pi) => ps && (
                      <button
                        type="button"
                        key={ps.id}
                        onClick={() => { if (isSamplingOverdue(ps, planYear, isAuto)) onOpenIssueModal('overdue'); else if (ps.status === 'non_effectue') onOpenIssueModal('non_effectue') }}
                        className={`${dotSize} rounded-full flex items-center justify-center transition-transform hover:scale-110 border-2 border-[var(--color-bg-secondary)] ${isSamplingOverdue(ps, planYear, isAuto) || ps.status === 'non_effectue' ? 'cursor-pointer ring-1 ring-offset-1 ring-white/50 hover:ring-2 hover:ring-white/70' : 'cursor-help'}`}
                        style={{ backgroundColor: getStatusColor(ps, planYear, isAuto), marginLeft: pi === 1 ? -5 : 0, zIndex: pi === 0 ? 2 : 1 }}
                        title={`${MOIS_LONG[mIdx]} #${pi + 1} - ${getStatusLabel(ps, planYear, isAuto)}${ps.doneDate ? ` le ${ps.doneDate}` : ''}${isSamplingOverdue(ps, planYear, isAuto) || ps.status === 'non_effectue' ? ' — cliquer pour voir la liste' : ''}`}
                        aria-label={`${MOIS_LONG[mIdx]} #${pi + 1} - ${getStatusLabel(ps, planYear, isAuto)}`}
                      >
                        <span className={`${iconSize} font-bold text-white leading-none`}>
                          {getStatusIcon(ps, planYear, isAuto)}
                        </span>
                      </button>
                    ))
                  })()}
                </div>
              )
            ) : (
              s && (
                <button
                  type="button"
                  onClick={() => { if (isSamplingOverdue(s, planYear, isAuto)) onOpenIssueModal('overdue'); else if (s.status === 'non_effectue') onOpenIssueModal('non_effectue') }}
                  className={`mx-auto ${dotSize} rounded-full flex items-center justify-center transition-transform hover:scale-110 ${isSamplingOverdue(s, planYear, isAuto) || s.status === 'non_effectue' ? 'cursor-pointer ring-1 ring-offset-1 ring-white/50 hover:ring-2 hover:ring-white/70' : 'cursor-help'}`}
                  style={{ backgroundColor: getStatusColor(s, planYear, isAuto) }}
                  title={`${MOIS_LONG[mIdx]} - ${getStatusLabel(s, planYear, isAuto)}${s.doneDate ? ` le ${s.doneDate}` : ''}${isSamplingOverdue(s, planYear, isAuto) || s.status === 'non_effectue' ? ' — cliquer pour voir la liste' : ''}`}
                  aria-label={`${MOIS_LONG[mIdx]} - ${getStatusLabel(s, planYear, isAuto)}`}
                >
                  <span className={`${iconSize} font-bold text-white leading-none`}>
                    {getStatusIcon(s, planYear, isAuto)}
                  </span>
                </button>
              )
            )}
          </td>
        )
      })}
    </tr>
  )
}
