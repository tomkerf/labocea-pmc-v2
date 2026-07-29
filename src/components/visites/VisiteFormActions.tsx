import { Trash2 } from 'lucide-react'
import { COLORS } from '@/lib/constants'

interface VisiteFormActionsProps {
  isNew: boolean
  saving: boolean
  canSave: boolean
  confirmDelete: boolean
  onSave: () => void
  onDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

export default function VisiteFormActions({ isNew, saving, canSave, confirmDelete, onSave, onDelete, onConfirmDelete, onCancelDelete }: VisiteFormActionsProps) {
  return (
    <div className="flex items-center justify-between">
      {!isNew && (
        confirmDelete ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={onDelete} className="text-sm px-3 py-1.5 rounded-lg font-medium"
              style={{ background: COLORS.DANGER, color: 'white' }}>
              Confirmer la suppression
            </button>
            <button type="button" onClick={onCancelDelete} className="text-sm px-2 py-1.5 rounded-lg"
              style={{ color: COLORS.TEXT_SECONDARY }}>
              Annuler
            </button>
          </div>
        ) : (
          <button type="button" onClick={onConfirmDelete} className="text-sm px-3 py-1.5 rounded-lg"
            style={{ color: COLORS.DANGER }}>
            <Trash2 size={14} className="inline mr-1" />
            Supprimer
          </button>
        )
      )}
      {isNew && <div />}
      <div className="flex flex-col items-end gap-1">
        <button type="button"
          onClick={onSave}
          disabled={saving || !canSave}
          className="px-5 py-2 rounded-lg text-sm font-medium"
          style={{ background: COLORS.ACCENT, color: 'white', opacity: (saving || !canSave) ? 0.6 : 1, cursor: (saving || !canSave) ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {!saving && !canSave && (
          <p className="text-xs" style={{ color: COLORS.DANGER }}>
            Renseigne le technicien et le nom de chaque point pour enregistrer.
          </p>
        )}
      </div>
    </div>
  )
}
