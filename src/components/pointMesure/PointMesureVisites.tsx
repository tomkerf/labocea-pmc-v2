import { AlertTriangle } from 'lucide-react'
import { COLORS } from '@/lib/constants'

const FAISABILITE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  ok:         { label: 'Faisable (OK)',   bg: 'var(--color-success-light)', color: COLORS.SUCCESS },
  difficile:  { label: 'Difficile',       bg: 'var(--color-warning-light)', color: COLORS.WARNING },
  impossible: { label: 'Impossible',      bg: 'var(--color-danger-light)',  color: COLORS.DANGER },
}

interface PointMesureVisitesProps {
  pointVisits: Array<{
    visitId: string;
    date: string;
    technicienNom: string;
    faisabilite: string;
    notes?: string;
    securite?: string;
  }>;
}

export function PointMesureVisites({ pointVisits }: PointMesureVisitesProps) {
  if (pointVisits.length === 0) return null

  return (
    <div className="mx-4 mb-6">
      <h2 className="text-xs font-semibold uppercase mb-2 px-1"
        style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
        Visites Préliminaires ({pointVisits.length})
      </h2>
      <div className="flex flex-col gap-3">
        {pointVisits.map((pv) => {
          const cfgF = FAISABILITE_CONFIG[pv.faisabilite] || FAISABILITE_CONFIG.ok
          const visitDateStr = new Date(pv.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
          return (
            <div key={pv.visitId} className="rounded-2xl px-4 py-3.5"
              style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: COLORS.TEXT_PRIMARY }}>
                  Visite du {visitDateStr}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: cfgF.bg, color: cfgF.color }}>
                  {cfgF.label}
                </span>
              </div>
              
              {pv.notes && (
                <p className="text-xs mb-2 whitespace-pre-wrap" style={{ color: COLORS.TEXT_SECONDARY }}>
                  {pv.notes}
                </p>
              )}
              {pv.securite && (
                <div className="flex items-start gap-1.5 p-2 rounded-lg bg-red-50 text-[11px] text-red-700">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5 text-red-500" />
                  <span>{pv.securite}</span>
                </div>
              )}

              <div className="mt-2 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                Par {pv.technicienNom}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
