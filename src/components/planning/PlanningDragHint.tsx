import { type ViewMode } from '@/lib/planningUtils'
import { COLORS } from '@/lib/constants'

interface PlanningDragHintProps {
  showDragHint:    boolean
  setShowDragHint: (v: boolean) => void
  viewMode:        ViewMode
}

export default function PlanningDragHint({ showDragHint, setShowDragHint, viewMode }: PlanningDragHintProps) {
  if (!showDragHint || viewMode === 'jour' || viewMode === 'carte') return null
  return (
    <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2 shrink-0"
      style={{ background: 'var(--color-success-light)', borderBottom: '1px solid var(--color-border-subtle)' }}>
      <p className="text-xs" style={{ color: COLORS.SUCCESS }}>
        <span className="font-semibold">Astuce —</span> glisse sur plusieurs jours pour créer rapidement un événement (congé, rappel, réunion…)
      </p>
      <button type="button"
        onClick={() => { setShowDragHint(false); localStorage.setItem('planning_drag_hint_seen', '1') }}
        className="text-xs font-medium shrink-0 px-2 py-0.5 rounded"
        style={{ color: COLORS.SUCCESS, background: 'transparent' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,199,89,0.15)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        OK
      </button>
    </div>
  )
}
