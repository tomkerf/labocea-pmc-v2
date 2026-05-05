import { Calendar, Bell } from 'lucide-react'

export default function CellContextMenu({ x, y, onClose, onPlanifier, onEvenement, holidayName }: {
  x: number; y: number
  onClose: () => void
  onPlanifier: () => void
  onEvenement: () => void
  holidayName?: string
}) {
  const safeX = Math.min(x, window.innerWidth  - 220)
  const safeY = Math.min(y, window.innerHeight - 130)

  return (
    <div className="fixed inset-0 z-[55]" onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose() }}>
      <div className="absolute rounded-xl overflow-hidden"
        style={{
          left: safeX, top: safeY,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid var(--color-border-subtle)',
          minWidth: 210,
        }}
        onClick={e => e.stopPropagation()}>
        {holidayName && (
          <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium"
            style={{ background: 'rgba(255,59,48,0.06)', color: '#FF3B30', borderBottom: '1px solid var(--color-border-subtle)' }}>
            ⛔ {holidayName}
          </div>
        )}
        <button
          onClick={() => { if (!holidayName) { onPlanifier(); onClose() } }}
          disabled={!!holidayName}
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-medium"
          style={{ color: holidayName ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)', cursor: holidayName ? 'not-allowed' : 'pointer' }}
          onMouseEnter={e => { if (!holidayName) e.currentTarget.style.background = 'var(--color-bg-tertiary)' }}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Calendar size={15} style={{ color: holidayName ? 'var(--color-text-tertiary)' : 'var(--color-accent)' }} />
          Planifier un prélèvement
        </button>
        <div style={{ height: 1, background: 'var(--color-border-subtle)' }} />
        <button
          onClick={() => { onEvenement(); onClose() }}
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-medium"
          style={{ color: 'var(--color-text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Bell size={15} style={{ color: 'var(--color-accent)' }} />
          Nouvel événement
        </button>
      </div>
    </div>
  )
}
