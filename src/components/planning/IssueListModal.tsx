import { useMemo, useState } from 'react'
import { X, ExternalLink, AlertCircle, AlertTriangle, CloudRain, Calendar, FileText } from 'lucide-react'
import { m, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { Client, Plan, Sampling } from '@/types'
import type { Preleveur } from '@/stores/preleveursStore'
import { isSamplingOverdue } from '@/lib/overdue'
import { MOIS_LONG } from '@/lib/planningUtils'
import { COLORS } from '@/lib/constants'
import { getStatusColor, getStatusLabel } from '@/lib/yearMatrixUtils'
import { buildIssueListHtml } from '@/lib/exportIssueListHtml'
import { PdfPreviewModal } from '@/components/plan/PdfPreviewModal'


interface IssueListModalProps {
  onClose: () => void
  type: 'overdue' | 'non_effectue' | 'month' | null
  month?: number
  rows: { client: Client; plan: Plan; samplingsByMonth?: (Sampling | null)[]; pairsByMonth?: (Sampling | null)[][] }[]
  year: number
  preleveurs?: Preleveur[]
}

export default function IssueListModal({ onClose, type, month, rows, year, preleveurs = [] }: IssueListModalProps) {
  const [pdfPreview, setPdfPreview] = useState<string | null>(null)
  const issues = useMemo(() => {
    if (!type) return []
    const list: { client: Client; plan: Plan; sampling: Sampling; planYear: number }[] = []

    rows.forEach(({ client, plan }) => {
      const planYear = parseInt(client.annee ?? String(year))
      plan.samplings.forEach(s => {
        if (!s) return
        if (type === 'overdue' && isSamplingOverdue(s, planYear, plan.methode === 'Automatique')) {
          list.push({ client, plan, sampling: s, planYear })
        } else if (type === 'non_effectue' && s.status === 'non_effectue') {
          list.push({ client, plan, sampling: s, planYear })
        } else if (type === 'month' && s.plannedMonth === month) {
          list.push({ client, plan, sampling: s, planYear })
        }
      })
    })

    // Sort by month (oldest first) — no-op quand type === 'month' (déjà un seul mois)
    list.sort((a, b) => a.sampling.plannedMonth - b.sampling.plannedMonth)
    return list
  }, [type, month, rows, year])

  if (!type) return null

  const title = type === 'overdue' ? 'Prélèvements en retard'
    : type === 'non_effectue' ? 'Prélèvements non effectués'
    : `Prélèvements — ${MOIS_LONG[month ?? 0]} ${year}`
  const icon = type === 'overdue'
    ? <AlertTriangle size={17} style={{ color: COLORS.DANGER }} />
    : type === 'non_effectue'
    ? <AlertCircle size={17} style={{ color: 'var(--color-neutral)' }} />
    : <Calendar size={17} style={{ color: COLORS.ACCENT }} />

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0"
        style={{
          background: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'var(--glass-scrim)',
          WebkitBackdropFilter: 'var(--glass-scrim)',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <m.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl p-0 flex flex-col overflow-hidden max-h-[85vh]"
          style={{ background: COLORS.BG_SECONDARY, boxShadow: 'var(--shadow-modal)' }}
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-subtle)] shrink-0 bg-[var(--color-bg-secondary)] z-10">
            <div className="flex items-center gap-2">
              {icon}
              <h2 className="text-base font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
                {title} <span className="text-sm font-normal text-[var(--color-text-secondary)]">({issues.length})</span>
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {type === 'month' && issues.length > 0 && (
                <button type="button"
                  onClick={() => setPdfPreview(buildIssueListHtml(issues, MOIS_LONG[month ?? 0], year, preleveurs, false))}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium hover:bg-[var(--color-bg-tertiary)] transition-colors"
                  style={{ color: COLORS.TEXT_SECONDARY }}
                  title="Aperçu et impression PDF">
                  <FileText size={14} />
                  Exporter
                </button>
              )}
              <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-[var(--color-bg-tertiary)] transition-colors"
                style={{ color: 'var(--color-text-tertiary)' }}>
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {issues.length === 0 ? (
              <p className="text-center text-sm py-8" style={{ color: COLORS.TEXT_SECONDARY }}>
                Aucun prélèvement dans cette catégorie.
              </p>
            ) : (
              issues.map((item) => (
                <div key={item.sampling.id} className="flex flex-col gap-2 p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors group">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <Link to={`/missions/${item.client.id}`} onClick={onClose} className="text-sm font-medium hover:underline text-[var(--color-text-primary)]">
                        {item.client.nom}
                      </Link>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        {item.plan.nom} • {item.plan.siteNom}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {type === 'month' ? (
                        <span className="text-xs font-medium px-2 py-1 rounded-md" style={{
                          background: COLORS.BG_TERTIARY,
                          color: getStatusColor(item.sampling, item.planYear, item.plan.methode === 'Automatique'),
                        }}>
                          {getStatusLabel(item.sampling, item.planYear, item.plan.methode === 'Automatique')}
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-1 rounded-md" style={{
                          background: type === 'overdue' ? 'var(--color-danger-light)' : COLORS.BG_TERTIARY,
                          color: type === 'overdue' ? COLORS.DANGER : COLORS.TEXT_SECONDARY
                        }}>
                          {MOIS_LONG[item.sampling.plannedMonth]} {item.planYear}
                        </span>
                      )}
                      {item.plan.meteo === 'pluie' && (
                        <span title="Temps de pluie requis"><CloudRain size={14} className="text-blue-400" /></span>
                      )}
                      {item.plan.meteo === 'sec' && (
                        <span title="Temps sec requis" className="text-sm leading-none">☀️</span>
                      )}
                      <Link to={`/missions/${item.client.id}/plan/${item.plan.id}`} onClick={onClose} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-colors" title="Voir le plan">
                        <ExternalLink size={16} />
                      </Link>
                    </div>
                  </div>
                  {item.sampling.status === 'non_effectue' && item.sampling.comment && (
                    <div className="text-xs italic text-[var(--color-text-secondary)] mt-1 border-l-2 border-[var(--color-border-subtle)] pl-2">
                      Motif : {item.sampling.comment}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </m.div>
      </m.div>

      {pdfPreview && (
        <PdfPreviewModal
          srcDoc={pdfPreview}
          onClose={() => setPdfPreview(null)}
          onPrint={() => {
            const html = buildIssueListHtml(issues, MOIS_LONG[month ?? 0], year, preleveurs, true)
            const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.target = '_blank'
            a.rel = 'noopener'
            a.click()
            setTimeout(() => URL.revokeObjectURL(url), 10_000)
          }}
        />
      )}
    </AnimatePresence>
  )
}
