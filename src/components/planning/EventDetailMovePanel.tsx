import { COLORS } from '@/lib/constants'
import type { ModalAction } from './eventDetailModalReducer'

interface Props {
  moveDate: string
  moveReason: string
  saving: boolean
  dispatch: React.Dispatch<ModalAction>
  onConfirm: () => void
}

export default function EventDetailMovePanel({ moveDate, moveReason, saving, dispatch, onConfirm }: Props) {
  return (
    <div className="px-5 py-3.5 flex flex-col gap-2.5"
      style={{ background: COLORS.BG_TERTIARY, borderBottom: '1px solid var(--color-border-subtle)' }}>
      <div>
        <label htmlFor="pedm-move-date" className="block text-xs font-medium mb-1.5" style={{ color: COLORS.TEXT_SECONDARY }}>
          Nouvelle date
        </label>
        <input id="pedm-move-date" type="date" value={moveDate}
          onChange={e => dispatch({ type: 'SET_MOVE_DATE', value: e.target.value })}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border)', color: COLORS.TEXT_PRIMARY }} />
      </div>
      <div>
        <label htmlFor="pedm-move-reason" className="block text-xs font-medium mb-1.5" style={{ color: COLORS.TEXT_SECONDARY }}>
          Motif du report <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>(optionnel)</span>
        </label>
        <textarea id="pedm-move-reason" value={moveReason} rows={2}
          onChange={e => dispatch({ type: 'SET_MOVE_REASON', value: e.target.value })}
          placeholder="Ex : météo défavorable, client indisponible…"
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border)', color: COLORS.TEXT_PRIMARY }} />
      </div>
      <button type="button" onClick={onConfirm} disabled={!moveDate || saving}
        className="px-4 py-2 rounded-lg text-sm font-medium self-end"
        style={{ background: COLORS.ACCENT, color: 'white', opacity: (!moveDate || saving) ? 0.5 : 1 }}>
        {saving ? '…' : 'Déplacer'}
      </button>
    </div>
  )
}
