import { AlertTriangle } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import type { PlanningEvent } from '@/lib/planningUtils'
import type { ModalAction } from './eventDetailModalReducer'

interface Props {
  event: PlanningEvent
  cancelReason: string
  saving: boolean
  connectedInitiales: string
  dispatch: React.Dispatch<ModalAction>
  onConfirm: () => void
}

export default function EventDetailCancelPanel({ event, cancelReason, saving, connectedInitiales, dispatch, onConfirm }: Props) {
  return (
    <div className="px-5 py-3.5 flex flex-col gap-2.5"
      style={{ background: 'var(--color-danger-light)', borderBottom: '1px solid var(--color-border-subtle)' }}>
      <div>
        <label htmlFor="pedm-cancel-reason" className="block text-xs font-medium mb-1.5" style={{ color: COLORS.DANGER }}>
          Motif du retrait <span style={{ opacity: 0.8 }}>(optionnel)</span>
        </label>
        <textarea id="pedm-cancel-reason" value={cancelReason} rows={2}
          onChange={e => dispatch({ type: 'SET_CANCEL_REASON', value: e.target.value })}
          placeholder="Ex : reporté à une date ultérieure, annulé par le client…"
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid rgba(255,59,48,0.3)', color: COLORS.TEXT_PRIMARY }} />
      </div>
      {event.technicien && event.technicien !== '—' && event.technicien !== connectedInitiales && (
        <div className="flex items-start gap-2 mt-1">
          <AlertTriangle size={15} style={{ color: COLORS.DANGER, flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs font-medium" style={{ color: COLORS.DANGER }}>
            Cette intervention appartient à <strong>{event.technicien}</strong>.<br />Es-tu sûr de vouloir la retirer ?
          </p>
        </div>
      )}
      <button type="button" onClick={onConfirm} disabled={saving}
        className="px-4 py-2 rounded-lg text-sm font-medium self-end mt-1"
        style={{ background: COLORS.DANGER, color: 'white', opacity: saving ? 0.5 : 1 }}>
        {saving ? '…' : 'Confirmer le retrait'}
      </button>
    </div>
  )
}
