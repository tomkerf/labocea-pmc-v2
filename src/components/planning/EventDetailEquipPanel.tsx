import { AlertTriangle } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { calcStatut } from '@/hooks/useMetrologieRows'
import type { Equipement } from '@/types'
import type { ModalAction } from './eventDetailModalReducer'

interface Props {
  equipements: Equipement[]
  equipementsAssignes: string[]
  assignedEqIdsForDate: string[]
  saving: boolean
  dispatch: React.Dispatch<ModalAction>
  onConfirm: () => void
}

export default function EventDetailEquipPanel({ equipements, equipementsAssignes, assignedEqIdsForDate, saving, dispatch, onConfirm }: Props) {
  const eligible = equipements.filter(e => e.etat !== 'hors_service' && ['preleveur', 'debitmetre', 'flacon'].includes(e.categorie))

  return (
    <div className="px-5 py-3.5 flex flex-col gap-3"
      style={{ background: COLORS.BG_TERTIARY, borderBottom: '1px solid var(--color-border-subtle)' }}>
      <div>
        <div className="block text-xs font-medium mb-2" style={{ color: COLORS.TEXT_SECONDARY }}>
          Matériel utilisé pour la tournée
        </div>
        <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-2">
          {eligible.length === 0 ? (
            <p className="text-sm italic" style={{ color: 'var(--color-text-tertiary)' }}>Aucun équipement disponible.</p>
          ) : eligible.map(eq => {
            const isChecked = equipementsAssignes.includes(eq.id)
            const isTaken = !isChecked && assignedEqIdsForDate.includes(eq.id)
            const eqStatut = calcStatut(eq.prochainEtalonnage)
            const metrologieEnRetard = eqStatut.key === 'late'
            const enMaintenance = eq.etat === 'en_maintenance'
            const prete = eq.etat === 'prete'
            const hasWarning = metrologieEnRetard || enMaintenance || prete
            const isDisabled = isTaken || hasWarning

            return (
              <div key={eq.id} className="flex items-start gap-2 p-2 rounded-lg"
                style={{ background: COLORS.BG_SECONDARY, border: `1px solid ${hasWarning ? 'rgba(255,59,48,0.3)' : 'var(--color-border-subtle)'}`, opacity: isDisabled && !isChecked ? 0.6 : 1 }}>
                <input type="checkbox" id={`pedm-eq-${eq.id}`} aria-label={eq.nom}
                  checked={isChecked} disabled={isDisabled && !isChecked}
                  onChange={() => dispatch({ type: 'TOGGLE_EQUIPEMENT', id: eq.id })}
                  className="mt-1" />
                <label htmlFor={`pedm-eq-${eq.id}`} className="flex-1 flex flex-col cursor-pointer text-sm" style={{ color: COLORS.TEXT_PRIMARY }}>
                  <span className="font-medium">{eq.nom}</span>
                  <span className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>{eq.marque} - {eq.numSerie}</span>
                  {hasWarning && (
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-medium" style={{ color: COLORS.DANGER }}>
                      <AlertTriangle size={12} />
                      {metrologieEnRetard ? 'Métrologie expirée' : enMaintenance ? 'En maintenance' : 'Prêté'}
                    </div>
                  )}
                  {isTaken && !hasWarning && (
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-medium" style={{ color: COLORS.TEXT_SECONDARY }}>
                      <AlertTriangle size={12} />
                      Déjà assigné ce jour
                    </div>
                  )}
                </label>
              </div>
            )
          })}
        </div>
      </div>
      <button type="button" onClick={onConfirm} disabled={saving}
        className="px-4 py-2 rounded-lg text-sm font-medium self-end"
        style={{ background: COLORS.ACCENT, color: 'white', opacity: saving ? 0.5 : 1 }}>
        {saving ? '…' : 'Enregistrer le matériel'}
      </button>
    </div>
  )
}
