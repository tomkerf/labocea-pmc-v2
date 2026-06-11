import { COLORS } from '@/lib/constants'
import type { TechOption } from '@/lib/planningUtils'
import type { ModalAction } from './eventDetailModalReducer'

interface Props {
  techInitiales: string
  techOptions: TechOption[]
  saving: boolean
  dispatch: React.Dispatch<ModalAction>
  onConfirm: () => void
}

export default function EventDetailTechPanel({ techInitiales, techOptions, saving, dispatch, onConfirm }: Props) {
  return (
    <div className="px-5 py-3.5 flex items-end gap-3"
      style={{ background: COLORS.BG_TERTIARY, borderBottom: '1px solid var(--color-border-subtle)' }}>
      <div className="flex-1">
        <label htmlFor="pedm-tech" className="block text-xs font-medium mb-1.5" style={{ color: COLORS.TEXT_SECONDARY }}>
          Technicien assigné
        </label>
        <select id="pedm-tech" value={techInitiales}
          onChange={e => dispatch({ type: 'SET_TECH_INITIALES', value: e.target.value })}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{ background: COLORS.BG_SECONDARY, border: '1px solid var(--color-border)', color: COLORS.TEXT_PRIMARY }}>
          {techOptions.map(o => (
            <option key={o.code} value={o.code}>{o.label}</option>
          ))}
        </select>
      </div>
      <button type="button" onClick={onConfirm} disabled={saving || !techInitiales.trim()}
        className="px-4 py-2 rounded-lg text-sm font-medium"
        style={{ background: COLORS.ACCENT, color: 'white', opacity: (saving || !techInitiales.trim()) ? 0.5 : 1 }}>
        {saving ? '…' : 'Confirmer'}
      </button>
    </div>
  )
}
